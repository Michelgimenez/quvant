import type { EstadoEmpresa } from "@/dominio/estado"
import type { Id } from "@/dominio/tipos"
import type { AlmacenServidor } from "./almacen"
import { aplicarOperacion } from "./reductores"
import { ErrorRed, type RespuestaEnvio, type Servidor } from "./servidor"
import type { OpConfirmada, Operacion, UsuarioContexto } from "./tipos"

/**
 * Servidor de sincronización EMULADO (modo demo). Se comporta como el de
 * producción: orden global (seq), idempotencia por id de operación, mismo
 * reductor en modo autoritativo y rechazo de conflictos. Persiste su log en
 * IndexedDB, así que varias pestañas funcionan como varios dispositivos.
 *
 * "La red" se simula con latencia y con `disponible()`: si devuelve false,
 * toda llamada falla con ErrorRed, igual que un corte de internet.
 */
export class ServidorDemo implements Servidor {
  private estado: EstadoEmpresa | null = null
  private seq = 0
  private aceptadas = new Map<Id, RespuestaEnvio>()

  constructor(
    private opts: {
      semilla: () => EstadoEmpresa
      almacen: AlmacenServidor
      latenciaMs?: number
      disponible?: () => boolean
      reloj?: () => Date
    },
  ) {}

  private async red() {
    const ms = this.opts.latenciaMs ?? 0
    if (ms > 0) await new Promise((r) => setTimeout(r, ms))
    if (this.opts.disponible && !this.opts.disponible()) throw new ErrorRed()
  }

  /** Serializa el acceso entre pestañas (Web Locks) cuando está disponible. */
  private async conBloqueo<T>(fn: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined
    if (locks) return locks.request("quvant-servidor-demo", fn) as Promise<T>
    return fn()
  }

  private async alDia() {
    if (!this.estado) this.estado = this.opts.semilla()
    for (const c of await this.opts.almacen.log(this.seq)) this.reaplicar(c)
  }

  private reaplicar(c: OpConfirmada) {
    aplicarOperacion(this.estado!, c.op, { modo: "servidor", usuario: c.autor, ahora: c.recibidaEn, asignado: c.resultado.ok ? c.resultado.asignado : undefined })
    this.seq = c.seq
    this.aceptadas.set(c.op.id, { id: c.op.id, seq: c.seq, resultado: c.resultado })
  }

  async enviar(ops: Operacion[], autor: UsuarioContexto): Promise<RespuestaEnvio[]> {
    await this.red()
    return this.procesar(ops, autor)
  }

  private procesar(ops: Operacion[], autor: UsuarioContexto): Promise<RespuestaEnvio[]> {
    return this.conBloqueo(async () => {
      await this.alDia()
      const respuestas: RespuestaEnvio[] = []
      for (const op of ops) {
        const previa = this.aceptadas.get(op.id)
        if (previa) {
          respuestas.push(previa) // idempotencia: reenviar es seguro
          continue
        }
        const rechazada = await this.opts.almacen.rechazada(op.id)
        if (rechazada) {
          respuestas.push({ id: op.id, seq: null, resultado: rechazada })
          continue
        }
        if (op.usuarioId !== autor.id) {
          respuestas.push({ id: op.id, seq: null, resultado: { ok: false, codigo: "permiso", error: "La operación pertenece a otro usuario" } })
          continue
        }
        const recibidaEn = (this.opts.reloj?.() ?? new Date()).toISOString()
        const resultado = aplicarOperacion(this.estado!, op, { modo: "servidor", usuario: autor, ahora: recibidaEn })
        if (resultado.ok) {
          const entrada: OpConfirmada = { seq: this.seq + 1, op, resultado, recibidaEn, autor }
          await this.opts.almacen.agregar(entrada)
          this.seq = entrada.seq
          const r = { id: op.id, seq: entrada.seq, resultado }
          this.aceptadas.set(op.id, r)
          respuestas.push(r)
        } else {
          await this.opts.almacen.guardarRechazada(op.id, resultado)
          respuestas.push({ id: op.id, seq: null, resultado })
        }
      }
      return respuestas
    })
  }

  async traer(desde: number): Promise<OpConfirmada[]> {
    await this.red()
    return this.conBloqueo(async () => {
      await this.alDia()
      return this.opts.almacen.log(desde)
    })
  }

  /**
   * Simula otro dispositivo (otro mostrador, el celular del dueño) que ya
   * sincronizó una operación. Lo usan las demos del sitio, la presentación y
   * los tests de conflictos.
   */
  async inyectar(op: Operacion, autor: UsuarioContexto) {
    const [r] = await this.procesar([op], autor)
    return r
  }

  /** Estado del servidor (solo lectura, para demos y tests). */
  async estadoActual() {
    await this.alDia()
    return this.estado!
  }
}
