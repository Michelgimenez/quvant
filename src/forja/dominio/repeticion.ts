import { inicioDiaART } from "@/datos/demo/tiempo"
import { formatoPesosCorto } from "@/dominio/dinero"
import type { Id } from "@/dominio/tipos"
import type { EventoForja, RedForja } from "./modelo"

/**
 * Repetición del día y titulares de la sala de control. Puro: sin React ni
 * reloj propio (el cursor lo maneja la interfaz).
 */
export const VELOCIDADES = [1, 60, 600, 1200] as const
export type Velocidad = (typeof VELOCIDADES)[number]

const HORA = 3_600_000
/** Apertura de referencia: 8:00 (hora de Argentina). */
const APERTURA = 8 * HORA

/** Tramo a reproducir: desde la apertura (o el primer evento, si fue antes) hasta ahora. */
export function tramoDelDia(eventos: EventoForja[], ahora: Date) {
  const apertura = inicioDiaART(ahora).getTime() + APERTURA
  const primero = eventos.length ? Date.parse(eventos[0].en) : apertura
  const inicio = Math.min(apertura, primero)
  return { inicio, fin: Math.max(inicio + 60_000, ahora.getTime()) }
}

/** Duración real (ms) de reproducir el tramo a una velocidad: 10 h a 1200× son 30 s. */
export const duracionReal = (tramo: { inicio: number; fin: number }, velocidad: number) => (tramo.fin - tramo.inicio) / velocidad

export function avanzar(cursor: number, dtMs: number, velocidad: number, fin: number) {
  return Math.min(fin, cursor + Math.max(0, dtMs) * velocidad)
}

/** Eventos hasta el cursor, inclusive (la lista viene ordenada por hora). */
export function hastaCursor(eventos: EventoForja[], cursor: number) {
  let lo = 0
  let hi = eventos.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (Date.parse(eventos[m].en) <= cursor) lo = m + 1
    else hi = m
  }
  return lo === eventos.length ? eventos : eventos.slice(0, lo)
}

/** Ventas por franja, normalizadas 0..1, para dibujar el pulso del día en la barra. */
export function densidadVentas(eventos: EventoForja[], tramo: { inicio: number; fin: number }, franjas = 96) {
  const cuentas = Array<number>(franjas).fill(0)
  const largo = tramo.fin - tramo.inicio
  for (const ev of eventos) {
    if (ev.tipo !== "venta") continue
    const i = Math.floor(((Date.parse(ev.en) - tramo.inicio) / largo) * franjas)
    if (i >= 0 && i < franjas) cuentas[i]++
  }
  const max = Math.max(1, ...cuentas)
  return cuentas.map((c) => c / max)
}

export type Titular = { id: string; en: string; sucursalId: Id; texto: string; tono: "info" | "alerta" | "logro" }

/**
 * Los eventos importantes del día como titulares (para la sala de control),
 * del más nuevo al más viejo: quiebres de stock, transferencias, equipos
 * listos o presupuestados, ventas sin conexión y las ventas más grandes.
 */
export function titulares(eventos: EventoForja[], red: RedForja): Titular[] {
  const nombre = (id: Id) => red.nodos.find((n) => n.id === id)?.nombre ?? "Otra sucursal"
  const importes = eventos.flatMap((e) => (e.tipo === "venta" ? [e.importe] : [])).sort((a, b) => a - b)
  // Venta grande: dentro del 5 % más alto del día (y al menos tres ventas para comparar)
  const umbral = importes.length >= 3 ? importes[Math.floor(importes.length * 0.95)] : Infinity
  const lista: Titular[] = []
  for (const ev of eventos) {
    const base = { id: ev.id, en: ev.en, sucursalId: ev.sucursalId }
    switch (ev.tipo) {
      case "stock_critico":
        lista.push({ ...base, tono: "alerta", texto: ev.queda <= 0 ? `${nombre(ev.sucursalId)} se quedó sin ${ev.nombre}` : `${ev.nombre}: quedan ${ev.queda} en ${nombre(ev.sucursalId)} (mínimo ${ev.minimo})` })
        break
      case "transferencia_salida":
        lista.push({ ...base, tono: "info", texto: `Sale una transferencia de ${nombre(ev.desdeId)} a ${nombre(ev.haciaId)} · ${ev.items} ${ev.items === 1 ? "producto" : "productos"}` })
        break
      case "transferencia_llegada":
        lista.push({ ...base, tono: "logro", texto: `Llegó a ${nombre(ev.haciaId)} la transferencia desde ${nombre(ev.desdeId)}` })
        break
      case "servicio":
        if (ev.estado === "listo") lista.push({ ...base, tono: "logro", texto: `Orden ${ev.numero} lista para retirar en ${nombre(ev.sucursalId)}` })
        else if (ev.estado === "esperando_aprobacion") lista.push({ ...base, tono: "info", texto: `Orden ${ev.numero}: presupuesto de reparación enviado al cliente` })
        break
      case "venta":
        if (ev.sinConexion) lista.push({ ...base, tono: "info", texto: `${nombre(ev.sucursalId)} vendió sin conexión en el puesto ${ev.puesto}: se sincroniza sola` })
        else if (ev.importe >= umbral) lista.push({ ...base, tono: "logro", texto: `Venta grande en ${nombre(ev.sucursalId)}: ${formatoPesosCorto(ev.importe)}` })
        break
    }
  }
  return lista.reverse()
}

/** Recorrido de la sala de control: la red completa y después cada sucursal. */
export function recorridoSala(red: RedForja): (Id | null)[] {
  return [null, ...red.nodos.filter((n) => n.lat !== null).map((n) => n.id)]
}

export const SEGUNDOS_POR_PARADA = 20
