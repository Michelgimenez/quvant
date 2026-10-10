import { connection } from "next/server"
import { estadoServidor } from "@/lib/salud"

/** Chequeo de salud para la página de estado, monitoreo externo y los tests. */
export async function GET() {
  await connection()
  const estado = await estadoServidor()
  return Response.json(estado, {
    status: estado.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  })
}
