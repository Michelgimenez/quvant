import type { EstadoEmpresa } from "@/dominio/estado"
import type { Id } from "@/dominio/tipos"
import { Azar } from "@/lib/azar"
import type { AlmacenLocal } from "./almacen"
import { aplicarOperacion } from "./reductores"
import { ErrorRed, type Servidor } from "./servidor"
import type { DatosOp, OpConfirmada, Operacion, Resultado, TipoOp, UsuarioContexto } from "./tipos"

/**
 * Motor de sincronización local-first.
 *
 *   estado visible = base confirmada (semilla + operaciones confirmadas, en orden del servidor)
 *                  + operaciones pendientes (cola local, aplicadas de forma optimista)
 *
 * - `ejecutar()` valida y aplica la operación en la réplica local, la guarda en la
 *   cola (IndexedDB) y pide sincronizar. Funciona igual con o sin conexión.
 * - `sincronizar()` envía la cola en orden, trae lo confirmado (propio y de otros
 *   dispositivos), lo aplica sobre la base y vuelve a montar las pendientes encima
 *   (rebase). Las operaciones rechazadas salen de la cola y se informan.
 */

export type EstadoConexion = "en_linea" | "sin_conexion" | "sincronizando"

export type EventoMotor =
  | { tipo: "cambio" }
  | { tipo: "conexion"; estado: EstadoConexion }
  | {
      tipo: "sincronizado"
      /** Operaciones propias aceptadas en esta sincronización. */
      enviadas: number
      /** De esas, cuántas se habían hecho sin conexión. */
      sinConexion: number
      /** Ventas hechas sin conexión que se sincronizaron. */
      ventasSinConexion: number
      rechazadas: { op: Operacion; error: string }[]
      avisos: { op: Operacion; avisos: string[] }[]
      /** Operaciones de otros dispositivos recibidas. */
      recibidas: number
    }

export type OpcionesMotor = {
  almacen: AlmacenLocal
  servidor: Servidor
  /** Estado inicial (semilla). Se llama una vez por reconstrucción completa. */
  semilla: () => EstadoEmpresa
  usuario: UsuarioContexto
  /** ¿Hay red? (navigator.onLine + corte simulado). */
  hayRed?: () => boolean
  reloj?: () => Date
  /** Espera antes de sincronizar luego de una operación (agrupa ráfagas). */
  demoraSyncMs?: number
}

export class MotorSync {
  estado!: EstadoEmpresa
  version = 0
  conexion: EstadoConexion = "en_linea"
  pendientes: Operacion[] = []
  ultimoSeq = 0
  dispositivo = ""
  ultimaSincronizacion: string | null = null

  private base!: EstadoEmpresa
  private oyentes = new Set<(e: EventoMotor) => void>()
  private sincronizando: Promise<void> | null = null
  private temporizador: ReturnType<typeof setTimeout> | null = null
  private azar = new Azar(Date.now() ^ Math.floor(Math.random() * 1e9))

  constructor(private o: OpcionesMotor) {}

  // ───────── ciclo de vida ─────────

  async iniciar() {
    this.dispositivo = (await this.o.almacen.leerMeta<string>("dispositivo")) ?? this.uuid()
    await this.o.almacen.escribirMeta("dispositivo", this.dispositivo)
    this.ultimoSeq = (await this.o.almacen.leerMeta<number>("ultimoSeq")) ?? 0
    this.ultimaSincronizacion = (await this.o.almacen.leerMeta<string>("ultimaSincronizacion")) ?? null
    this.pendientes = await this.o.almacen.pendientes()
    this.base = this.o.semilla()
    for (const c of await this.o.almacen.confirmadas()) this.aplicarConfirmada(this.base, c)
    this.montarVisible()
    this.conexion = this.hayRed() ? "en_linea" : "sin_conexion"
    return this
  }

  suscribir(fn: (e: EventoMotor) => void) {
    this.oyentes.add(fn)
    return () => {
      this.oyentes.delete(fn)
    }
  }

  private emitir(e: EventoMotor) {
    for (const fn of this.oyentes) fn(e)
  }

  private hayRed() {
    return this.o.hayRed ? this.o.hayRed() : true
  }

  private ahora() {
    return (this.o.reloj?.() ?? new Date()).toISOString()
  }

  uuid() {
    return this.azar.uuid()
  }

  /** Contador local por dispositivo (números provisorios: CC2-L0007). */
  async siguienteLocal(clave: string) {
    const k = `contador:${clave}`
    const n = ((await this.o.almacen.leerMeta<number>(k)) ?? 0) + 1
    await this.o.almacen.escribirMeta(k, n)
    return n
  }

  // ───────── operaciones ─────────

  /**
   * Crea, valida y aplica una operación. Si la validación local falla no se
   * encola y se devuelve el error. Si pasa, queda en la cola y se sincroniza
   * cuando haya conexión.
   */
  async ejecutar<T extends TipoOp>(tipo: T, datos: DatosOp[T], opciones: { sucursalId?: Id | null } = {}): Promise<Resultado & { opId: Id }> {
    const op = {
      id: this.uuid(),
      tipo,
      orgId: this.estado.org.id,
      usuarioId: this.o.usuario.id,
      sucursalId: opciones.sucursalId ?? null,
      creadaEn: this.ahora(),
      dispositivo: this.dispositivo,
      sinConexion: !this.hayRed() || this.conexion === "sin_conexion",
      datos,
    } as Operacion
    const resultado = aplicarOperacion(this.estado, op, { modo: "local", usuario: this.o.usuario, ahora: op.creadaEn })
    if (!resultado.ok) return { ...resultado, opId: op.id }
    this.pendientes.push(op)
    await this.o.almacen.agregarPendiente(op)
    this.version++
    this.emitir({ tipo: "cambio" })
    this.programarSync()
    return { ...resultado, opId: op.id }
  }

  private programarSync() {
    if (this.temporizador) clearTimeout(this.temporizador)
    this.temporizador = setTimeout(() => {
      this.temporizador = null
      void this.sincronizar()
    }, this.o.demoraSyncMs ?? 250)
  }

  // ───────── sincronización ─────────

  sincronizar(): Promise<void> {
    this.sincronizando ??= this.ciclo().finally(() => {
      this.sincronizando = null
    })
    return this.sincronizando
  }

  private setConexion(c: EstadoConexion) {
    if (this.conexion === c) return
    this.conexion = c
    this.emitir({ tipo: "conexion", estado: c })
  }

  private async ciclo() {
    if (!this.hayRed()) {
      this.setConexion("sin_conexion")
      return
    }
    this.setConexion("sincronizando")
    try {
      const propias = this.pendientes.filter((op) => op.usuarioId === this.o.usuario.id)
      const respuestas = propias.length ? await this.o.servidor.enviar(propias, this.o.usuario) : []
      const nuevas = await this.o.servidor.traer(this.ultimoSeq)

      const resueltas = new Set(respuestas.map((r) => r.id))
      const rechazadas = respuestas
        .filter((r) => !r.resultado.ok)
        .map((r) => ({ op: propias.find((p) => p.id === r.id)!, error: r.resultado.ok ? "" : r.resultado.error }))
      const aceptadas = propias.filter((p) => resueltas.has(p.id) && respuestas.find((r) => r.id === p.id)!.resultado.ok)
      const avisos = respuestas
        .filter((r) => r.resultado.ok && r.resultado.avisos.length)
        .map((r) => ({ op: propias.find((p) => p.id === r.id)!, avisos: r.resultado.ok ? r.resultado.avisos : [] }))

      for (const c of nuevas) this.aplicarConfirmada(this.base, c)
      if (nuevas.length) {
        this.ultimoSeq = nuevas[nuevas.length - 1].seq
        await this.o.almacen.agregarConfirmadas(nuevas)
        await this.o.almacen.escribirMeta("ultimoSeq", this.ultimoSeq)
      }
      if (resueltas.size) {
        await this.o.almacen.quitarPendientes([...resueltas])
        this.pendientes = this.pendientes.filter((p) => !resueltas.has(p.id))
      }
      this.ultimaSincronizacion = this.ahora()
      await this.o.almacen.escribirMeta("ultimaSincronizacion", this.ultimaSincronizacion)

      const recibidas = nuevas.filter((c) => c.op.dispositivo !== this.dispositivo).length
      if (resueltas.size || nuevas.length) {
        this.montarVisible()
        this.version++
        this.emitir({ tipo: "cambio" })
      }
      this.setConexion("en_linea")
      if (resueltas.size || recibidas) {
        this.emitir({
          tipo: "sincronizado",
          enviadas: aceptadas.length,
          sinConexion: aceptadas.filter((o) => o.sinConexion).length,
          ventasSinConexion: aceptadas.filter((o) => o.sinConexion && (o.tipo === "venta.crear" || o.tipo === "presupuesto.convertir")).length,
          rechazadas,
          avisos,
          recibidas,
        })
      }
    } catch (e) {
      if (e instanceof ErrorRed || (e instanceof TypeError && /fetch|network/i.test(e.message))) {
        this.setConexion("sin_conexion")
        return
      }
      this.setConexion("en_linea")
      throw e
    }
  }

  /** Avisar que la red cambió (eventos online/offline o corte simulado). */
  redCambio() {
    if (this.hayRed()) void this.sincronizar()
    else this.setConexion("sin_conexion")
  }

  // ───────── réplica ─────────

  private aplicarConfirmada(e: EstadoEmpresa, c: OpConfirmada) {
    aplicarOperacion(e, c.op, { modo: "servidor", usuario: c.autor, ahora: c.recibidaEn, asignado: c.resultado.ok ? c.resultado.asignado : undefined })
  }

  /** visible = copia de la base + pendientes reaplicadas (rebase). */
  private montarVisible() {
    const visible = structuredClone(this.base)
    // Una pendiente que ya no aplica (p. ej. dependía de una rechazada) queda en
    // la cola: el servidor la rechazará y saldrá en la próxima sincronización.
    for (const op of this.pendientes) aplicarOperacion(visible, op, { modo: "local", usuario: this.o.usuario, ahora: op.creadaEn })
    this.estado = visible
  }

  /** Borra todo lo local (para reiniciar la demo). */
  async vaciar() {
    await this.o.almacen.vaciar()
  }
}
