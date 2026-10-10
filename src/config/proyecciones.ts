/**
 * Proyecciones para la presentación de inversores.
 *
 * IMPORTANTE: no son datos, son SUPUESTOS editables. La presentación muestra
 * siempre la fórmula y los supuestos junto al resultado. No hay clientes
 * pagando todavía; cualquier número de clientes es hipotético.
 *
 * Ingreso mensual recurrente (MRR) = negocios activos × licencia mensual
 * Ingreso por implementación = negocios nuevos × implementación promedio
 */
export const SUPUESTOS = {
  licenciaMensualUSD: 290,
  implementacionPromedioUSD: 1500, // [COMPLETAR: validar con el primer piloto]
  churnMensual: 0.02,
  /** Negocios nuevos por trimestre: escenario ilustrativo, NO un pronóstico. */
  negociosNuevosPorTrimestre: [1, 3, 5, 8, 10, 12, 14, 16],
  etiqueta: "Escenario ilustrativo con supuestos editables",
} as const

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
