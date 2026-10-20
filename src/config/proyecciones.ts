import { PRECIOS, type Plan, type PlanId } from "./precios"
import { ES_COMPLETAR } from "./sitio"

/**
 * Proyecciones para la presentación de inversores.
 *
 * IMPORTANTE: no son datos, son SUPUESTOS editables. La presentación muestra
 * siempre la fórmula y los supuestos junto al resultado. No hay clientes
 * pagando todavía; cualquier número de clientes es hipotético.
 *
 * Ingreso mensual recurrente (MRR) = Σ por plan (negocios activos del plan × licencia del plan)
 * Ingreso por implementación = negocios nuevos × implementación promedio
 *
 * Mientras algún precio de src/config/precios.ts sea [COMPLETAR], la presentación muestra solo la fórmula,
 * sin números (licenciaPromedioUSD() devuelve null).
 */
export const SUPUESTOS = {
  /** Qué parte de los negocios nuevos entra por cada plan (suma 1). Supuesto ilustrativo. */
  mezclaPlanes: { kiosco: 0.4, comercio: 0.35, distribuidora: 0.15, empresa: 0.1 } satisfies Record<PlanId, number>,
  implementacionPromedioUSD: 1500, // [COMPLETAR: validar con el primer piloto]
  churnMensual: 0.02,
  /** Negocios nuevos por trimestre: escenario ilustrativo, NO un pronóstico. */
  negociosNuevosPorTrimestre: [1, 3, 5, 8, 10, 12, 14, 16],
  etiqueta: "Escenario ilustrativo con supuestos editables",
} as const

/** La licencia mensual promedio según la mezcla de planes, o null mientras falte algún precio. */
export function licenciaPromedioUSD(planes: readonly Plan[] = PRECIOS.planes): number | null {
  let total = 0
  for (const p of planes) {
    if (ES_COMPLETAR.test(p.precioMensual)) return null
    const valor = Number(p.precioMensual.replace(/[^\d.,]/g, "").replace(",", "."))
    if (!Number.isFinite(valor) || valor <= 0) return null
    total += valor * SUPUESTOS.mezclaPlanes[p.id]
  }
  return Math.round(total)
}

export type Trimestre = {
  trimestre: number
  nuevos: number
  activos: number
  mrrUSD: number
  implementacionUSD: number
}

/** Proyección trimestral a partir de los supuestos. Pura y testeada. */
export function proyectar(s: {
  licenciaMensualUSD: number
  implementacionPromedioUSD: number
  churnMensual: number
  negociosNuevosPorTrimestre: readonly number[]
}): Trimestre[] {
  let activos = 0
  return s.negociosNuevosPorTrimestre.map((nuevos, i) => {
    const retencionTrimestral = Math.pow(1 - s.churnMensual, 3)
    activos = activos * retencionTrimestral + nuevos
    return {
      trimestre: i + 1,
      nuevos,
      activos: Math.round(activos * 10) / 10,
      mrrUSD: Math.round(activos * s.licenciaMensualUSD),
      implementacionUSD: nuevos * s.implementacionPromedioUSD,
    }
  })
}
