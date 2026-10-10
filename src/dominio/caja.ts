import type { EstadoEmpresa } from "./estado"
import type { Centavos, Id, SesionCaja } from "./tipos"

/**
 * Efectivo esperado en una caja: monto inicial + cobros en efectivo de las
 * ventas del puesto durante la sesión + ingresos − retiros − gastos.
 */
export function efectivoEsperado(e: EstadoEmpresa, sesion: SesionCaja, hasta: string): Centavos {
  let total = sesion.montoInicial
  for (const v of Object.values(e.ventas)) {
    if (v.sucursalId !== sesion.sucursalId || v.puesto !== sesion.puesto || v.estado !== "confirmada") continue
    if (v.fecha < sesion.apertura || v.fecha > hasta) continue
    for (const p of v.pagos) if (p.medio === "efectivo") total += p.importe
  }
  for (const m of e.movimientosCaja) {
    if (m.sesionId !== sesion.id) continue
    total += m.tipo === "ingreso" ? m.importe : -m.importe
  }
  return total
}

/** Totales por medio de pago de una sesión (para el resumen de cierre). */
export function resumenSesion(e: EstadoEmpresa, sesion: SesionCaja, hasta: string) {
  const porMedio: Record<string, Centavos> = {}
  let ventas = 0
  for (const v of Object.values(e.ventas)) {
    if (v.sucursalId !== sesion.sucursalId || v.puesto !== sesion.puesto || v.estado !== "confirmada") continue
    if (v.fecha < sesion.apertura || v.fecha > hasta) continue
    ventas++
    for (const p of v.pagos) porMedio[p.medio] = (porMedio[p.medio] ?? 0) + p.importe
  }
  return { ventas, porMedio }
}

export function cajaAbierta(e: EstadoEmpresa, sucursalId: Id, puesto: number) {
  return Object.values(e.cajas).find((c) => c.sucursalId === sucursalId && c.puesto === puesto && c.estado === "abierta") ?? null
}
