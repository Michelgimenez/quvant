import "server-only"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/**
 * Cliente de Supabase del lado servidor con la sesión del usuario (cookies).
 * Usa la clave anónima: todo lo que lee pasa por RLS.
 * Solo existe en modo "supabase" (ver src/lib/modo.ts).
 */
export async function supabaseServidor() {
  const almacen = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        for (const { name, value, options } of lista) almacen.set(name, value, options)
      },
    },
  })
}

/**
 * Cliente con service_role. SOLO para funciones de servidor que lo necesitan
 * (límite de intentos de ingreso). Nunca se expone al navegador.
 */
export function supabaseServicio() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!clave) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
