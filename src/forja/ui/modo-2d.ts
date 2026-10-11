"use client"

import { useCallback, useState } from "react"

/**
 * Versión 2D completa (mapa SVG y plano de planta): se usa con movimiento
 * reducido o en hardware bajo, que el documento define así: menos de 4
 * núcleos, ahorro de datos activo o un navegador sin WebGL2. La persona puede
 * forzar una u otra (se recuerda en este navegador).
 */
export type Modo2D = { activo: boolean; motivo: string | null; elegido: "2d" | "3d" | null }

const CLAVE = "forja.vista"

function sinWebGL2() {
  try {
    const c = document.createElement("canvas")
    const gl = c.getContext("webgl2")
    if (!gl) return true
    gl.getExtension("WEBGL_lose_context")?.loseContext()
    return false
  } catch {
    return true
  }
}

/** Por qué conviene la versión 2D en este equipo (null: puede ir la 3D). */
export function motivo2D(): string | null {
  if (typeof window === "undefined") return null
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "Movimiento reducido"
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return "Ahorro de datos"
  if ((nav.hardwareConcurrency ?? 8) < 4) return "Equipo con pocos núcleos"
  if (sinWebGL2()) return "Sin WebGL2"
  return null
}

function leerElegido(): "2d" | "3d" | null {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === "2d" || v === "3d" ? v : null
  } catch {
    return null
  }
}

/** Si este navegador va a ver la versión 2D (por elección o por el equipo). */
export function usaVersion2D() {
  const elegido = leerElegido()
  return elegido ? elegido === "2d" : motivo2D() !== null
}

export function useModo2D() {
  const [motivo] = useState(motivo2D)
  const [elegido, setElegido] = useState(leerElegido)
  const activo = elegido ? elegido === "2d" : motivo !== null
  const alternar = useCallback(() => {
    const nuevo = activo ? "3d" : "2d"
    setElegido(nuevo)
    try {
      localStorage.setItem(CLAVE, nuevo)
    } catch {
      /* sin almacenamiento: vale para esta visita */
    }
  }, [activo])
  return { activo, motivo, elegido, alternar }
}
