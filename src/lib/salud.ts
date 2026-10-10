import "server-only"
import { erroresUltimaHora } from "./monitoreo"

export type Componente = {
  id: string
  nombre: string
  estado: "operativo" | "degradado" | "caido" | "emulado"
  detalle: string
}

export type EstadoServidor = {
  ok: boolean
  version: string
  modo: "demo" | "supabase"
  momento: string
  /** Errores registrados por el monitoreo en la última hora (en esta instancia). */
  erroresUltimaHora: number
  componentes: Componente[]
}

const VERSION = process.env.npm_package_version ?? "0.1.0"

/**
 * Estado de los componentes del sistema. En modo demo las piezas externas
 * figuran como "emulado": se informa tal cual, sin simular disponibilidad.
 */
export async function estadoServidor(): Promise<EstadoServidor> {
  const conSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const componentes: Componente[] = [
    { id: "app", nombre: "Aplicación web", estado: "operativo", detalle: "Respondiendo" },
  ]

  if (conSupabase) {
    componentes.push(await chequearSupabase())
  } else {
    componentes.push({
      id: "base",
      nombre: "Base de datos y sincronización",
      estado: "emulado",
      detalle: "Modo demo: servidor de sincronización emulado en el navegador",
    })
  }

  componentes.push(
    { id: "arca", nombre: "Facturación electrónica (ARCA)", estado: "emulado", detalle: "Integración emulada" },
    { id: "mercadopago", nombre: "Mercado Pago", estado: "emulado", detalle: "Integración emulada" },
    { id: "whatsapp", nombre: "Avisos por WhatsApp", estado: "emulado", detalle: "Integración emulada" },
  )

  return {
    ok: componentes.every((c) => c.estado !== "caido"),
    version: VERSION,
    modo: conSupabase ? "supabase" : "demo",
    momento: new Date().toISOString(),
    erroresUltimaHora: erroresUltimaHora(),
    componentes,
  }
}

async function chequearSupabase(): Promise<Componente> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const inicio = Date.now()
  try {
    const r = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    })
    const ms = Date.now() - inicio
    if (!r.ok) return { id: "base", nombre: "Base de datos y autenticación", estado: "degradado", detalle: `HTTP ${r.status}` }
    return { id: "base", nombre: "Base de datos y autenticación", estado: ms > 1500 ? "degradado" : "operativo", detalle: `${ms} ms` }
  } catch {
    return { id: "base", nombre: "Base de datos y autenticación", estado: "caido", detalle: "Sin respuesta" }
  }
}
