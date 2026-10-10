"use server"

import { redirect } from "next/navigation"
import { hashEmail } from "@/lib/auth/demo"
import { claveCorrecta, claveInversores, cerrarAccesoInversores, crearAccesoInversores } from "@/lib/auth/presentaciones"
import { ipCliente, limitador } from "@/lib/auth/servidor"

export type EstadoClave = { error?: string }

export async function entrarInversores(_: EstadoClave, form: FormData): Promise<EstadoClave> {
  const clave = claveInversores()
  if (!clave) return { error: "La presentación no está habilitada en este entorno." }

  // El contador va por IP: así nadie puede bloquear la clave para todos.
  const ip = await ipCliente()
  const id = hashEmail(`presentacion-inversores:${ip}`)
  const lim = limitador()
  const veredicto = await lim.verificar(id, ip)
  if (!veredicto.permitido) return { error: "Demasiados intentos. Probá de nuevo en unos minutos." }

  const intento = String(form.get("clave") ?? "").slice(0, 200)
  const ok = intento.length > 0 && claveCorrecta(intento, clave)
  await lim.registrar(id, ip, ok)
  if (!ok) return { error: "Clave incorrecta." }

  await crearAccesoInversores()
  redirect("/inversores")
}

export async function salirInversores() {
  await cerrarAccesoInversores()
  redirect("/inversores")
}
