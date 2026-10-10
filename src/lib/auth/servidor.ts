import "server-only"
import { cookies, headers } from "next/headers"
import { modoActual } from "@/lib/modo"
import { supabaseServicio } from "@/lib/supabase/servidor"
import { firmar, verificar } from "./firma"
import { LimitadorMemoria, type LimitadorIngreso, type Veredicto } from "./limitador"
import {
  COOKIE_PRE_SESION,
  COOKIE_SESION,
  DURACION_PRE_SESION_S,
  DURACION_SESION_S,
  type PreSesion,
  type Sesion,
} from "./tipos"

const AUD_SESION = "yunque-app"
const AUD_PRE = "yunque-2fa"

const opcionesCookie = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
})

export async function crearSesion(datos: Omit<Sesion, "exp">) {
  const token = await firmar(datos, DURACION_SESION_S, AUD_SESION)
  const almacen = await cookies()
  almacen.set(COOKIE_SESION, token, opcionesCookie(DURACION_SESION_S))
  almacen.delete(COOKIE_PRE_SESION)
}

export async function leerSesion(): Promise<Sesion | null> {
  const almacen = await cookies()
  return verificarSesion(almacen.get(COOKIE_SESION)?.value)
}

export function verificarSesion(token: string | undefined) {
  return verificar<Sesion>(token, AUD_SESION)
}

export async function crearPreSesion(datos: Omit<PreSesion, "exp">) {
  const token = await firmar(datos, DURACION_PRE_SESION_S, AUD_PRE)
  const almacen = await cookies()
  almacen.set(COOKIE_PRE_SESION, token, opcionesCookie(DURACION_PRE_SESION_S))
}

export async function leerPreSesion() {
  const almacen = await cookies()
  return verificar<PreSesion>(almacen.get(COOKIE_PRE_SESION)?.value, AUD_PRE)
}

export async function cerrarSesion() {
  const almacen = await cookies()
  almacen.delete(COOKIE_SESION)
  almacen.delete(COOKIE_PRE_SESION)
}

/** IP del cliente según el proxy de la plataforma (primer valor de x-forwarded-for). */
export async function ipCliente() {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local"
}

// ───────── Límite de intentos ─────────

class LimitadorSupabase implements LimitadorIngreso {
  async verificar(emailHash: string, ip: string): Promise<Veredicto> {
    const sb = supabaseServicio()
    if (!sb) return limitadorMemoria().verificar(emailHash, ip)
    const { data, error } = await sb.schema("app").rpc("ingreso_permitido", { p_email_hash: emailHash, p_ip: ip })
    if (error || !data) return { permitido: false, esperaSegundos: 30 } // ante la duda, frenar
    const r = data as { permitido: boolean; espera_segundos?: number; restantes?: number }
    return r.permitido ? { permitido: true, restantes: r.restantes ?? 5 } : { permitido: false, esperaSegundos: r.espera_segundos ?? 60 }
  }
  async registrar(emailHash: string, ip: string, exito: boolean) {
    const sb = supabaseServicio()
    if (!sb) return limitadorMemoria().registrar(emailHash, ip, exito)
    await sb.schema("app").rpc("registrar_ingreso", { p_email_hash: emailHash, p_ip: ip, p_exito: exito })
  }
}

const global = globalThis as unknown as { __limitadorYunque?: LimitadorMemoria }
function limitadorMemoria() {
  global.__limitadorYunque ??= new LimitadorMemoria()
  return global.__limitadorYunque
}

export function limitador(): LimitadorIngreso {
  return modoActual() === "supabase" ? new LimitadorSupabase() : limitadorMemoria()
}
