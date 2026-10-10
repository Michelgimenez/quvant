/**
 * Modo de ejecución.
 * - "demo": sin Supabase configurado. Datos de la empresa demo en el navegador,
 *   servidor de sincronización emulado, usuarios de prueba y 2FA emulado.
 * - "supabase": con NEXT_PUBLIC_SUPABASE_URL y ANON_KEY. Auth, datos y RLS reales.
 */
export type Modo = "demo" | "supabase"

export function modoActual(): Modo {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "demo"
}

export const ES_DEMO = modoActual() === "demo"
