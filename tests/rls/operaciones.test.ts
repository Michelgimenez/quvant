import type { PGlite } from "@electric-sql/pglite"
import { randomUUID } from "node:crypto"
import { beforeAll, describe, expect, it } from "vitest"
import { PERMISO_OPERACION } from "@/sync/tipos"
import { como, crearBase, intentar, type Sesion } from "./base"
import { ORG, SUC, USR, id, sembrar } from "./fixtures"

/**
 * public.aplicar_operacion: el servidor de producción de la sincronización.
 * Mismas reglas que el reductor TypeScript (tests/unit/sync.test.ts).
 */
let db: PGlite
beforeAll(async () => {
  db = await crearBase()
  await sembrar(db)
})

const PROD_A = id("pra", 1)
const LISTA_A = id("la", 1)
const PRE_A1 = id("qa", 1)
const CAJA_A1 = id("ka", 1)
const DUENA: Sesion = { sub: USR.duenoA, aal: "aal2" }
const MOSTRADOR: Sesion = { sub: USR.mostradorA1 }

type Resultado = { ok: boolean; codigo?: string; error?: string; avisos?: string[]; asignado?: Record<string, number> }
type Respuesta = { id: string; seq: number | null; resultado: Resultado }

function op(tipo: string, usuarioId: string, datos: unknown, extra: Record<string, unknown> = {}) {
  return { id: randomUUID(), tipo, orgId: ORG.A, usuarioId, sucursalId: SUC.A1, creadaEn: new Date().toISOString(), dispositivo: "test", sinConexion: false, datos, ...extra }
}

function venta(extra: Record<string, unknown> = {}, cantidad = 2, precio = 180000) {
  return {
    id: randomUUID(),
    sucursalId: SUC.A1,
    puesto: 1,
    numeroLocal: "A11-L0001",
    fecha: new Date().toISOString(),
    clienteId: null,
    listaId: LISTA_A,
    items: [{ productoId: PROD_A, descripcion: "Taladro a", cantidad, precioUnitario: precio, descuentoPct: 0, costoUnitario: 0 }],
    pagos: [{ medio: "efectivo", importe: cantidad * precio }],
    entrega: null,
    ...extra,
  }
}

async function aplicar(sesion: Sesion, o: unknown): Promise<Respuesta> {
  return como(db, sesion, async (tx) => (await tx.query<{ r: Respuesta }>(`select public.aplicar_operacion($1::jsonb) as r`, [JSON.stringify(o)])).rows[0].r, undefined, true)
}

async function stockA1() {
  const r = await db.query<{ cantidad: string }>(`select cantidad from stock where sucursal_id = $1 and producto_id = $2`, [SUC.A1, PROD_A])
  return Number(r.rows[0].cantidad)
}

describe("aplicar_operacion · ventas", () => {
  it("el mostrador vende en su sucursal: número definitivo, stock, movimiento y auditoría", async () => {
    const antes = await stockA1()
    const o = op("venta.crear", USR.mostradorA1, { venta: venta() })
    const r = await aplicar(MOSTRADOR, o)
    expect(r.resultado.ok).toBe(true)
    expect(r.seq).toBeGreaterThan(0)
    expect(r.resultado.asignado?.numero).toBe(101)
    expect(await stockA1()).toBe(antes - 2)
    const aud = await db.query(`select tabla from auditoria where op_id = $1`, [o.id])
    expect(aud.rows.map((x) => (x as { tabla: string }).tabla)).toContain("ventas")
  })

  it("reenviar la misma operación devuelve el mismo resultado y no duplica nada", async () => {
    const o = op("venta.crear", USR.mostradorA1, { venta: venta() })
    const a = await aplicar(MOSTRADOR, o)
    const stock = await stockA1()
    const b = await aplicar(MOSTRADOR, o)
    expect(b.seq).toBe(a.seq)
    expect(b.resultado).toEqual(a.resultado)
    expect(await stockA1()).toBe(stock)
  })

  it("rechaza vender en una sucursal ajena y lo deja registrado", async () => {
    const o = op("venta.crear", USR.mostradorA1, { venta: venta({ sucursalId: SUC.A2 }) }, { sucursalId: SUC.A2 })
    const r = await aplicar(MOSTRADOR, o)
    expect(r.resultado).toMatchObject({ ok: false, codigo: "sucursal" })
    const rech = await db.query(`select tipo from operaciones_rechazadas where id = $1`, [o.id])
    expect(rech.rows).toHaveLength(1)
  })

  it("rechaza operaciones de otra organización o firmadas por otro usuario", async () => {
    const deB = await aplicar({ sub: USR.duenoB, aal: "aal2" }, op("venta.crear", USR.duenoB, { venta: venta() }))
    expect(deB.resultado).toMatchObject({ ok: false, codigo: "permiso" })
    const suplantada = await aplicar(MOSTRADOR, op("venta.crear", USR.duenoA, { venta: venta() }))
    expect(suplantada.resultado).toMatchObject({ ok: false, codigo: "permiso" })
  })

  it("rechaza si los pagos no cuadran, sin escribir nada", async () => {
    const v = venta()
    v.pagos = [{ medio: "efectivo", importe: 1 }]
    const antes = await stockA1()
    const r = await aplicar(MOSTRADOR, op("venta.crear", USR.mostradorA1, { venta: v }))
    expect(r.resultado).toMatchObject({ ok: false, codigo: "invalida" })
    expect(await stockA1()).toBe(antes)
    const n = await db.query(`select count(*)::int as n from ventas where id = $1`, [v.id])
    expect((n.rows[0] as { n: number }).n).toBe(0)
  })

  it("el técnico no vende; la dueña sin doble factor tampoco, con doble factor sí", async () => {
    const tecnico = await aplicar({ sub: USR.tecnicoA }, op("venta.crear", USR.tecnicoA, { venta: venta() }))
    expect(tecnico.resultado).toMatchObject({ ok: false, codigo: "permiso" })
    const sin2fa = await aplicar({ sub: USR.duenoA, aal: "aal1" }, op("venta.crear", USR.duenoA, { venta: venta() }))
    expect(sin2fa.resultado).toMatchObject({ ok: false, codigo: "permiso" })
    const con2fa = await aplicar(DUENA, op("venta.crear", USR.duenoA, { venta: venta() }))
    expect(con2fa.resultado.ok).toBe(true)
  })

  it("acepta la venta aunque deje stock negativo o tenga precio distinto, con advertencias", async () => {
    const stock = await stockA1()
    const r = await aplicar(MOSTRADOR, op("venta.crear", USR.mostradorA1, { venta: venta({}, stock + 3, 150000) }))
    expect(r.resultado.ok).toBe(true)
    const codigos = (r.resultado.avisos ?? []).map((a) => a.split(":")[0])
    expect(codigos).toEqual(expect.arrayContaining(["stock_negativo", "precio_distinto"]))
    expect(await stockA1()).toBe(-3)
  })
})

describe("aplicar_operacion · conflictos", () => {
  it("dos conversiones del mismo presupuesto: gana la primera", async () => {
    const datos = () => ({ presupuestoId: PRE_A1, venta: venta({ clienteId: null }, 1) })
    const primera = await aplicar(MOSTRADOR, op("presupuesto.convertir", USR.mostradorA1, datos()))
    expect(primera.resultado.ok).toBe(true)
    const segunda = await aplicar(DUENA, op("presupuesto.convertir", USR.duenoA, datos()))
    expect(segunda.resultado).toMatchObject({ ok: false, codigo: "ya_convertido" })
    expect(segunda.resultado.error).toMatch(/ya se convirtió en la venta #\d+/)
  })

  it("cerrar una caja ya cerrada se rechaza", async () => {
    const a = await aplicar(DUENA, op("caja.cerrar", USR.duenoA, { sesionId: CAJA_A1, montoContado: 50000 }))
    expect(a.resultado.ok).toBe(true)
    expect(typeof a.resultado.asignado?.esperado).toBe("number")
    const b = await aplicar(MOSTRADOR, op("caja.cerrar", USR.mostradorA1, { sesionId: CAJA_A1, montoContado: 50000 }))
    expect(b.resultado).toMatchObject({ ok: false, codigo: "estado" })
  })

  it("una operación todavía no soportada en SQL da error temporal (no se rechaza ni se pierde)", async () => {
    const err = await como(db, { sub: USR.tecnicoA }, (tx) =>
      intentar(tx, `select public.aplicar_operacion($1::jsonb)`, [JSON.stringify(op("servicio.estado", USR.tecnicoA, {}))]),
    )
    expect(err).toContain("operacion_no_soportada")
  })
})

describe("log de operaciones", () => {
  it("cada usuario ve solo las operaciones de su alcance", async () => {
    const ver = (s: Sesion) => como(db, s, async (tx) => (await tx.query<{ org_id: string; sucursal_id: string | null }>(`select org_id, sucursal_id from operaciones`)).rows)
    const mostrador = await ver(MOSTRADOR)
    expect(mostrador.length).toBeGreaterThan(0)
    expect(mostrador.every((r) => r.sucursal_id === SUC.A1 || r.sucursal_id === null)).toBe(true)
    const duenoB = await ver({ sub: USR.duenoB, aal: "aal2" })
    expect(duenoB.every((r) => r.org_id === ORG.B)).toBe(true)
  })

  it("las funciones internas no se pueden llamar directo", async () => {
    const err = await como(db, DUENA, (tx) => intentar(tx, `select app.crear_venta($1, $2, false, '{}'::jsonb, null)`, [ORG.A, USR.duenoA]))
    expect(err).toContain("permission denied")
  })

  it("el permiso por tipo de operación coincide con src/sync/tipos.ts", async () => {
    for (const [tipo, permiso] of Object.entries(PERMISO_OPERACION)) {
      const r = await db.query<{ p: string }>(`select app.permiso_operacion($1) as p`, [tipo])
      expect(r.rows[0].p, tipo).toBe(permiso)
    }
  })
})
