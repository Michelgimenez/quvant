import { codigoDemoActual } from "@/lib/auth/demo"
import { leerPreSesion } from "@/lib/auth/servidor"
import { modoActual } from "@/lib/modo"

/**
 * SOLO MODO DEMO: devuelve el código vigente del autenticador emulado a quien
 * ya pasó la contraseña (tiene pre-sesión). En modo Supabase no existe (404).
 */
export async function GET() {
  if (modoActual() !== "demo") return new Response(null, { status: 404 })
  const pre = await leerPreSesion()
  if (!pre) return Response.json({ error: "sin_pre_sesion" }, { status: 401 })
  return Response.json(codigoDemoActual(pre.email), { headers: { "Cache-Control": "no-store" } })
}
