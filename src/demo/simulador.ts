/**
 * El simulador del día de la demo (se muestra con la etiqueta SIMULACIÓN). Los eventos son una FUNCIÓN DEL
 * TIEMPO Y DE LA SEMILLA: el tiempo desde la ancla se parte en ranuras de `cada` milisegundos y cada ranura
 * decide con un hash si hay evento, de qué tipo y de cuánto. Pedir los eventos entre dos momentos siempre
 * devuelve lo mismo: en vivo, al volver a una empresa o al filmar cuadro por cuadro.
 *
 * El ritmo está acelerado a propósito para que la demo se vea viva (una venta del kiosco cada pocos segundos):
 * por eso la etiqueta SIMULACIÓN.
 */
import type { Centavos } from "@/dominio/tipos"
import type { DatosNegocio, MedioPago } from "@/dominio/negocio"
import { hash, redondearPrecio, u01 } from "./azar"
import { EMPRESAS, type IdEmpresa } from "./empresas"
import { ANCLA_MS } from "./generar"

export type TipoEvento = "venta" | "pedido" | "cobranza" | "entrega" | "aprobacion" | "presupuesto" | "servicio"

export type EventoDemo = {
  id: string
  t: number
  tipo: TipoEvento
  sucursal: number
  monto: Centavos
  detalle: string
  /** Quién (preventista, sucursal, cliente): ya resuelto a texto. */
  quien: string
  medio?: MedioPago
  items?: number
}

type Ritmo = { cada: number; tipos: readonly (readonly [TipoEvento, number])[] }

export const RITMOS: Record<IdEmpresa, Ritmo> = {
  kiosco: { cada: 7000, tipos: [["venta", 1]] },
  ferreteria: { cada: 18000, tipos: [["venta", 0.82], ["presupuesto", 0.12], ["servicio", 0.06]] },
  distribuidora: { cada: 14000, tipos: [["pedido", 0.72], ["cobranza", 0.18], ["entrega", 0.1]] },
  grupo: { cada: 1100, tipos: [["venta", 0.985], ["aprobacion", 0.015]] },
}

const MEDIOS: readonly MedioPago[] = ["efectivo", "efectivo", "tarjeta", "transferencia", "qr"]

function elegirPonderado<T>(x: number, lista: readonly (readonly [T, number])[]) {
  let acum = 0
  for (const [v, p] of lista) {
    acum += p
    if (x < acum) return v
  }
  return lista[lista.length - 1][0]
}

/** Elige una sucursal según su tamaño (las grandes venden más). */
function sucursalPonderada(datos: DatosNegocio, x: number) {
  const vendedoras = datos.sucursales.map((s, i) => [i, s.tipo === "deposito" ? 0 : s.tamano] as const)
  const total = vendedoras.reduce((a, [, p]) => a + p, 0) || 1
  return elegirPonderado(x, vendedoras.map(([i, p]) => [i, p / total] as const))
}

function evento(id: IdEmpresa, datos: DatosNegocio, k: number): EventoDemo | null {
  const ritmo = RITMOS[id]
  const s = EMPRESAS[id].semilla
  if (u01(s, "hay", k) > 0.86) return null
  const t = ANCLA_MS + k * ritmo.cada + Math.floor(u01(s, "t", k) * ritmo.cada)
  const tipo = elegirPonderado(u01(s, "tipo", k), ritmo.tipos)
  const base = { id: `${id}-${k}`, t, tipo }
  const productos = datos.productos
  const prod = (n: number) => productos[hash(s, "prod", k, n) % productos.length]
  if (id === "kiosco") {
    const items = 1 + (hash(s, "items", k) % 3)
    const lista = Array.from({ length: items }, (_, n) => prod(n))
    return { ...base, sucursal: 0, monto: lista.reduce((a, p) => a + p.precio, 0), detalle: lista.map((p) => p.nombre).join(" · "), quien: "Mostrador", medio: MEDIOS[hash(s, "medio", k) % MEDIOS.length], items }
  }
  if (id === "ferreteria") {
    const sucursal = sucursalPonderada(datos, u01(s, "suc", k))
    const p = prod(0)
    const cantidad = 1 + (hash(s, "cant", k) % 4)
    const nombre = datos.sucursales[sucursal]?.nombre ?? ""
    if (tipo === "presupuesto") return { ...base, sucursal, monto: p.precio * cantidad * 6, detalle: `Presupuesto · ${p.nombre}`, quien: nombre }
    if (tipo === "servicio") return { ...base, sucursal, monto: 0, detalle: "Ingresó un equipo a servicio técnico", quien: nombre }
    return { ...base, sucursal, monto: p.precio * cantidad, detalle: p.nombre, quien: nombre, medio: MEDIOS[hash(s, "medio", k) % MEDIOS.length], items: cantidad }
  }
  if (id === "distribuidora") {
    const extras = datos.extras.tipo === "distribuidora" ? datos.extras : null
    const pv = hash(s, "pv", k) % 12
    const preventista = extras?.preventistas[pv]
    const clientesZona = datos.clientes.filter((c) => c.zona === preventista?.zona)
    const cliente = clientesZona[hash(s, "cli", k) % Math.max(1, clientesZona.length)] ?? datos.clientes[0]
    if (tipo === "cobranza") return { ...base, sucursal: 0, monto: Math.round(redondearPrecio(80000 + u01(s, "cob", k) * 520000) * 100), detalle: `Cobranza · ${cliente?.nombre ?? ""}`, quien: preventista?.nombre ?? "" }
    if (tipo === "entrega") return { ...base, sucursal: 0, monto: 0, detalle: `Entregado · ${cliente?.nombre ?? ""}`, quien: `Camión ${1 + (hash(s, "cam", k) % 4)}` }
    return { ...base, sucursal: 0, monto: Math.round(redondearPrecio(410000 * (0.4 + u01(s, "ped", k) * 1.4)) * 100), detalle: `Pedido · ${cliente?.nombre ?? ""}`, quien: preventista?.nombre ?? "", items: 6 + (hash(s, "it", k) % 30) }
  }
  // grupo
  const sucursal = sucursalPonderada(datos, u01(s, "suc", k))
  const nombre = datos.sucursales[sucursal]?.nombre ?? ""
  if (tipo === "aprobacion") return { ...base, sucursal, monto: Math.round(redondearPrecio(1800000 + u01(s, "ap", k) * 9000000) * 100), detalle: "Orden de compra para aprobar", quien: nombre }
  const ticket = Math.round(redondearPrecio(46000 * (0.25 + u01(s, "tk", k) * 2.2)) * 100)
  return { ...base, sucursal, monto: ticket, detalle: prod(0).nombre, quien: nombre, medio: MEDIOS[hash(s, "medio", k) % MEDIOS.length], items: 1 + (hash(s, "items", k) % 5) }
}

/** Los eventos simulados entre dos momentos (ms), en orden. Antes de la ancla no hay eventos: eso ya está en los datos. */
export function eventosEntre(id: IdEmpresa, datos: DatosNegocio, desde: number, hasta: number): EventoDemo[] {
  const { cada } = RITMOS[id]
  const k0 = Math.max(0, Math.floor((Math.max(desde, ANCLA_MS) - ANCLA_MS) / cada))
  const k1 = Math.floor((hasta - ANCLA_MS) / cada)
  const salida: EventoDemo[] = []
  for (let k = k0; k <= k1; k++) {
    const e = evento(id, datos, k)
    if (e && e.t >= desde && e.t < hasta) salida.push(e)
  }
  return salida
}

/** Lo que el simulador sumó desde la ancla hasta `hasta`: ventas, pedidos y cobranzas. */
export function acumuladoSimulado(id: IdEmpresa, datos: DatosNegocio, hasta: number) {
  const eventos = eventosEntre(id, datos, ANCLA_MS, hasta)
  const porSucursal = datos.sucursales.map(() => 0)
  const tickets = datos.sucursales.map(() => 0)
  let pedidos = 0
  let montoPedidos = 0
  let cobrado = 0
  let entregas = 0
  let aprobaciones = 0
  const porPreventista = Array.from({ length: 12 }, () => ({ pedidos: 0, monto: 0 }))
  for (const e of eventos) {
    if (e.tipo === "venta") {
      porSucursal[e.sucursal] += e.monto
      tickets[e.sucursal]++
    } else if (e.tipo === "pedido") {
      pedidos++
      montoPedidos += e.monto
      const extras = datos.extras.tipo === "distribuidora" ? datos.extras : null
      const pv = extras?.preventistas.findIndex((p) => p.nombre === e.quien) ?? -1
      if (pv >= 0) {
        porPreventista[pv].pedidos++
        porPreventista[pv].monto += e.monto
      }
    } else if (e.tipo === "cobranza") cobrado += e.monto
    else if (e.tipo === "entrega") entregas++
    else if (e.tipo === "aprobacion") aprobaciones++
  }
  return { eventos, porSucursal, tickets, pedidos, montoPedidos, cobrado, entregas, aprobaciones, porPreventista }
}
