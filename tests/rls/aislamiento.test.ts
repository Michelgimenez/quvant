import type { PGlite } from "@electric-sql/pglite"
import { beforeAll, describe, expect, it } from "vitest"
import { PERMISOS_POR_ROL } from "@/dominio/permisos"
import { como, crearBase, intentar, tablasConOrg, tablasPublicas } from "./base"
import { ORG, SUC, USR, sembrar } from "./fixtures"

let db: PGlite

beforeAll(async () => {
  db = await crearBase()
  await sembrar(db)
})

/** Tablas sin org_id a propósito (globales o sin acceso desde clientes). */
const SIN_ORG = ["organizaciones", "permisos_rol", "intentos_ingreso", "solicitudes_demo"]

/** Lee las org_id visibles de una tabla (o null si no hay privilegio de lectura). */
async function orgsVisibles(tabla: string, sesion: Parameters<typeof como>[1]) {
  return como(db, sesion, async (tx) => {
    const col = tabla === "organizaciones" ? "id" : "org_id"
    const err = await intentar(tx, `select ${col} as org from public.${tabla}`)
    if (err) return { error: err, orgs: [] as string[] }
    const r = await tx.query<{ org: string }>(`select ${col} as org from public.${tabla}`)
    return { error: null, orgs: r.rows.map((x) => x.org) }
  })
}

describe("estructura multiempresa", () => {
  it("todas las tablas de public tienen RLS activado y forzado", async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity, c.relforcerowsecurity
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    )
    const sinRls = r.rows.filter((t) => !t.relrowsecurity || !t.relforcerowsecurity).map((t) => t.relname)
    expect(sinRls).toEqual([])
  })

  it("toda tabla de negocio tiene org_id", async () => {
    const todas = await tablasPublicas(db)
    const conOrg = await tablasConOrg(db)
    const faltan = todas.filter((t) => !conOrg.includes(t) && !SIN_ORG.includes(t))
    expect(faltan).toEqual([])
  })

  it("la matriz de permisos de la base coincide con src/dominio/permisos.ts", async () => {
    const r = await db.query<{ rol: string; permiso: string }>(`select rol, permiso from permisos_rol order by 1, 2`)
    const enBase = r.rows.map((x) => `${x.rol}:${x.permiso}`).sort()
    const enCodigo = Object.entries(PERMISOS_POR_ROL)
      .flatMap(([rol, ps]) => ps.map((p) => `${rol}:${p}`))
      .sort()
    expect(enBase).toEqual(enCodigo)
  })
})

describe("aislamiento entre organizaciones", () => {
  it("la dueña de A no ve ninguna fila de B en ninguna tabla", async () => {
    const tablas = [...(await tablasConOrg(db)), "organizaciones"]
    const fugas: string[] = []
    let visiblesPropias = 0
    for (const t of tablas) {
      const { orgs } = await orgsVisibles(t, { sub: USR.duenoA, aal: "aal2" })
      if (orgs.some((o) => o !== ORG.A)) fugas.push(t)
      if (orgs.length > 0) visiblesPropias++
    }
    expect(fugas).toEqual([])
    // El test no es vacío: la dueña ve datos propios en la mayoría de las tablas.
    expect(visiblesPropias).toBeGreaterThan(20)
  })

  it("el dueño de B no ve ninguna fila de A en ninguna tabla", async () => {
    const tablas = [...(await tablasConOrg(db)), "organizaciones"]
    const fugas: string[] = []
    for (const t of tablas) {
      const { orgs } = await orgsVisibles(t, { sub: USR.duenoB, aal: "aal2" })
      if (orgs.some((o) => o !== ORG.B)) fugas.push(t)
    }
    expect(fugas).toEqual([])
  })

  it("control negativo: el detector encuentra una fuga plantada a propósito", async () => {
    const orgs = await como(
      db,
      { sub: USR.duenoA, aal: "aal2" },
      async (tx) => (await tx.query<{ org_id: string }>(`select org_id from clientes`)).rows.map((r) => r.org_id),
      `create policy fuga on public.clientes for select to authenticated using (true)`,
    )
    expect(orgs).toContain(ORG.B)
  })

  it("filtrar explícitamente por la org ajena devuelve cero filas", async () => {
    const n = await como(db, { sub: USR.duenoA, aal: "aal2" }, async (tx) => {
      const r = await tx.query<{ n: number }>(`select count(id)::int as n from ventas where org_id = $1`, [ORG.B])
      return r.rows[0].n
    })
    expect(n).toBe(0)
  })

  it("los clientes no pueden escribir directo en ninguna tabla (ni de su propia org)", async () => {
    const tablas = await tablasPublicas(db)
    const permitidas: string[] = []
    await como(db, { sub: USR.duenoA, aal: "aal2" }, async (tx) => {
      for (const t of tablas) {
        const upd = await intentar(tx, `update public.${t} set ${t === "organizaciones" ? "id = id" : "org_id = org_id"} where false`)
        const del = await intentar(tx, `delete from public.${t} where false`)
        if (!upd?.includes("permission denied") && SIN_ORG.indexOf(t) === -1) permitidas.push(`update ${t}`)
        if (!del?.includes("permission denied")) permitidas.push(`delete ${t}`)
      }
      const ins = await intentar(
        tx,
        `insert into ventas (org_id, negocio_id, sucursal_id, numero_local, fecha, lista_id, total, vendedor_id)
         select org_id, negocio_id, sucursal_id, 'X', now(), lista_id, 1, vendedor_id from ventas limit 1`,
      )
      if (!ins?.includes("permission denied")) permitidas.push("insert ventas")
    })
    expect(permitidas).toEqual([])
  })
})

describe("alcance por sucursal y por rol", () => {
  it("mostrador de A1 ve las ventas de A1 y no las de A2", async () => {
    const sucursales = await como(db, { sub: USR.mostradorA1 }, async (tx) => {
      const r = await tx.query<{ sucursal_id: string }>(`select distinct sucursal_id from ventas`)
      return r.rows.map((x) => x.sucursal_id)
    })
    expect(sucursales).toEqual([SUC.A1])
  })

  it("el técnico no ve ventas pero sí órdenes de servicio", async () => {
    const r = await como(db, { sub: USR.tecnicoA }, async (tx) => {
      const v = await tx.query(`select id from ventas`)
      const s = await tx.query(`select id from ordenes_servicio`)
      return { ventas: v.rows.length, servicio: s.rows.length }
    })
    expect(r.ventas).toBe(0)
    expect(r.servicio).toBe(2)
  })

  it("un miembro inactivo no ve nada", async () => {
    const { orgs } = await orgsVisibles("productos", { sub: USR.inactivoA })
    expect(orgs).toEqual([])
  })

  it("un usuario sin membresía no ve nada", async () => {
    const { orgs } = await orgsVisibles("ventas", { sub: "99999999-0000-4000-8000-000000000000" })
    expect(orgs).toEqual([])
  })
})

describe("columnas protegidas (costos)", () => {
  it("nadie lee productos.costo ni venta_items.costo_unitario directamente", async () => {
    const errores = await como(db, { sub: USR.duenoA, aal: "aal2" }, async (tx) => [
      await intentar(tx, `select costo from productos`),
      await intentar(tx, `select costo_unitario from venta_items`),
    ])
    expect(errores.every((e) => e?.includes("permission denied"))).toBe(true)
  })

  it("app.costos_productos() exige costos.ver y la org propia", async () => {
    const dueno = await como(db, { sub: USR.duenoA, aal: "aal2" }, async (tx) => {
      const r = await tx.query(`select * from app.costos_productos($1)`, [ORG.A])
      return r.rows.length
    })
    expect(dueno).toBe(1)

    const ajena = await como(db, { sub: USR.duenoA, aal: "aal2" }, (tx) =>
      intentar(tx, `select * from app.costos_productos($1)`, [ORG.B]),
    )
    expect(ajena).toContain("permiso_denegado")

    const mostrador = await como(db, { sub: USR.mostradorA1 }, (tx) =>
      intentar(tx, `select * from app.costos_productos($1)`, [ORG.A]),
    )
    expect(mostrador).toContain("permiso_denegado")
  })
})

describe("doble factor obligatorio para dueños y administración", () => {
  it("la dueña sin aal2 no ve datos; con aal2 sí", async () => {
    const sin = await orgsVisibles("ventas", { sub: USR.duenoA, aal: "aal1" })
    const con = await orgsVisibles("ventas", { sub: USR.duenoA, aal: "aal2" })
    expect(sin.orgs).toEqual([])
    expect(con.orgs.length).toBe(2)
  })

  it("los roles operativos no necesitan aal2", async () => {
    const { orgs } = await orgsVisibles("ventas", { sub: USR.mostradorA1, aal: "aal1" })
    expect(orgs.length).toBe(1)
  })
})

describe("acceso anónimo", () => {
  it("anon no lee ninguna tabla", async () => {
    const tablas = await tablasPublicas(db)
    const legibles: string[] = []
    await como(db, "anon", async (tx) => {
      for (const t of tablas) {
        const err = await intentar(tx, `select 1 from public.${t} limit 1`)
        if (!err?.includes("permission denied")) legibles.push(t)
      }
    })
    expect(legibles).toEqual([])
  })

  it("anon puede dejar una solicitud de demo pero no leerlas", async () => {
    const r = await como(db, "anon", async (tx) => ({
      insertar: await intentar(
        tx,
        `insert into solicitudes_demo (nombre, negocio, rubro, sucursales, whatsapp) values ('Ana', 'Ferretería X', 'Ferretería', 2, '+54 11 5555-5555')`,
      ),
      leer: await intentar(tx, `select * from solicitudes_demo`),
    }))
    expect(r.insertar).toBeNull()
    expect(r.leer).toContain("permission denied")
  })

  it("las solicitudes con datos inválidos se rechazan", async () => {
    const err = await como(db, "anon", (tx) =>
      intentar(tx, `insert into solicitudes_demo (nombre, negocio, rubro, sucursales, whatsapp) values ('A', 'X', 'Y', 0, 'abc')`),
    )
    expect(err).not.toBeNull()
  })
})

describe("auditoría", () => {
  it("cada cambio queda registrado con las columnas modificadas", async () => {
    await db.query(`update productos set nombre = 'Taladro percutor A' where org_id = $1`, [ORG.A])
    const r = await db.query<{ accion: string; antes: Record<string, unknown>; despues: Record<string, unknown> }>(
      `select accion, antes, despues from auditoria where tabla = 'productos' and accion = 'UPDATE' order by id desc limit 1`,
    )
    expect(r.rows[0].accion).toBe("UPDATE")
    expect(r.rows[0].despues).toEqual({ nombre: "Taladro percutor A" })
    expect(r.rows[0].antes).toEqual({ nombre: "Taladro a" })
  })

  it("el registro es inmutable, incluso para el dueño de la tabla", async () => {
    const errores = await como(db, "service_role", async () => null).then(async () => {
      const msgs: (string | null)[] = []
      for (const sql of [`update auditoria set tabla = 'x'`, `delete from auditoria`, `truncate auditoria`]) {
        try {
          await db.exec(sql)
          msgs.push(null)
        } catch (e) {
          msgs.push((e as Error).message)
        }
      }
      return msgs
    })
    expect(errores.every((e) => e?.includes("tabla_solo_agregar"))).toBe(true)
  })

  it("los libros de stock y de cuenta corriente son de solo-agregar", async () => {
    const errores: (string | null)[] = []
    for (const sql of [`update movimientos_stock set cantidad = 0`, `delete from movimientos_cuenta`]) {
      try {
        await db.exec(sql)
        errores.push(null)
      } catch (e) {
        errores.push((e as Error).message)
      }
    }
    expect(errores.every((e) => e?.includes("tabla_solo_agregar"))).toBe(true)
  })

  it("la dueña ve la auditoría de su org; el mostrador no", async () => {
    const dueno = await orgsVisibles("auditoria", { sub: USR.duenoA, aal: "aal2" })
    const mostrador = await orgsVisibles("auditoria", { sub: USR.mostradorA1 })
    expect(dueno.orgs.length).toBeGreaterThan(0)
    expect(dueno.orgs.every((o) => o === ORG.A)).toBe(true)
    expect(mostrador.orgs).toEqual([])
  })
})

describe("límite de intentos de ingreso", () => {
  it("5 fallos por email bloquean; solo service_role puede consultar", async () => {
    const estado = await como(db, "service_role", async (tx) => {
      for (let i = 0; i < 5; i++) await tx.query(`select app.registrar_ingreso('hash-x', '10.0.0.1', false)`)
      const r = await tx.query<{ e: { permitido: boolean; espera_segundos: number } }>(
        `select app.ingreso_permitido('hash-x', '10.0.0.1') as e`,
      )
      return r.rows[0].e
    })
    expect(estado.permitido).toBe(false)
    expect(estado.espera_segundos).toBeGreaterThan(0)

    const anon = await como(db, "anon", (tx) => intentar(tx, `select app.ingreso_permitido('hash-x', '10.0.0.1')`))
    expect(anon).toContain("permission denied")
  })

  it("un ingreso exitoso reinicia el contador del email", async () => {
    const estado = await como(db, "service_role", async (tx) => {
      for (let i = 0; i < 4; i++) await tx.query(`select app.registrar_ingreso('hash-y', '10.0.0.2', false)`)
      await tx.query(`select app.registrar_ingreso('hash-y', '10.0.0.2', true)`)
      await tx.query(`select app.registrar_ingreso('hash-y', '10.0.0.2', false)`)
      const r = await tx.query<{ e: { permitido: boolean; restantes: number } }>(`select app.ingreso_permitido('hash-y', '10.0.0.2') as e`)
      return r.rows[0].e
    })
    expect(estado).toEqual({ permitido: true, restantes: 4 })
  })
})

describe("funciones de permiso", () => {
  it("puede_sucursal distingue sucursales y organizaciones", async () => {
    const r = await como(db, { sub: USR.mostradorA1 }, async (tx) => {
      const q = async (org: string, suc: string) =>
        (await tx.query<{ p: boolean }>(`select app.puede_sucursal($1, $2, 'mostrador.vender') as p`, [org, suc])).rows[0].p
      return { propia: await q(ORG.A, SUC.A1), otraSucursal: await q(ORG.A, SUC.A2), otraOrg: await q(ORG.B, SUC.B1), cruzada: await q(ORG.B, SUC.A1) }
    })
    expect(r).toEqual({ propia: true, otraSucursal: false, otraOrg: false, cruzada: false })
  })

  it("tiene_permiso respeta organización y rol", async () => {
    const r = await como(db, { sub: USR.tecnicoA }, async (tx) => {
      const q = async (org: string, p: string) => (await tx.query<{ p: boolean }>(`select app.tiene_permiso($1, $2) as p`, [org, p])).rows[0].p
      return { servicio: await q(ORG.A, "servicio.editar"), vender: await q(ORG.A, "mostrador.vender"), otraOrg: await q(ORG.B, "servicio.editar") }
    })
    expect(r).toEqual({ servicio: true, vender: false, otraOrg: false })
  })
})
