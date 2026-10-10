import type { EstadoServicio } from "@/dominio/tipos"
import type { EstadoBloque } from "@/forja/dominio/plano"

/**
 * Paleta del taller: materiales monocromos (hormigón, grafito, acero) y el
 * color solo como emisión (estado, calor, chispas). --temple queda para el
 * contorno de selección y foco.
 */
export const COLOR = {
  fondo: "#0e1116",
  losa: "#1a1f27",
  losaCanto: "#11151b",
  piso: "#1f252e",
  lineaPiso: "#2c343f",
  pared: "#262d36",
  corte: "#4a5361",
  estructura: "#4a5361",
  estante: "#333b46",
  mueble: "#2c343f",
  tapa: "#3a4450",
  equipo: "#7d8692",
  caja: "#6f747b",
  palet: "#2a2f36",
  frio: "#6b7684",
  temple: "#3b6ef5",
  chispa: "#ffb224",
  ascua: "#c2410c",
  brasa: "#ff6a1f",
  blancoCaliente: "#fff4e0",
  acero: "#9aa3ae",
  pantalla: "#c9d4e2",
} as const

export const COLOR_BLOQUE: Record<EstadoBloque, string> = {
  normal: COLOR.frio,
  critico: COLOR.chispa,
  sin_stock: COLOR.ascua,
}

/** Luz de estado de cada orden en el banco (la máquina en sí es acero). */
export const LUZ_SERVICIO: Record<EstadoServicio, { color: string; intensidad: number }> = {
  ingresado: { color: COLOR.acero, intensidad: 0.25 },
  diagnostico: { color: COLOR.acero, intensidad: 0.6 },
  esperando_aprobacion: { color: COLOR.chispa, intensidad: 0.7 },
  en_reparacion: { color: COLOR.brasa, intensidad: 1 },
  listo: { color: COLOR.blancoCaliente, intensidad: 0.9 },
  sin_reparacion: { color: COLOR.frio, intensidad: 0.2 },
  entregado: { color: COLOR.frio, intensidad: 0 },
}

/** Una orden lleva dos semanas o más en el banco: la barra de tiempo se llena. */
export const HORAS_BARRA_LLENA = 14 * 24
