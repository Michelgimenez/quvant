import Dexie, { type Table } from "dexie"
import type { Id } from "@/dominio/tipos"
import type { AlmacenLocal, AlmacenServidor } from "./almacen"
import type { OpConfirmada, Operacion, Resultado } from "./tipos"

/**
 * IndexedDB (Dexie). Una base por organización con:
 *  - pendientes: cola de operaciones sin confirmar (sobrevive a recargas y cortes)
 *  - confirmadas: operaciones ya aceptadas por el servidor, en orden global (seq)
 *  - meta: cursor de sincronización, id del dispositivo, sesión en caché, contadores
 *  - servidor_log / servidor_rechazadas: SOLO en modo demo (servidor emulado)
 */
class BaseYunque extends Dexie {
  pendientes!: Table<Operacion & { orden: number }, Id>
  confirmadas!: Table<OpConfirmada, number>
  meta!: Table<{ clave: string; valor: unknown }, string>
  servidor_log!: Table<OpConfirmada, number>
  servidor_rechazadas!: Table<{ id: Id; resultado: Resultado }, Id>

  constructor(nombre: string) {
    super(nombre)
    this.version(1).stores({
      pendientes: "id, orden",
      confirmadas: "seq",
      meta: "clave",
      servidor_log: "seq",
      servidor_rechazadas: "id",
    })
  }
}

const bases = new Map<string, BaseYunque>()
export function baseLocal(orgId: Id) {
  const nombre = `yunque-${orgId}`
  let b = bases.get(nombre)
  if (!b) {
    b = new BaseYunque(nombre)
    bases.set(nombre, b)
  }
  return b
}

export class AlmacenIndexedDB implements AlmacenLocal {
  constructor(private db: BaseYunque) {}

  async pendientes() {
    const filas = await this.db.pendientes.orderBy("orden").toArray()
    return filas.map((f) => {
      const op: Partial<typeof f> = { ...f }
      delete op.orden
      return op as Operacion
    })
  }
  async agregarPendiente(op: Operacion) {
    await this.db.pendientes.put({ ...op, orden: Date.now() + Math.random() })
  }
  async quitarPendientes(ids: Id[]) {
    await this.db.pendientes.bulkDelete(ids)
  }
  async confirmadas() {
    return this.db.confirmadas.orderBy("seq").toArray()
  }
  async agregarConfirmadas(ops: OpConfirmada[]) {
    await this.db.confirmadas.bulkPut(ops)
  }
  async leerMeta<T>(clave: string) {
    return (await this.db.meta.get(clave))?.valor as T | undefined
  }
  async escribirMeta(clave: string, valor: unknown) {
    await this.db.meta.put({ clave, valor })
  }
  async vaciar() {
    await this.db.transaction("rw", [this.db.pendientes, this.db.confirmadas, this.db.meta], async () => {
      await Promise.all([this.db.pendientes.clear(), this.db.confirmadas.clear(), this.db.meta.clear()])
    })
  }
}

export class AlmacenServidorIndexedDB implements AlmacenServidor {
  constructor(private db: BaseYunque) {}

  async log(desdeSeq: number) {
    return this.db.servidor_log.where("seq").above(desdeSeq).sortBy("seq")
  }
  async agregar(entrada: OpConfirmada) {
    // add (no put): si otra pestaña ya usó ese seq, falla y el servidor se pone al día
    await this.db.servidor_log.add(entrada)
  }
  async rechazada(id: Id) {
    return (await this.db.servidor_rechazadas.get(id))?.resultado
  }
  async guardarRechazada(id: Id, resultado: Resultado) {
    await this.db.servidor_rechazadas.put({ id, resultado })
  }
  async vaciar() {
    await this.db.transaction("rw", [this.db.servidor_log, this.db.servidor_rechazadas], async () => {
      await Promise.all([this.db.servidor_log.clear(), this.db.servidor_rechazadas.clear()])
    })
  }
}
