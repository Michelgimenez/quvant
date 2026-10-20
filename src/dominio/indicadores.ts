import { claveDia, diaART, sumarDias, type DiaART } from "@/datos/demo/tiempo"
import { claveStock, saldoCliente, type EstadoEmpresa } from "./estado"
import type { Centavos, Id, Venta } from "./tipos"
import { subtotalItem } from "./ventas"

/**
 * Indicadores del tablero y los reportes. Funciones puras sobre el estado.
 * Fechas agrupadas por día en hora argentina.
 */

export function ventasConfirmadas(e: EstadoEmpresa, filtro?: { negocioId?: Id; sucursalId?: Id }) {
  return Object.values(e.ventas).filter(
    (v) => v.estado === "confirmada" && (!filtro?.negocioId || v.negocioId === filtro.negocioId) && (!filtro?.sucursalId || v.sucursalId === filtro.sucursalId),
  )
}

export function diaDe(fechaISO: string) {
  return claveDia(diaART(new Date(fechaISO)))
}

/** Suma de ventas por día (clave AAAA-MM-DD) y por agrupador. */
export function ventasPorDia(ventas: Venta[], agrupar: (v: Venta) => string) {
  const r: Record<string, Record<string, Centavos>> = {}
  for (const v of ventas) {
    const d = diaDe(v.fecha)
    const g = agrupar(v)
    r[d] ??= {}
    r[d][g] = (r[d][g] ?? 0) + v.total
  }
  return r
}

export function rangoDias(hasta: DiaART, cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => sumarDias(hasta, i - cantidad + 1))
}

export type Periodo = { total: Centavos; cantidad: number; costo: Centavos }

export function resumir(ventas: Venta[], desde: string, hasta: string): Periodo {
  let total = 0
  let cantidad = 0
  let costo = 0
  for (const v of ventas) {
    const d = diaDe(v.fecha)
    if (d < desde || d > hasta) continue
    total += v.total
    cantidad++
    for (const it of v.items) costo += Math.round(it.costoUnitario * it.cantidad)
  }
  return { total, cantidad, costo }
}

/** Margen bruto sobre ventas (precio con IVA → sin IVA aproximado al 21 %). */
export function margenBruto(p: Periodo) {
  if (!p.total) return null
  const neto = p.total / 1.21
  return ((neto - p.costo) / neto) * 100
}

export function variacion(actual: number, anterior: number) {
  if (!anterior) return null
  return ((actual - anterior) / anterior) * 100
}

export function topProductos(e: EstadoEmpresa, ventas: Venta[], desde: string, cantidad = 8) {
  const acum: Record<Id, { total: Centavos; unidades: number }> = {}
  for (const v of ventas) {
    if (diaDe(v.fecha) < desde) continue
    for (const it of v.items) {
      const a = (acum[it.productoId] ??= { total: 0, unidades: 0 })
      a.total += subtotalItem(it)
      a.unidades += it.cantidad
    }
  }
  return Object.entries(acum)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, cantidad)
    .map(([id, a]) => ({ producto: e.productos[id], ...a }))
    .filter((x) => x.producto)
}

export type Alerta = {
  id: string
  tono: "error" | "alerta" | "acero" | "ok"
  titulo: string
  detalle: string
  href: string
  cantidad: number
}

/** "Para atender hoy": lo que el negocio tiene que mirar. */
export function alertas(e: EstadoEmpresa, ahora: Date, sucursales: Id[] | null): Alerta[] {
  const enAlcance = (s: Id) => sucursales === null || sucursales.includes(s)
  const hoy = claveDia(diaART(ahora))
  const en3 = claveDia(sumarDias(diaART(ahora), 3))
  const r: Alerta[] = []

  let sinStock = 0
  let bajo = 0
  for (const st of Object.values(e.stock)) {
    if (!enAlcance(st.sucursalId) || !e.productos[st.productoId]?.activo) continue
    if (st.cantidad <= 0) sinStock++
    else if (st.cantidad <= st.minimo) bajo++
  }
  if (sinStock) r.push({ id: "sin-stock", tono: "error", titulo: "Sin stock", detalle: "Productos agotados en alguna sucursal", href: "/app/inventario?stock=sin", cantidad: sinStock })
  if (bajo) r.push({ id: "bajo-minimo", tono: "alerta", titulo: "Bajo el mínimo", detalle: "Reponer pronto", href: "/app/inventario?stock=bajo", cantidad: bajo })

  const porVencer = Object.values(e.presupuestos).filter((p) => enAlcance(p.sucursalId) && (p.estado === "enviado" || p.estado === "aceptado") && diaDe(p.vencimiento) <= en3)
  if (porVencer.length) r.push({ id: "presupuestos", tono: "alerta", titulo: "Presupuestos por vencer", detalle: "En los próximos 3 días", href: "/app/presupuestos?estado=abiertos", cantidad: porVencer.length })

  const listos = Object.values(e.servicio).filter((o) => enAlcance(o.sucursalId) && o.estado === "listo")
  if (listos.length) r.push({ id: "listos", tono: "ok", titulo: "Equipos listos para retirar", detalle: "Servicio técnico", href: "/app/servicio?estado=listo", cantidad: listos.length })

  const esperando = Object.values(e.servicio).filter((o) => enAlcance(o.sucursalId) && o.estado === "esperando_aprobacion")
  if (esperando.length) r.push({ id: "aprobacion", tono: "acero", titulo: "Esperando aprobación", detalle: "Presupuestos de reparación enviados", href: "/app/servicio?estado=esperando_aprobacion", cantidad: esperando.length })

  const entregasHoy = Object.values(e.entregas).filter((x) => enAlcance(x.sucursalId) && (x.estado === "pendiente" || x.estado === "en_camino") && diaDe(x.fechaProgramada) <= hoy)
  if (entregasHoy.length) r.push({ id: "entregas", tono: "acero", titulo: "Entregas para hoy", detalle: "Hoja de ruta", href: "/app/entregas", cantidad: entregasHoy.length })

  const excedidos = Object.values(e.clientes).filter((c) => c.limiteCredito > 0 && saldoCliente(e, c.id) > c.limiteCredito)
  if (excedidos.length) r.push({ id: "limite", tono: "error", titulo: "Clientes sobre su límite", detalle: "Cuenta corriente", href: "/app/clientes?filtro=excedidos", cantidad: excedidos.length })

  const conAdvertencias = Object.values(e.ventas).filter((v) => enAlcance(v.sucursalId) && v.advertencias.length > 0 && v.estado === "confirmada")
  if (conAdvertencias.length) r.push({ id: "advertencias", tono: "alerta", titulo: "Ventas para revisar", detalle: "Stock negativo o precio distinto de lista", href: "/app/reportes?vista=advertencias", cantidad: conAdvertencias.length })

  return r
}

export function stockValorizado(e: EstadoEmpresa, sucursalId?: Id) {
  let total = 0
  for (const st of Object.values(e.stock)) {
    if (sucursalId && st.sucursalId !== sucursalId) continue
    const p = e.productos[st.productoId]
    if (p && st.cantidad > 0) total += Math.round(st.cantidad * p.costo)
  }
  return total
}

export function estadoStock(e: EstadoEmpresa, sucursalId: Id, productoId: Id): "sin" | "bajo" | "ok" | "no_lleva" {
  const st = e.stock[claveStock(sucursalId, productoId)]
  if (!st) return "no_lleva"
  if (st.cantidad <= 0) return "sin"
  if (st.cantidad <= st.minimo) return "bajo"
  return "ok"
}
