"use client"

import type { Sesion } from "@/lib/auth/tipos"

const CLAVE = "yunque:sesion"

/**
 * Obtiene la sesión del servidor. Sin conexión usa la última copia guardada
 * mientras no haya vencido: así el mostrador abre aunque no haya internet.
 * La copia no contiene secretos (la cookie firmada es httpOnly).
 */
export async function obtenerSesion(): Promise<{ sesion: Sesion; sinConexion: boolean } | { sesion: null; motivo: "sin_sesion" | "sin_conexion" }> {
  try {
    const r = await fetch("/api/sesion", { cache: "no-store", credentials: "same-origin" })
    if (r.status === 401) {
      borrar()
      return { sesion: null, motivo: "sin_sesion" }
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const sesion = (await r.json()) as Sesion
    try {
      localStorage.setItem(CLAVE, JSON.stringify(sesion))
    } catch {
      /* sin almacenamiento */
    }
    return { sesion, sinConexion: false }
  } catch {
    const guardada = leer()
    if (guardada && guardada.exp * 1000 > Date.now()) return { sesion: guardada, sinConexion: true }
    return { sesion: null, motivo: "sin_conexion" }
  }
}

function leer(): Sesion | null {
  try {
    const s = localStorage.getItem(CLAVE)
    return s ? (JSON.parse(s) as Sesion) : null
  } catch {
    return null
  }
}

export function borrar() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    /* nada */
  }
}
