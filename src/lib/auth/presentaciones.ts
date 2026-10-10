import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { firmar, verificar } from "./firma"

/**
 * Acceso a la presentación para inversores: una clave compartida
 * (INVERSORES_KEY) que, si es correcta, deja una cookie firmada httpOnly
 * por 8 horas, válida solo bajo /inversores.
 *
 * En desarrollo, sin INVERSORES_KEY se usa "yunque-demo". En producción,
 * sin INVERSORES_KEY la presentación queda cerrada.
 */
export const COOKIE_INVERSORES = "yunque_inversores"
const AUDIENCIA = "yunque-inversores"
const DURACION_S = 8 * 60 * 60
const CLAVE_DESARROLLO = "yunque-demo"

export function claveInversores(): string | null {
  const k = process.env.INVERSORES_KEY?.trim()
  if (k) return k
  return process.env.NODE_ENV === "production" ? null : CLAVE_DESARROLLO
}

/** Comparación en tiempo constante (sobre hashes del mismo largo). */
export function claveCorrecta(intento: string, clave: string) {
  const a = createHash("sha256").update(intento, "utf8").digest()
  const b = createHash("sha256").update(clave, "utf8").digest()
  return timingSafeEqual(a, b)
}

export async function crearAccesoInversores() {
  const token = await firmar({ p: "inversores" }, DURACION_S, AUDIENCIA)
  const almacen = await cookies()
  almacen.set(COOKIE_INVERSORES, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/inversores",
    maxAge: DURACION_S,
  })
}

export async function tieneAccesoInversores() {
  if (!claveInversores()) return false
  const almacen = await cookies()
  return (await verificar(almacen.get(COOKIE_INVERSORES)?.value, AUDIENCIA)) !== null
}

export async function cerrarAccesoInversores() {
  const almacen = await cookies()
  almacen.delete({ name: COOKIE_INVERSORES, path: "/inversores" })
}
