"use server"

import { redirect } from "next/navigation"
import { ACCESO_INVERSORES } from "@/lib/auth/presentaciones"

export type EstadoClave = { error?: string }

export async function entrarInversores(_: EstadoClave, form: FormData): Promise<EstadoClave> {
  const r = await ACCESO_INVERSORES.entrar(form)
  if (r.error) return r
  redirect("/inversores")
}

export async function salirInversores() {
  await ACCESO_INVERSORES.cerrar()
  redirect("/inversores")
}
