import { leerSesion } from "@/lib/auth/servidor"

/**
 * Datos de la sesión actual para la app (cliente). La cookie es httpOnly:
 * el navegador no puede leerla, así que la app pregunta acá y guarda una
 * copia en IndexedDB para poder abrir sin conexión hasta que venza.
 */
export async function GET() {
  const sesion = await leerSesion()
  if (!sesion) return Response.json({ error: "sin_sesion" }, { status: 401, headers: { "Cache-Control": "no-store" } })
  return Response.json(sesion, { headers: { "Cache-Control": "no-store" } })
}
