"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { exige2FA } from "@/dominio/permisos"
import type { Rol } from "@/dominio/tipos"
import { codigoDemoValido, contrasenaDemoValida, hashEmail, usuarioDemo } from "@/lib/auth/demo"
import {
  cerrarSesion,
  crearPreSesion,
  crearSesion,
  ipCliente,
  leerPreSesion,
  limitador,
} from "@/lib/auth/servidor"
import { modoActual } from "@/lib/modo"
import { supabaseServidor } from "@/lib/supabase/servidor"

export type EstadoIngreso = { error?: string; email?: string }

const esquemaIngreso = z.object({
  email: z.string().trim().toLowerCase().email("Revisá el email").max(160),
  contrasena: z.string().min(1, "Falta la contraseña").max(200),
  siguiente: z.string().optional(),
})

/** Solo se permite volver a rutas internas de la app (evita redirecciones abiertas). */
function destinoSeguro(siguiente: string | undefined) {
  return siguiente && /^\/app(\/[\w\-/]*)?$/.test(siguiente) ? siguiente : "/app"
}

function textoEspera(segundos: number) {
  const min = Math.ceil(segundos / 60)
  return min > 1 ? `${min} minutos` : "un minuto"
}

export async function ingresar(_: EstadoIngreso, form: FormData): Promise<EstadoIngreso> {
  const datos = esquemaIngreso.safeParse({
    email: form.get("email"),
    contrasena: form.get("contrasena"),
    siguiente: form.get("siguiente") ?? undefined,
  })
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Datos inválidos" }
  const { email, contrasena, siguiente } = datos.data

  const ip = await ipCliente()
  const emailHash = hashEmail(email)
  const lim = limitador()
  const veredicto = await lim.verificar(emailHash, ip)
  if (!veredicto.permitido) {
    return { email, error: `Demasiados intentos. Probá de nuevo en ${textoEspera(veredicto.esperaSegundos)}.` }
  }

  const destino = destinoSeguro(siguiente)

  if (modoActual() === "demo") {
    const u = usuarioDemo(email)
    const ok = contrasenaDemoValida(contrasena) && u !== null
    await lim.registrar(emailHash, ip, ok)
    // Mismo mensaje para email inexistente y contraseña incorrecta.
    if (!ok || !u) return { email, error: "Email o contraseña incorrectos." }
    if (u.requiere2FA) {
      await crearPreSesion({ sub: u.id, email: u.email, rol: u.rol, intentos: 5 })
      redirect(`/ingresar/verificar?siguiente=${encodeURIComponent(destino)}`)
    }
    await crearSesion({ sub: u.id, org: u.org, rol: u.rol, nombre: u.nombre, email: u.email, sucursales: u.sucursales, aal: "aal1", modo: "demo" })
    redirect(destino)
  }

  // ───── Modo Supabase (preparado; no probado contra una instancia real) ─────
  const sb = await supabaseServidor()
  const { data, error } = await sb.auth.signInWithPassword({ email, password: contrasena })
  await lim.registrar(emailHash, ip, !error)
  if (error || !data.user) return { email, error: "Email o contraseña incorrectos." }
  const { data: miembro } = await sb
    .from("miembros")
    .select("org_id, rol, nombre, sucursales")
    .eq("user_id", data.user.id)
    .eq("activo", true)
    .limit(1)
    .maybeSingle()
  // Dueños y administración: la RLS no les devuelve nada hasta tener aal2,
  // así que si no hay fila visible puede ser por falta de doble factor.
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
  if (!miembro || exige2FA(miembro.rol as Rol)) {
    if (aal?.currentLevel !== "aal2") {
      await crearPreSesion({ sub: data.user.id, email, rol: (miembro?.rol as Rol) ?? "dueno", intentos: 5 })
      redirect(`/ingresar/verificar?siguiente=${encodeURIComponent(destino)}`)
    }
  }
  if (!miembro) return { email, error: "Tu usuario no pertenece a ninguna empresa activa." }
  await crearSesion({
    sub: data.user.id,
    org: miembro.org_id,
    rol: miembro.rol as Rol,
    nombre: miembro.nombre,
    email,
    sucursales: miembro.sucursales,
    aal: aal?.currentLevel === "aal2" ? "aal2" : "aal1",
    modo: "supabase",
  })
  redirect(destino)
}

export type EstadoVerificacion = { error?: string }

export async function verificarCodigo(_: EstadoVerificacion, form: FormData): Promise<EstadoVerificacion> {
  const pre = await leerPreSesion()
  if (!pre) redirect("/ingresar?vencida=1")
  const codigo = String(form.get("codigo") ?? "").replace(/\D/g, "")
  const destino = destinoSeguro(String(form.get("siguiente") ?? ""))

  const ip = await ipCliente()
  const lim = limitador()
  const clave = `2fa:${pre.sub}`
  const veredicto = await lim.verificar(clave, ip)
  if (!veredicto.permitido) return { error: `Demasiados códigos incorrectos. Esperá ${textoEspera(veredicto.esperaSegundos)}.` }

  if (modoActual() === "demo") {
    const ok = codigoDemoValido(pre.email, codigo)
    await lim.registrar(clave, ip, ok)
    if (!ok) return { error: "Código incorrecto o vencido." }
    const u = usuarioDemo(pre.email)!
    await crearSesion({ sub: u.id, org: u.org, rol: u.rol, nombre: u.nombre, email: u.email, sucursales: u.sucursales, aal: "aal2", modo: "demo" })
    redirect(destino)
  }

  // Supabase MFA (TOTP)
  const sb = await supabaseServidor()
  const { data: factores } = await sb.auth.mfa.listFactors()
  const totp = factores?.totp?.[0]
  if (!totp) redirect(`/ingresar/verificar?enrolar=1&siguiente=${encodeURIComponent(destino)}`)
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: totp.id, code: codigo })
  await lim.registrar(clave, ip, !error)
  if (error) return { error: "Código incorrecto o vencido." }
  const { data: miembro } = await sb
    .from("miembros")
    .select("org_id, rol, nombre, sucursales")
    .eq("user_id", pre.sub)
    .eq("activo", true)
    .limit(1)
    .maybeSingle()
  if (!miembro) return { error: "Tu usuario no pertenece a ninguna empresa activa." }
  await crearSesion({
    sub: pre.sub,
    org: miembro.org_id,
    rol: miembro.rol as Rol,
    nombre: miembro.nombre,
    email: pre.email,
    sucursales: miembro.sucursales,
    aal: "aal2",
    modo: "supabase",
  })
  redirect(destino)
}

export async function salir() {
  if (modoActual() === "supabase") {
    const sb = await supabaseServidor()
    await sb.auth.signOut()
  }
  await cerrarSesion()
  redirect("/ingresar")
}
