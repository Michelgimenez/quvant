import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { hashEmail } from "./demo"
import { firmar, verificar } from "./firma"
import { ipCliente, limitador } from "./servidor"

/**
 * Áreas privadas con una clave compartida (presentación para inversores y
 * panel interno). Si la clave es correcta queda una cookie firmada httpOnly,
 * SameSite=Strict, válida solo bajo la ruta del área, por 8 horas.
 *
 * En desarrollo, sin la variable de entorno se usa una clave fija conocida.
 * En producción, sin la variable el área queda cerrada.
 */
const DURACION_S = 8 * 60 * 60

type ConfigAcceso = {
  cookie: string
  audiencia: string
  ruta: string
  /** Variable de entorno con la clave. */
  variable: string
  claveDesarrollo: string
}

/** Comparación en tiempo constante (sobre hashes del mismo largo). */
export function claveCorrecta(intento: string, clave: string) {
  const a = createHash("sha256").update(intento, "utf8").digest()
  const b = createHash("sha256").update(clave, "utf8").digest()
  return timingSafeEqual(a, b)
}

export function accesoConClave(c: ConfigAcceso) {
  const clave = (): string | null => {
    const k = process.env[c.variable]?.trim()
    if (k) return k
    return process.env.NODE_ENV === "production" ? null : c.claveDesarrollo
  }

  async function tiene() {
    if (!clave()) return false
    const almacen = await cookies()
    return (await verificar(almacen.get(c.cookie)?.value, c.audiencia)) !== null
  }

  async function crear() {
    const token = await firmar({ p: c.audiencia }, DURACION_S, c.audiencia)
    const almacen = await cookies()
    almacen.set(c.cookie, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: c.ruta, maxAge: DURACION_S })
  }

  async function cerrar() {
    const almacen = await cookies()
    almacen.delete({ name: c.cookie, path: c.ruta })
  }

  /** Valida la clave del formulario. Límite de intentos por IP: nadie puede bloquear la clave para todos. */
  async function entrar(form: FormData): Promise<{ error?: string }> {
    const k = clave()
    if (!k) return { error: "Esta sección no está habilitada en este entorno." }
    const ip = await ipCliente()
    const id = hashEmail(`${c.audiencia}:${ip}`)
    const lim = limitador()
    const veredicto = await lim.verificar(id, ip)
    if (!veredicto.permitido) return { error: "Demasiados intentos. Probá de nuevo en unos minutos." }
    const intento = String(form.get("clave") ?? "").slice(0, 200)
    const ok = intento.length > 0 && claveCorrecta(intento, k)
    await lim.registrar(id, ip, ok)
    if (!ok) return { error: "Clave incorrecta." }
    await crear()
    return {}
  }

  return { clave, tiene, cerrar, entrar }
}

export const ACCESO_INVERSORES = accesoConClave({
  cookie: "yunque_inversores",
  audiencia: "yunque-inversores",
  ruta: "/inversores",
  variable: "INVERSORES_KEY",
  claveDesarrollo: "yunque-demo",
})

/** Panel interno del equipo de Yunque (solicitudes de demo: datos personales). */
export const ACCESO_PANEL = accesoConClave({
  cookie: "yunque_panel",
  audiencia: "yunque-panel",
  ruta: "/panel",
  variable: "PANEL_KEY",
  claveDesarrollo: "yunque-panel",
})
