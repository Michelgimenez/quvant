import type { Id } from "@/dominio/tipos"
import type { EventoForja, RedForja, TallerForja } from "@/forja/dominio/modelo"
import type { HistoriaMaquina, Pieza, RecorridoProducto } from "@/forja/dominio/pieza"

export type DatosPieza = { tipo: "producto"; recorrido: RecorridoProducto } | { tipo: "maquina"; historia: HistoriaMaquina }

/**
 * Lo que necesita el universo de Forja, venga de donde venga:
 * - app (estado de Quvant en el navegador, simulador si la empresa es demo),
 * - demo pública (snapshot + simulador en el navegador, sin base),
 * - Supabase (funciones forja_* y canales privados por sucursal; preparado).
 */
export type FuenteForja = {
  red: RedForja
  /** La red tal como estaba a otra hora del día (repetición). */
  redEn: (t: Date) => RedForja
  /** Eventos del día hasta ahora (línea de tiempo y animación de lo nuevo). */
  eventos: EventoForja[]
  taller: (sucursalId: Id) => TallerForja | null
  /** Nivel 3: el recorrido de un producto o la historia de una máquina (null si no existe o no se puede ver). */
  pieza: (p: Pieza) => DatosPieza | null
  /** Sello SIMULACIÓN (eventos generados para la demo). */
  simulacion: boolean
  /** Sello PROPUESTA (demo comercial para un prospecto). */
  propuesta: boolean
  /** Enlaces a los módulos de Quvant (solo dentro de la app). */
  enlaces: EnlacesForja | null
  /** Demos públicas: milisegundos que se suman al reloj real (la demo vive en la hora de su snapshot). */
  desfase?: number
}

export type EnlacesForja = {
  /** Inventario (de una sucursal o de todas), filtrado por rack ("HE-A"), producto o estado de stock. */
  inventario: (sucursalId: Id | null, filtro?: { rack?: string; producto?: Id; stock?: "sin" | "bajo" }) => string
  /** Una orden de servicio, o el tablero si no se indica. */
  servicio: (ordenId?: Id) => string
  presupuestos: () => string
  entregas: () => string
  mostrador: () => string
}
