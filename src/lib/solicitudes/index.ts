import "server-only"
import { createClient } from "@supabase/supabase-js"
import { BASE_LOCAL_TEMPORAL, baseLocal } from "@/lib/base-local"
import { modoActual } from "@/lib/modo"
import { supabaseServicio } from "@/lib/supabase/servidor"
import { insertarSolicitud, listarSolicitudes, marcarSolicitud, type NuevaSolicitud, type Solicitud } from "./postgres"

export type { NuevaSolicitud, Solicitud } from "./postgres"

/**
 * Dónde se guardan las solicitudes de "Pedir una demo":
 * - con Supabase: public.solicitudes_demo (el sitio inserta con la clave anónima;
 *   el panel lee con service_role, solo del lado servidor);
 * - sin Supabase: la base local de desarrollo (mismo esquema y mismas reglas).
 */
export function destinoSolicitudes() {
  if (modoActual() === "supabase") return "Supabase · tabla solicitudes_demo"
  if (BASE_LOCAL_TEMPORAL) return "base temporal del servidor de Vercel (se borra al reciclarse y cada instancia tiene la suya; para guardarlas de verdad hay que configurar Supabase)"
  return "Base local de desarrollo · .data/base-local (tabla solicitudes_demo)"
}

export async function guardarSolicitud(s: NuevaSolicitud) {
  if (modoActual() === "supabase") {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
    const { error } = await sb.from("solicitudes_demo").insert(s)
    if (error) throw new Error(error.message)
    return
  }
  await insertarSolicitud(await baseLocal(), s)
}

export async function solicitudes(): Promise<Solicitud[]> {
  if (modoActual() === "supabase") {
    const sb = supabaseServicio()
    if (!sb) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para leer las solicitudes.")
    const { data, error } = await sb
      .from("solicitudes_demo")
      .select("id, nombre, negocio, rubro, sucursales, sistema_actual, whatsapp, socio_fundador, origen, creada_en, contactada_en")
      .order("contactada_en", { ascending: false, nullsFirst: true })
      .order("creada_en", { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return data as Solicitud[]
  }
  return listarSolicitudes(await baseLocal())
}

export async function marcarContactada(id: string, contactada: boolean) {
  if (modoActual() === "supabase") {
    const sb = supabaseServicio()
    if (!sb) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para actualizar las solicitudes.")
    const { error } = await sb
      .from("solicitudes_demo")
      .update({ contactada_en: contactada ? new Date().toISOString() : null })
      .eq("id", id)
    if (error) throw new Error(error.message)
    return
  }
  await marcarSolicitud(await baseLocal(), id, contactada)
}
