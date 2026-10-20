import { SignJWT, jwtVerify, type JWTPayload } from "jose"

/**
 * Firma y verificación de tokens de sesión (HS256 con SESION_SECRETO).
 * Sin dependencias de Next: se usa desde el proxy, las acciones y los tests.
 */
const SECRETO_DESARROLLO = "secreto-de-desarrollo-quvant-no-usar-en-produccion-0001"
let avisado = false

export function claveFirma(): Uint8Array {
  const s = process.env.SESION_SECRETO
  if (s && s.length >= 32) return new TextEncoder().encode(s)
  if (process.env.NODE_ENV === "production" && (process.env.QUVANT_PERMITIR_SECRETO_DEV ?? process.env.YUNQUE_PERMITIR_SECRETO_DEV) !== "1") {
    throw new Error("SESION_SECRETO no configurado (mínimo 32 caracteres)")
  }
  if (!avisado) {
    avisado = true
    console.warn("[quvant] SESION_SECRETO no configurado: usando secreto de desarrollo.")
  }
  return new TextEncoder().encode(SECRETO_DESARROLLO)
}

const EMISOR = "quvant"

export async function firmar<T extends object>(datos: T, segundos: number, audiencia: string) {
  return new SignJWT({ ...(datos as JWTPayload) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(EMISOR)
    .setAudience(audiencia)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + segundos)
    .sign(claveFirma())
}

export async function verificar<T>(token: string | undefined, audiencia: string): Promise<T | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, claveFirma(), { issuer: EMISOR, audience: audiencia, algorithms: ["HS256"] })
    return payload as T
  } catch {
    return null
  }
}
