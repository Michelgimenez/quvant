import type { Id } from "@/dominio/tipos"
import type { EventoForja, RedForja, TallerForja } from "@/forja/dominio/modelo"

/**
 * Lo que necesita el universo de Forja, venga de donde venga:
 * - app (estado de Yunque en el navegador, simulador si la empresa es demo),
 * - demo pública (snapshot + simulador en el navegador, sin base),
 * - Supabase (funciones forja_* y canales privados por sucursal; preparado).
 */
export type FuenteForja = {
  red: RedForja
  /** Eventos del día hasta ahora (línea de tiempo y animación de lo nuevo). */
  eventos: EventoForja[]
  taller: (sucursalId: Id) => TallerForja | null
  /** Sello SIMULACIÓN (eventos generados para la demo). */
  simulacion: boolean
  /** Sello PROPUESTA (demo comercial para un prospecto). */
  propuesta: boolean
  /** Enlaces a los módulos de Yunque (solo dentro de la app). */
  enlaces: EnlacesForja | null
}

export type EnlacesForja = {
  /** Inventario de la sucursal, filtrado por rack ("HE-A"), producto o estado de stock. */
  inventario: (sucursalId: Id, filtro?: { rack?: string; producto?: Id; stock?: "sin" | "bajo" }) => string
  /** Una orden de servicio, o el tablero si no se indica. */
  servicio: (ordenId?: Id) => string
  presupuestos: () => string
  entregas: () => string
  mostrador: () => string
}
