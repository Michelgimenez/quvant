import type { Id } from "@/dominio/tipos"
import type { OpConfirmada, Operacion, Resultado, UsuarioContexto } from "./tipos"

/**
 * Lo que el motor de sincronización necesita de "la nube". Dos implementaciones:
 *  - ServidorDemo (servidor-demo.ts): emulado en el navegador, mismo reductor.
 *  - ServidorSupabase (servidor-supabase.ts): RPC app.aplicar_operacion + tabla operaciones.
 */
export interface Servidor {
  /** Envía operaciones en orden. Devuelve el resultado de cada una. */
  enviar(ops: Operacion[], autor: UsuarioContexto): Promise<RespuestaEnvio[]>
  /** Operaciones aceptadas con seq mayor a `desde` (propias y de otros dispositivos). */
  traer(desde: number): Promise<OpConfirmada[]>
}

export type RespuestaEnvio = { id: Id; seq: number | null; resultado: Resultado }

/** Error de red: la operación queda en la cola y se reintenta después. */
export class ErrorRed extends Error {
  constructor(mensaje = "Sin conexión con el servidor") {
    super(mensaje)
    this.name = "ErrorRed"
  }
}
