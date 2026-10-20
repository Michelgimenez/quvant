import type { EstadoEmpresa } from "@/dominio/estado"
import type { Id } from "@/dominio/tipos"
import { operacionSimulada } from "@/forja/dominio/simulacion-operaciones"
import { SimuladorForja, mundoDesdeEstado, type IntencionSimulada } from "@/forja/dominio/simulador"
import { aplicarOperacion } from "@/sync/reductores"

/**
 * Mundo de una demo pública de Forja: un snapshot del seed en memoria, sin
 * base ni sesión. El reloj de la demo arranca en el momento del snapshot y
 * avanza en tiempo real; el simulador propone eventos y los aplica con el
 * mismo reductor que Quvant (las mismas reglas que una operación a mano).
 */
export type SnapshotForja = { ahora: string; estado: EstadoEmpresa }

/** Nombres que no viajan en el snapshot de un prospecto: los pone su configuración. */
export type NombresDemo = { org: string; sucursales: Record<string, { nombre: string; direccion: string }> }

export class MundoDemo {
  readonly estado: EstadoEmpresa
  /** Milisegundos que se suman al reloj real para obtener la hora de la demo. */
  readonly desfase: number
  private sim = new SimuladorForja("forja:demo-publica")
  private n = 0

  constructor(snapshot: SnapshotForja, nombres?: NombresDemo) {
    this.estado = structuredClone(snapshot.estado)
    if (nombres) {
      this.estado.org.nombre = nombres.org
      for (const s of this.estado.sucursales) {
        const n = nombres.sucursales[s.codigo]
        if (n) Object.assign(s, n)
      }
      for (const neg of this.estado.negocios) neg.nombre = nombres.org
    }
    this.desfase = Date.parse(snapshot.ahora) - Date.now()
  }

  ahora() {
    return new Date(Date.now() + this.desfase)
  }

  pausa() {
    return this.sim.pausa()
  }

  private aplicar(intencion: IntencionSimulada | null) {
    if (!intencion) return false
    const ahora = this.ahora()
    const r = operacionSimulada(this.estado, intencion, ahora, () => crypto.randomUUID(), ++this.n)
    if (!r) return false
    return aplicarOperacion(this.estado, r.op, { modo: "servidor", usuario: r.autor, ahora: r.op.creadaEn }).ok
  }

  /** Un evento verosímil (venta, despacho, recepción o avance de servicio). Devuelve si cambió algo. */
  paso() {
    const ahora = this.ahora()
    return this.aplicar(this.sim.siguiente(mundoDesdeEstado(this.estado, ahora), ahora))
  }

  private sucursal(codigo: string) {
    return this.estado.sucursales.find((s) => s.codigo === codigo) ?? null
  }

  // ───── Guion de los videos: eventos a pedido, siempre los mismos ─────

  /** Una venta en un puesto: dos productos con stock de sobra. */
  vender(codigo: string, puesto = 1) {
    const s = this.sucursal(codigo)
    if (!s) return false
    const items = Object.values(this.estado.stock)
      .filter((st) => st.sucursalId === s.id && st.cantidad > st.minimo + 4)
      .slice(0, 2)
      .map((st) => ({ productoId: st.productoId, cantidad: 1 }))
    return this.aplicar({ tipo: "venta", sucursalId: s.id, puesto, items })
  }

  /** Una venta que deja un producto justo en su mínimo: el rack pasa a crítico. */
  quiebre(codigo: string, puesto = 1) {
    const s = this.sucursal(codigo)
    if (!s) return false
    const st = Object.values(this.estado.stock)
      .filter((x) => x.sucursalId === s.id && x.minimo > 0 && x.ubicacion && x.cantidad > x.minimo && x.cantidad - x.minimo <= 4)
      .sort((a, b) => a.cantidad - a.minimo - (b.cantidad - b.minimo))[0]
    if (!st) return false
    return this.aplicar({ tipo: "venta", sucursalId: s.id, puesto, items: [{ productoId: st.productoId, cantidad: st.cantidad - st.minimo }] })
  }

  /** Un despacho de reposición entre dos sucursales (aparece el arco en camino). */
  despachar(desde: string, hacia: string) {
    const a = this.sucursal(desde)
    const b = this.sucursal(hacia)
    if (!a || !b) return false
    const items = Object.values(this.estado.stock)
      .filter((st) => st.sucursalId === a.id && st.cantidad > st.minimo * 2 + 4)
      .slice(0, 3)
      .map((st) => ({ productoId: st.productoId as Id, cantidad: 2 }))
    return this.aplicar({ tipo: "despacho", desdeId: a.id, haciaId: b.id, items, minutos: 45 })
  }
}
