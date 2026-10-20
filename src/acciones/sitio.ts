"use server"

import { headers } from "next/headers"
import { z } from "zod"
import { RUBROS, TAMANOS } from "@/config/sitio"
import { guardarSolicitud } from "@/lib/solicitudes"

export type EstadoSolicitud = { ok?: boolean; error?: string; errores?: Partial<Record<string, string>> }


const esquema = z.object({
  nombre: z.string().trim().min(2, "Contanos tu nombre").max(120),
  negocio: z.string().trim().min(2, "¿Cómo se llama el negocio?").max(160),
  rubro: z.enum(RUBROS, { message: "Elegí un rubro" }),
  tamano: z.enum(TAMANOS, { message: "Elegí el tamaño" }),
  sucursales: z.coerce.number({ message: "Indicá cuántas sucursales" }).int().min(1, "Al menos 1").max(500),
  sistemaActual: z.string().trim().max(160).default(""),
  whatsapp: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/, "Revisá el número (con característica)"),
  origen: z.enum(["sitio", "socios", "demo"]).default("sitio"),
})

const intentos = new Map<string, number[]>()

/**
 * Formulario "Pedir una demo" / socios fundadores. Se guarda en la tabla
 * solicitudes_demo (Supabase, o la base local en modo demo; ver src/lib/solicitudes)
 * y el equipo la ve en /panel.
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
    // El tamaño viaja con el rubro (la tabla no tiene columna propia; ver TAMANOS en src/config/sitio.ts).
    rubro: `${d.rubro} · ${d.tamano}`,
    sucursales: d.sucursales,
    sistema_actual: d.sistemaActual,
    whatsapp: d.whatsapp,
    socio_fundador: d.origen === "socios",
    origen: d.origen,
  }

  try {
    await guardarSolicitud(fila)
  } catch (e) {
    console.error(JSON.stringify({ nivel: "error", servicio: "quvant", evento: "solicitud_demo", mensaje: (e as Error).message }))
    return { error: "No pudimos guardar tu solicitud. Probá de nuevo en un rato." }
  }
  return { ok: true }
}
