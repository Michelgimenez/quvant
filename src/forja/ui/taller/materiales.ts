import type { EstadoServicio } from "@/dominio/tipos"
import type { EstadoBloque } from "@/forja/dominio/plano"

/**
 * Paleta del taller: el negro y blanco de Quvant. Materiales monocromos con la escala de grises de la marca
 * (sin el azul ni los naranjas de Yunque). El color aparece solo como dato: los estados (alerta y error, los
 * mismos de la app) y la escala de calor de la actividad (src/forja/dominio/calor.ts, la única excepción).
 * La selección y el foco van en blanco.
 */
export const COLOR = {
  fondo: "#0d0d0f",
  losa: "#141416",
  losaCanto: "#0d0d0f",
  piso: "#1c1c1f",
  lineaPiso: "#26262b",
  pared: "#1c1c1f",
  corte: "#3a3a40",
  estructura: "#3a3a40",
  estante: "#2e2e33",
  mueble: "#26262b",
  tapa: "#3a3a40",
  equipo: "#8d8d94",
  caja: "#6e6e75",
  palet: "#26262b",
  frio: "#55555b",
  /** La selección y el foco (era el azul temple de Yunque). */
  temple: "#ececee",
  /** Estado de alerta (stock crítico, esperando aprobación): el mismo de la app. */
  chispa: "#d7ac68",
  /** Estado de error (sin stock). */
  ascua: "#e18881",
  /** En reparación: lo que está trabajando. */
  brasa: "#d7ac68",
  /** Listo: blanco. */
  blancoCaliente: "#ececee",
  acero: "#9c9ca3",
  pantalla: "#cdcdd1",
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
