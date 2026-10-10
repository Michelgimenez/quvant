import type { Id } from "@/dominio/tipos"
import type { OpConfirmada, Operacion, Resultado } from "./tipos"

/**
 * Persistencia local del motor de sincronización (cola y réplica).
 * En el navegador: IndexedDB (almacen-indexeddb.ts). En tests y en las demos
 * embebidas del sitio: memoria.
 */
export interface AlmacenLocal {
  pendientes(): Promise<Operacion[]>
  agregarPendiente(op: Operacion): Promise<void>
  quitarPendientes(ids: Id[]): Promise<void>
  confirmadas(): Promise<OpConfirmada[]>
  agregarConfirmadas(ops: OpConfirmada[]): Promise<void>
  leerMeta<T>(clave: string): Promise<T | undefined>
  escribirMeta(clave: string, valor: unknown): Promise<void>
  vaciar(): Promise<void>
}

/** Persistencia del servidor emulado (solo modo demo). */
export interface AlmacenServidor {
  log(desdeSeq: number): Promise<OpConfirmada[]>
  /** Agrega al log. Falla si el seq ya existe (otra pestaña escribió primero). */
  agregar(entrada: OpConfirmada): Promise<void>
  rechazada(id: Id): Promise<Resultado | undefined>
  guardarRechazada(id: Id, r: Resultado): Promise<void>
  vaciar(): Promise<void>
}

export class AlmacenMemoria implements AlmacenLocal {
  private _pendientes: Operacion[] = []
  private _confirmadas: OpConfirmada[] = []
  private meta = new Map<string, unknown>()

  async pendientes() {
    return [...this._pendientes]
  }
  async agregarPendiente(op: Operacion) {
    this._pendientes.push(op)
  }
  async quitarPendientes(ids: Id[]) {
    const s = new Set(ids)
    this._pendientes = this._pendientes.filter((o) => !s.has(o.id))
  }
  async confirmadas() {
    return [...this._confirmadas]
  }
  async agregarConfirmadas(ops: OpConfirmada[]) {
    const vistos = new Set(this._confirmadas.map((c) => c.seq))
    this._confirmadas.push(...ops.filter((o) => !vistos.has(o.seq)))
    this._confirmadas.sort((a, b) => a.seq - b.seq)
  }
  async leerMeta<T>(clave: string) {
    return this.meta.get(clave) as T | undefined
  }
  async escribirMeta(clave: string, valor: unknown) {
    this.meta.set(clave, valor)
  }
  async vaciar() {
    this._pendientes = []
    this._confirmadas = []
    this.meta.clear()
  }
}

export class AlmacenServidorMemoria implements AlmacenServidor {
  private _log: OpConfirmada[] = []
  private _rechazadas = new Map<Id, Resultado>()

  async log(desdeSeq: number) {
    return this._log.filter((e) => e.seq > desdeSeq)
  }
  async agregar(entrada: OpConfirmada) {
    if (this._log.some((e) => e.seq === entrada.seq)) throw new Error("seq_ocupado")
    this._log.push(entrada)
  }
  async rechazada(id: Id) {
    return this._rechazadas.get(id)
  }
  async guardarRechazada(id: Id, r: Resultado) {
    this._rechazadas.set(id, r)
  }
  async vaciar() {
    this._log = []
    this._rechazadas.clear()
  }
}
