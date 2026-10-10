import { headers } from "next/headers"
import { registrarEnServidor, sanear } from "@/lib/monitoreo"

const ventana = new Map<string, number[]>()

/** Recibe errores del navegador. Límite: 30 por minuto por IP, 8 KB por reporte. */
export async function POST(req: Request) {
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  const ahora = Date.now()
  const marcas = (ventana.get(ip) ?? []).filter((t) => t > ahora - 60_000)
  if (marcas.length >= 30) return new Response(null, { status: 429 })
  marcas.push(ahora)
  ventana.set(ip, marcas)

  const texto = await req.text()
  if (texto.length > 8192) return new Response(null, { status: 413 })
  try {
    const datos = JSON.parse(texto) as Record<string, unknown>
    await registrarEnServidor(sanear({ ...datos, origen: "cliente" } as never))
  } catch {
    return new Response(null, { status: 400 })
  }
  return new Response(null, { status: 204 })
}
