"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { ACCESO_PANEL } from "@/lib/auth/presentaciones"
import { marcarContactada } from "@/lib/solicitudes"

export type EstadoClave = { error?: string }

export async function entrarPanel(_: EstadoClave, form: FormData): Promise<EstadoClave> {
  const r = await ACCESO_PANEL.entrar(form)
  if (r.error) return r
  redirect("/panel")
}

export async function salirPanel() {
  await ACCESO_PANEL.cerrar()
  redirect("/panel")
}

const esquemaMarca = z.object({ id: z.uuid(), contactada: z.enum(["si", "no"]) })

/** Las server actions son endpoints públicos: se vuelve a verificar la clave acá. */
export async function marcarSolicitud(form: FormData) {
  if (!(await ACCESO_PANEL.tiene())) redirect("/panel")
  const datos = esquemaMarca.safeParse({ id: form.get("id"), contactada: form.get("contactada") })
  if (!datos.success) return
  await marcarContactada(datos.data.id, datos.data.contactada === "si")
  revalidatePath("/panel")
}
