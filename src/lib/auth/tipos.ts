import type { Id, Rol } from "@/dominio/tipos"

/** Datos de la sesión firmada (cookie httpOnly). Sin secretos. */
export type Sesion = {
  sub: Id
  org: Id
  rol: Rol
  nombre: string
  email: string
  sucursales: Id[] | null
  /** aal2 = doble factor verificado. */
  aal: "aal1" | "aal2"
  modo: "demo" | "supabase"
  /** Vencimiento (segundos epoch). */
  exp: number
}

export type PreSesion = {
  sub: Id
  email: string
  rol: Rol
  /** Intentos de código restantes. */
  intentos: number
  exp: number
}

export const COOKIE_SESION = "yunque_sesion"
export const COOKIE_PRE_SESION = "yunque_pre"
export const DURACION_SESION_S = 12 * 60 * 60
export const DURACION_PRE_SESION_S = 5 * 60
