import "server-only"
import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { Secret, TOTP } from "otpauth"
import { SEMILLA_DEMO, USUARIOS_DEMO } from "@/datos/demo/catalogo"
import { exige2FA } from "@/dominio/permisos"
import { uuidDe } from "@/lib/azar"
import { claveFirma } from "./firma"

/**
 * Usuarios de prueba del modo demo. Contraseña común: demo1234 (README).
 * Los ids coinciden con los que genera la empresa demo.
 */
export const CONTRASENA_DEMO = "demo1234"

export function usuarioDemo(email: string) {
  const u = USUARIOS_DEMO.find((x) => x.email === email.trim().toLowerCase())
  if (!u) return null
  return {
    id: uuidDe(`usuario:${u.email}`),
    org: uuidDe(`${SEMILLA_DEMO}:org`),
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    sucursales: u.sucursales ? u.sucursales.map((c) => uuidDe(`${SEMILLA_DEMO}:sucursal:${c}`)) : null,
    requiere2FA: exige2FA(u.rol),
  }
}

/** Comparación en tiempo constante (sobre hashes para igualar longitudes). */
export function contrasenaDemoValida(contrasena: string) {
  const a = createHash("sha256").update(contrasena).digest()
  const b = createHash("sha256").update(CONTRASENA_DEMO).digest()
  return timingSafeEqual(a, b)
}

/** Autenticador TOTP emulado: secreto derivado del email con el secreto del servidor. */
function totpDe(email: string) {
  const bytes = createHmac("sha256", claveFirma()).update(`totp:${email}`).digest().subarray(0, 20)
  return new TOTP({
    issuer: "Yunque demo",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new Secret({ buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer }),
  })
}

export function codigoDemoActual(email: string) {
  const totp = totpDe(email)
  const restante = 30 - (Math.floor(Date.now() / 1000) % 30)
  return { codigo: totp.generate(), segundosRestantes: restante }
}

export function codigoDemoValido(email: string, codigo: string) {
  if (!/^\d{6}$/.test(codigo)) return false
  return totpDe(email).validate({ token: codigo, window: 1 }) !== null
}

export function hashEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
}
