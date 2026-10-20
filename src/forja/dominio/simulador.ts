import type { EstadoEmpresa } from "@/dominio/estado"
import type { EstadoServicio, Id } from "@/dominio/tipos"
import { Azar } from "@/lib/azar"
import { distanciaKm, minutosDeViaje } from "./geo"

/**
 * Simulador de eventos de Forja para organizaciones DEMO (se muestra el sello
 * "SIMULACIÓN"). Propone intenciones verosímiles cada pocos segundos: ventas al
 * ritmo de cada sucursal, despachos hacia donde falta stock, recepciones de lo
 * que ya llegó y avances del servicio técnico.
 *
 * Trabaja sobre una interfaz chica (`MundoSimulable`) para servir igual a la
 * app (estado de Quvant → operaciones reales) y a las demos públicas (snapshot).
 */
export type IntencionSimulada =
  | { tipo: "venta"; sucursalId: Id; puesto: number; items: { productoId: Id; cantidad: number }[] }
  | { tipo: "despacho"; desdeId: Id; haciaId: Id; items: { productoId: Id; cantidad: number }[]; minutos: number }
  | { tipo: "recepcion"; transferenciaId: Id }
  | { tipo: "servicio"; ordenId: Id; estado: EstadoServicio }

export type MundoSimulable = {
  sucursales: { id: Id; tipo: "sucursal" | "deposito"; puestos: number; lat: number | null; lng: number | null; ritmo: number }[]
  stock: (sucursalId: Id) => { productoId: Id; cantidad: number; minimo: number }[]
  enTransito: () => { id: Id; haciaId: Id; llegadaEstimada: string }[]
  ordenes: () => { id: Id; sucursalId: Id; estado: EstadoServicio }[]
}

/** Siguiente estado verosímil de una orden de servicio (sin saltos imposibles). */
export const AVANCE_SERVICIO: Partial<Record<EstadoServicio, EstadoServicio>> = {
  ingresado: "diagnostico",
  diagnostico: "esperando_aprobacion",
  esperando_aprobacion: "en_reparacion",
  en_reparacion: "listo",
  listo: "entregado",
}

export class SimuladorForja {
  private az: Azar
  constructor(semilla: string | number = "forja") {
    this.az = new Azar(String(semilla))
  }

  /** Milisegundos hasta el próximo evento (entre 2,5 y 6 s). */
  pausa() {
    return Math.round(2500 + this.az.siguiente() * 3500)
  }

  siguiente(m: MundoSimulable, ahora: Date): IntencionSimulada | null {
    // Lo que ya llegó se recibe primero
    const vencida = m.enTransito().find((t) => Date.parse(t.llegadaEstimada) <= ahora.getTime())
    if (vencida) return { tipo: "recepcion", transferenciaId: vencida.id }

    const r = this.az.siguiente()
    if (r < 0.12) {
      const s = this.servicio(m)
      if (s) return s
    }
    if (r >= 0.12 && r < 0.2) {
      const d = this.despacho(m)
      if (d) return d
    }
    return this.venta(m)
  }

  private venta(m: MundoSimulable): IntencionSimulada | null {
    const conMostrador = m.sucursales.filter((s) => s.tipo === "sucursal" && s.puestos > 0)
    if (!conMostrador.length) return null
    const total = conMostrador.reduce((a, s) => a + Math.max(0.2, s.ritmo), 0)
    let x = this.az.siguiente() * total
    let s = conMostrador[0]
    for (const c of conMostrador) {
      x -= Math.max(0.2, c.ritmo)
      if (x <= 0) {
        s = c
        break
      }
    }
    const disponibles = m.stock(s.id).filter((p) => p.cantidad >= 1)
    if (!disponibles.length) return null
    const n = 1 + Math.floor(this.az.siguiente() * Math.min(3, disponibles.length))
    const elegidos = new Map<Id, number>()
    for (let i = 0; i < n; i++) {
      const p = disponibles[Math.floor(this.az.siguiente() * disponibles.length)]
      elegidos.set(p.productoId, Math.min(p.cantidad, 1 + Math.floor(this.az.siguiente() * 3)))
    }
    return { tipo: "venta", sucursalId: s.id, puesto: 1 + Math.floor(this.az.siguiente() * s.puestos), items: [...elegidos].map(([productoId, cantidad]) => ({ productoId, cantidad })) }
  }

  private despacho(m: MundoSimulable): IntencionSimulada | null {
    const destinos = m.sucursales.filter((s) => s.tipo === "sucursal")
    for (const destino of this.az.mezclar([...destinos])) {
      const criticos = m.stock(destino.id).filter((p) => p.minimo > 0 && p.cantidad <= p.minimo)
      if (!criticos.length) continue
      for (const origen of this.az.mezclar(m.sucursales.filter((s) => s.id !== destino.id))) {
        const stockOrigen = new Map(m.stock(origen.id).map((p) => [p.productoId, p]))
        const items = criticos
          .map((c) => {
            const o = stockOrigen.get(c.productoId)
            const sobra = o ? Math.floor(o.cantidad - Math.max(o.minimo, 1) * 1.5) : 0
            return { productoId: c.productoId, cantidad: Math.min(sobra, Math.ceil(c.minimo * 1.5 - c.cantidad)) }
          })
          .filter((i) => i.cantidad >= 1)
          .slice(0, 4)
        if (!items.length) continue
        const km = origen.lat !== null && origen.lng !== null && destino.lat !== null && destino.lng !== null ? distanciaKm({ lat: origen.lat, lng: origen.lng }, { lat: destino.lat, lng: destino.lng }) : 20
        return { tipo: "despacho", desdeId: origen.id, haciaId: destino.id, items, minutos: minutosDeViaje(km) }
      }
    }
    return null
  }

  private servicio(m: MundoSimulable): IntencionSimulada | null {
    const candidatas = m.ordenes().filter((o) => AVANCE_SERVICIO[o.estado])
    if (!candidatas.length) return null
    const o = candidatas[Math.floor(this.az.siguiente() * candidatas.length)]
    return { tipo: "servicio", ordenId: o.id, estado: AVANCE_SERVICIO[o.estado]! }
  }
}

/** El estado de Quvant visto por el simulador. */
export function mundoDesdeEstado(e: EstadoEmpresa, ahora: Date): MundoSimulable {
  const hace28 = ahora.getTime() - 28 * 86_400_000
  const ritmo = new Map<Id, number>()
  for (const v of Object.values(e.ventas)) if (Date.parse(v.fecha) >= hace28) ritmo.set(v.sucursalId, (ritmo.get(v.sucursalId) ?? 0) + 1)
  return {
    sucursales: e.sucursales.map((s) => ({ id: s.id, tipo: s.tipo, puestos: s.puestos, lat: s.lat, lng: s.lng, ritmo: (ritmo.get(s.id) ?? 0) / 28 })),
    stock: (sucursalId) => Object.values(e.stock).filter((st) => st.sucursalId === sucursalId).map((st) => ({ productoId: st.productoId, cantidad: st.cantidad, minimo: st.minimo })),
    enTransito: () => Object.values(e.transferencias).filter((t) => t.estado === "en_transito").map((t) => ({ id: t.id, haciaId: t.haciaId, llegadaEstimada: t.llegadaEstimada })),
    ordenes: () => Object.values(e.servicio).map((o) => ({ id: o.id, sucursalId: o.sucursalId, estado: o.estado })),
  }
}
