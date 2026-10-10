"use server"

import { appendFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { headers } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { RUBROS } from "@/config/sitio"
import { modoActual } from "@/lib/modo"

export type EstadoSolicitud = { ok?: boolean; error?: string; errores?: Partial<Record<string, string>> }


const esquema = z.object({
  nombre: z.string().trim().min(2, "Contanos tu nombre").max(120),
  negocio: z.string().trim().min(2, "¿Cómo se llama el negocio?").max(160),
  rubro: z.enum(RUBROS, { message: "Elegí un rubro" }),
  sucursales: z.coerce.number({ message: "Indicá cuántas sucursales" }).int().min(1, "Al menos 1").max(500),
  sistemaActual: z.string().trim().max(160).default(""),
  whatsapp: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/, "Revisá el número (con característica)"),
  origen: z.enum(["sitio", "socios", "demo"]).default("sitio"),
})

const intentos = new Map<string, number[]>()

/**
 * Formulario "Pedir una demo" / socios fundadores.
 * Con Supabase: se guarda en public.solicitudes_demo (anon solo puede insertar).
 * Sin Supabase (modo demo): se guarda en .data/solicitudes-demo.jsonl.
 */
export async function pedirDemo(_: EstadoSolicitud, form: FormData): Promise<EstadoSolicitud> {
  // Campo trampa: los bots lo completan, las personas no lo ven.
  if (String(form.get("sitio_web") ?? "").trim()) return { ok: true }

  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  const ahora = Date.now()
  const marcas = (intentos.get(ip) ?? []).filter((t) => t > ahora - 10 * 60_000)
  if (marcas.length >= 5) return { error: "Recibimos varias solicitudes desde tu conexión. Probá de nuevo en unos minutos." }
  marcas.push(ahora)
  intentos.set(ip, marcas)

  const datos = esquema.safeParse(Object.fromEntries(form.entries()))
  if (!datos.success) {
    const errores: Record<string, string> = {}
    for (const i of datos.error.issues) errores[String(i.path[0])] ??= i.message
    return { errores }
  }
  const d = datos.data
  const fila = {
    nombre: d.nombre,
    negocio: d.negocio,
    rubro: d.rubro,
    sucursales: d.sucursales,
    sistema_actual: d.sistemaActual,
    whatsapp: d.whatsapp,
    socio_fundador: d.origen === "socios",
    origen: d.origen,
  }

  try {
    if (modoActual() === "supabase") {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
      const { error } = await sb.from("solicitudes_demo").insert(fila)
      if (error) throw error
    } else {
      const dir = path.join(process.cwd(), ".data")
      await mkdir(dir, { recursive: true })
      await appendFile(path.join(dir, "solicitudes-demo.jsonl"), JSON.stringify({ ...fila, creada_en: new Date().toISOString() }) + "\n", "utf8")
    }
  } catch (e) {
    console.error(JSON.stringify({ nivel: "error", servicio: "yunque", evento: "solicitud_demo", mensaje: (e as Error).message }))
    return { error: "No pudimos guardar tu solicitud. Probá de nuevo en un rato." }
  }
  return { ok: true }
}
