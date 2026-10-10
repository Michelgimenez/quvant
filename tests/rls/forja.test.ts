import type { PGlite } from "@electric-sql/pglite"
import { randomUUID } from "node:crypto"
import { beforeAll, describe, expect, it } from "vitest"
import { como, crearBase, intentar, type Sesion } from "./base"
import { ORG, SUC, USR, id, sembrar } from "./fixtures"

/**
 * Forja respeta RLS y los permisos por rol y por sucursal: las lecturas, la vista
 * y los canales de tiempo real (org:{org}:suc:{sucursal}) no muestran nada de otra
 * organización ni de una sucursal sin permiso.
 */
let db: PGlite
const PROD_A = id("pra", 1)
const DUENA_A: Sesion = { sub: USR.duenoA, aal: "aal2" }
const DUENA_A_SIN_2FA: Sesion = { sub: USR.duenoA }
const MOSTRADOR_A1: Sesion = { sub: USR.mostradorA1 } // con permiso extra forja.ver, solo A1
const TECNICO_A: Sesion = { sub: USR.tecnicoA } // sin forja.ver
const DEPOSITO_A: Sesion = { sub: USR.depositoA }
const INACTIVO_A: Sesion = { sub: USR.inactivoA }
const DUENO_B: Sesion = { sub: USR.duenoB, aal: "aal2" }
const canal = (org: string, suc: string) => `org:${org}:suc:${suc}`

beforeAll(async () => {
  db = await crearBase()
  await sembrar(db)
  await db.exec(`
    update sucursales set lat = -34.6, lng = -58.4 where id in ('${SUC.A1}', '${SUC.A2}', '${SUC.B1}');
    update stock set minimo = 12, ubicacion = 'HE-A3';
    update miembros set permisos_extra = '{forja.ver}' where user_id = '${USR.mostradorA1}';
    insert into extensiones_org (org_id, extension, activa, activada_en) values ('${ORG.A}', 'forja', true, now()), ('${ORG.B}', 'forja', true, now());
    insert into transferencias (org_id, desde_id, hacia_id, items, estado, llegada_estimada, usuario_id)
      values ('${ORG.A}', '${SUC.A1}', '${SUC.A2}', '[{"productoId":"${PROD_A}","cantidad":2}]', 'en_transito', now() + interval '1 hour', '${USR.depositoA}');
  `)
  // Movimientos de stock en cada sucursal: los triggers emiten a los canales (Forja activa en A y B)
  for (const [org, suc, prod] of [
    [ORG.A, SUC.A1, PROD_A],
    [ORG.A, SUC.A2, PROD_A],
    [ORG.B, SUC.B1, id("prb", 1)],
  ]) {
    await db.query(`insert into movimientos_stock (org_id, sucursal_id, producto_id, tipo, cantidad) values ($1, $2, $3, 'ajuste', -1)`, [org, suc, prod])
  }
}, 60_000)

async function red(sesion: Sesion) {
  return como(db, sesion, async (tx) => (await tx.query<{ sucursal_id: string }>(`select sucursal_id from forja_red()`)).rows.map((r) => r.sucursal_id).sort())
}

/** Lo que vería la persona al suscribirse a un canal privado (autorización de Realtime por RLS). */
async function escuchar(sesion: Sesion, topic: string) {
  return como(db, sesion, async (tx) => {
    await tx.query(`select set_config('realtime.topic', $1, true)`, [topic])
    return Number((await tx.query<{ n: string }>(`select count(*) n from realtime.messages where topic = realtime.topic()`)).rows[0].n)
  })
}

describe("Forja · lecturas con RLS", () => {
  it("forja_red: cada persona ve solo las sucursales que puede ver en Forja", async () => {
    expect(await red(DUENA_A)).toEqual([SUC.A1, SUC.A2].sort())
    expect(await red(MOSTRADOR_A1)).toEqual([SUC.A1])
    expect(await red(TECNICO_A)).toEqual([])
    expect(await red(INACTIVO_A)).toEqual([])
    expect(await red(DUENA_A_SIN_2FA)).toEqual([])
    expect(await red(DUENO_B)).toEqual([SUC.B1])
  })

  it("forja_red trae calor, stock crítico y órdenes", async () => {
    const fila = await como(db, DUENA_A, async (tx) => (await tx.query<{ ventas_hoy: string; stock_critico: string; ordenes: Record<string, number> }>(`select * from forja_red() where sucursal_id = $1`, [SUC.A1])).rows[0])
    expect(Number(fila.ventas_hoy)).toBeGreaterThanOrEqual(1)
    expect(Number(fila.stock_critico)).toBe(1) // 9 unidades con mínimo 12
    expect(fila.ordenes).toHaveProperty("ingresado")
  })

  it("anon no puede llamar a las funciones de Forja", async () => {
    const r = await como(db, "anon", async (tx) => ({
      red: await intentar(tx, `select * from forja_red()`),
      suc: await intentar(tx, `select forja_sucursal($1)`, [SUC.A1]),
      pieza: await intentar(tx, `select * from forja_pieza($1)`, [PROD_A]),
      vista: await intentar(tx, `select * from forja_transferencias_en_transito`),
    }))
    for (const e of Object.values(r)) expect(e).toMatch(/permission denied/)
  })

  it("forja_sucursal: el interior de una sucursal sin permiso no se entrega", async () => {
    const ok = await como(db, DUENA_A, async (tx) => (await tx.query<{ r: { racks: { rack: string; criticos: number }[] } }>(`select forja_sucursal($1) r`, [SUC.A1])).rows[0].r)
    expect(ok.racks[0]).toMatchObject({ rack: "HE-A", criticos: 1 })
    const errores = await Promise.all([
      como(db, MOSTRADOR_A1, (tx) => intentar(tx, `select forja_sucursal($1)`, [SUC.A2])),
      como(db, TECNICO_A, (tx) => intentar(tx, `select forja_sucursal($1)`, [SUC.A1])),
      como(db, DUENO_B, (tx) => intentar(tx, `select forja_sucursal($1)`, [SUC.A1])),
    ])
    for (const e of errores) expect(e).toMatch(/permiso_denegado/)
  })

  it("forja_pieza: el recorrido de un producto solo por sucursales permitidas", async () => {
    const sucursales = async (s: Sesion) =>
      como(db, s, async (tx) => [...new Set((await tx.query<{ sucursal_id: string }>(`select sucursal_id from forja_pieza($1)`, [PROD_A])).rows.map((r) => r.sucursal_id))].sort())
    expect(await sucursales(DUENA_A)).toEqual([SUC.A1, SUC.A2].sort())
    expect(await sucursales(MOSTRADOR_A1)).toEqual([SUC.A1])
    expect(await sucursales(DUENO_B)).toEqual([])
  })

  it("la vista de transferencias en tránsito respeta RLS (security_invoker)", async () => {
    const ver = async (s: Sesion) => como(db, s, async (tx) => (await tx.query(`select id from forja_transferencias_en_transito`)).rows.length)
    expect(await ver(DUENA_A)).toBe(1)
    expect(await ver(DUENO_B)).toBe(0)
    expect(await ver(TECNICO_A)).toBe(1) // ve inventario de A1: la transferencia sale de A1
    const { rows } = await db.query<{ opciones: string[] | null }>(`select reloptions as opciones from pg_class where relname = 'forja_transferencias_en_transito'`)
    expect(rows[0].opciones).toContain("security_invoker=true")
  })
})

describe("Forja · tiempo real por sucursal", () => {
  it("los triggers emiten en el canal de cada sucursal, nunca en uno por organización", async () => {
    const { rows } = await db.query<{ topic: string }>(`select distinct topic from realtime.messages order by 1`)
    const topics = rows.map((r) => r.topic)
    expect(topics).toEqual(expect.arrayContaining([canal(ORG.A, SUC.A1), canal(ORG.A, SUC.A2), canal(ORG.B, SUC.B1)]))
    expect(topics.every((t) => /^org:[0-9a-f-]{36}:suc:[0-9a-f-]{36}$/.test(t))).toBe(true)
  })

  it("cada persona solo se puede suscribir a las sucursales que tiene permitidas", async () => {
    expect(await escuchar(DUENA_A, canal(ORG.A, SUC.A1))).toBeGreaterThan(0)
    expect(await escuchar(DUENA_A, canal(ORG.A, SUC.A2))).toBeGreaterThan(0)
    expect(await escuchar(DUENA_A, canal(ORG.B, SUC.B1))).toBe(0)
    expect(await escuchar(MOSTRADOR_A1, canal(ORG.A, SUC.A1))).toBeGreaterThan(0)
    expect(await escuchar(MOSTRADOR_A1, canal(ORG.A, SUC.A2))).toBe(0)
    expect(await escuchar(TECNICO_A, canal(ORG.A, SUC.A1))).toBe(0)
    expect(await escuchar(INACTIVO_A, canal(ORG.A, SUC.A1))).toBe(0)
    expect(await escuchar(DUENA_A_SIN_2FA, canal(ORG.A, SUC.A1))).toBe(0)
    expect(await escuchar(DUENO_B, canal(ORG.A, SUC.A1))).toBe(0)
    expect(await escuchar(DUENO_B, canal(ORG.B, SUC.B1))).toBeGreaterThan(0)
  })

  it("un canal por organización entera o mal formado no autoriza nada", async () => {
    await db.query(`insert into realtime.messages (topic, extension, payload, event) values ($1, 'broadcast', '{}', 'venta')`, [`org:${ORG.A}`])
    expect(await escuchar(DUENA_A, `org:${ORG.A}`)).toBe(0)
    expect(await escuchar(DUENA_A, `org:${ORG.A}:suc:${SUC.B1}`)).toBe(0) // sucursal de otra organización
    expect(await escuchar(DUENA_A, "cualquier-cosa")).toBe(0)
  })

  it("los clientes no pueden emitir en los canales", async () => {
    const e = await como(db, DUENA_A, (tx) => intentar(tx, `insert into realtime.messages (topic, extension, payload, event) values ($1, 'broadcast', '{}', 'venta')`, [canal(ORG.A, SUC.A1)]))
    expect(e).toMatch(/permission denied|row-level security/)
  })

  it("sin Forja activa la organización no emite eventos", async () => {
    const contar = async () => Number((await db.query<{ n: string }>(`select count(*) n from realtime.messages where topic = $1`, [canal(ORG.B, SUC.B1)])).rows[0].n)
    await db.exec(`update extensiones_org set activa = false where org_id = '${ORG.B}'`)
    const antes = await contar()
    await db.query(`insert into movimientos_stock (org_id, sucursal_id, producto_id, tipo, cantidad) values ($1, $2, $3, 'ajuste', -1)`, [ORG.B, SUC.B1, id("prb", 1)])
    expect(await contar()).toBe(antes)
    await db.exec(`update extensiones_org set activa = true where org_id = '${ORG.B}'`)
  })
})

describe("Forja · operaciones nuevas", () => {
  type Respuesta = { resultado: { ok: boolean; codigo?: string } }
  const op = (tipo: string, usuarioId: string, datos: unknown, sucursalId: string | null = SUC.A1) => ({
    id: randomUUID(), tipo, orgId: ORG.A, usuarioId, sucursalId, creadaEn: new Date().toISOString(), dispositivo: "test", sinConexion: false, datos,
  })
  const aplicar = async (s: Sesion, o: unknown) =>
    como(db, s, async (tx) => (await tx.query<{ r: Respuesta }>(`select public.aplicar_operacion($1::jsonb) as r`, [JSON.stringify(o)])).rows[0].r.resultado, undefined, true)
  const stock = async (suc: string) => Number((await db.query<{ c: string }>(`select cantidad c from stock where sucursal_id = $1 and producto_id = $2`, [suc, PROD_A])).rows[0].c)

  it("despachar deja la transferencia en tránsito; recibirla mueve el stock una sola vez", async () => {
    const t = randomUUID()
    const [a1, a2] = [await stock(SUC.A1), await stock(SUC.A2)]
    const despacho = await aplicar(DEPOSITO_A, op("transferencia.despachar", USR.depositoA, { transferenciaId: t, desdeId: SUC.A1, haciaId: SUC.A2, items: [{ productoId: PROD_A, cantidad: 3 }], motivo: "Reposición", llegadaEstimada: new Date(Date.now() + 3600_000).toISOString() }))
    expect(despacho.ok).toBe(true)
    expect(await stock(SUC.A1)).toBe(a1 - 3)
    expect(await stock(SUC.A2)).toBe(a2) // en tránsito: todavía no llegó
    const recibir = op("transferencia.recibir", USR.depositoA, { transferenciaId: t }, SUC.A2)
    expect((await aplicar(DEPOSITO_A, recibir)).ok).toBe(true)
    expect(await stock(SUC.A2)).toBe(a2 + 3)
    const otraVez = await aplicar(DEPOSITO_A, { ...recibir, id: randomUUID() })
    expect(otraVez).toMatchObject({ ok: false, codigo: "estado" })
    expect(await stock(SUC.A2)).toBe(a2 + 3)
  })

  it("el mostrador no despacha transferencias ni activa extensiones", async () => {
    const r1 = await aplicar(MOSTRADOR_A1, op("transferencia.despachar", USR.mostradorA1, { transferenciaId: randomUUID(), desdeId: SUC.A1, haciaId: SUC.A2, items: [{ productoId: PROD_A, cantidad: 1 }], motivo: "", llegadaEstimada: new Date(Date.now() + 3600_000).toISOString() }))
    expect(r1).toMatchObject({ ok: false, codigo: "permiso" })
    const r2 = await aplicar(MOSTRADOR_A1, op("extension.activar", USR.mostradorA1, { extension: "forja", activa: false }, null))
    expect(r2).toMatchObject({ ok: false, codigo: "permiso" })
    const r3 = await aplicar(DUENA_A, op("extension.activar", USR.duenoA, { extension: "forja", activa: true }, null))
    expect(r3.ok).toBe(true)
  })

  it("cada persona guarda sus preferencias y no ve las de otros", async () => {
    const r = await aplicar(MOSTRADOR_A1, op("usuario.preferencia", USR.mostradorA1, { clave: "forja.animacion_vista", valor: true }, null))
    expect(r.ok).toBe(true)
    const propias = await como(db, MOSTRADOR_A1, async (tx) => (await tx.query(`select clave from preferencias_usuario`)).rows.length)
    const ajenas = await como(db, DUENA_A, async (tx) => (await tx.query(`select clave from preferencias_usuario where user_id = $1`, [USR.mostradorA1])).rows.length)
    expect(propias).toBe(1)
    expect(ajenas).toBe(0)
    const mala = await aplicar(MOSTRADOR_A1, op("usuario.preferencia", USR.mostradorA1, { clave: "Clave Mala!", valor: 1 }, null))
    expect(mala).toMatchObject({ ok: false, codigo: "invalida" })
  })
})
