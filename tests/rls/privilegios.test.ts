import type { PGlite } from "@electric-sql/pglite"
import { beforeAll, describe, expect, it } from "vitest"
import { como, crearBase, intentar } from "./base"

/**
 * El shim replica los privilegios por defecto de Supabase (ALL a anon y
 * authenticated sobre cada tabla nueva de public). Estos tests verifican que
 * las migraciones dejan solo lo necesario, además de RLS.
 */
let db: PGlite
beforeAll(async () => {
  db = await crearBase()
}, 60_000)

async function privilegios(rol: string) {
  const { rows } = await db.query<{ tabla: string; privilegio: string }>(
    `select c.relname as tabla, p.privilegio
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
       cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) as p (privilegio)
      where c.relkind = 'r' and has_table_privilege($1, c.oid, p.privilegio)
      order by 1, 2`,
    [rol],
  )
  return rows.map((r) => `${r.privilegio} ${r.tabla}`)
}

describe("privilegios de los roles de la API", () => {
  it("anon no tiene ningún privilegio de tabla (la solicitud de demo es por columnas)", async () => {
    expect(await privilegios("anon")).toEqual([])
  })

  it("authenticated solo lee; nunca inserta, actualiza ni borra directo", async () => {
    const lista = await privilegios("authenticated")
    expect(lista.filter((p) => !p.startsWith("SELECT "))).toEqual([])
    expect(lista).toContain("SELECT ventas")
    expect(lista).toContain("SELECT auditoria")
    expect(lista).not.toContain("SELECT intentos_ingreso")
    expect(lista).not.toContain("SELECT solicitudes_demo")
  })

  it("las tablas que se creen en el futuro no reciben privilegios automáticos", async () => {
    await db.exec("create table public.tabla_futura (id int)")
    try {
      expect(await privilegios("anon")).toEqual([])
      expect((await privilegios("authenticated")).filter((p) => p.endsWith("tabla_futura"))).toEqual([])
    } finally {
      await db.exec("drop table public.tabla_futura")
    }
  })
})

describe("solicitudes de demo: seguimiento", () => {
  const insertar = `insert into solicitudes_demo (nombre, negocio, rubro, sucursales, whatsapp) values ('Ana', 'Ferretería X', 'Ferretería', 2, '+54 11 5555-5555')`

  it("desde el sitio no se puede fijar el estado, la fecha ni el id", async () => {
    const errores = await como(db, "anon", async (tx) => ({
      contactada: await intentar(tx, `insert into solicitudes_demo (nombre, negocio, rubro, sucursales, whatsapp, contactada_en) values ('Ana', 'X SA', 'Ferretería', 1, '+54 11 5555-5555', now())`),
      fecha: await intentar(tx, `insert into solicitudes_demo (nombre, negocio, rubro, sucursales, whatsapp, creada_en) values ('Ana', 'X SA', 'Ferretería', 1, '+54 11 5555-5555', now())`),
      id: await intentar(tx, `insert into solicitudes_demo (id, nombre, negocio, rubro, sucursales, whatsapp) values (gen_random_uuid(), 'Ana', 'X SA', 'Ferretería', 1, '+54 11 5555-5555')`),
      normal: await intentar(tx, insertar),
    }))
    expect(errores.contactada).toMatch(/permission denied/)
    expect(errores.fecha).toMatch(/permission denied/)
    expect(errores.id).toMatch(/permission denied/)
    expect(errores.normal).toBeNull()
  })

  it("un usuario de la app no lee ni marca solicitudes; service_role sí", async () => {
    await como(db, "anon", (tx) => tx.exec(insertar), undefined, true)
    const usuario = await como(db, { sub: "00000000-0000-0000-0000-000000000001" }, async (tx) => ({
      leer: await intentar(tx, `select * from solicitudes_demo`),
      marcar: await intentar(tx, `update solicitudes_demo set contactada_en = now()`),
    }))
    expect(usuario.leer).toMatch(/permission denied/)
    expect(usuario.marcar).toMatch(/permission denied/)

    const servicio = await como(db, "service_role", async (tx) => {
      const { rows } = await tx.query<{ id: string; contactada_en: string | null }>(`select id, contactada_en from solicitudes_demo order by creada_en desc limit 1`)
      await tx.query(`update solicitudes_demo set contactada_en = now() where id = $1`, [rows[0].id])
      const { rows: despues } = await tx.query<{ contactada_en: string | null }>(`select contactada_en from solicitudes_demo where id = $1`, [rows[0].id])
      return { antes: rows[0].contactada_en, despues: despues[0].contactada_en }
    })
    expect(servicio.antes).toBeNull()
    expect(servicio.despues).not.toBeNull()
  })
})
