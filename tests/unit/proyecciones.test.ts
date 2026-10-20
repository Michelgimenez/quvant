import { describe, expect, it } from "vitest"
import { PRECIOS } from "@/config/precios"
import { licenciaPromedioUSD, proyectar } from "@/config/proyecciones"

describe("proyecciones (supuestos editables)", () => {
  it("sin churn, el MRR es la suma acumulada de negocios × licencia", () => {
    const r = proyectar({
      licenciaMensualUSD: 100,
      implementacionPromedioUSD: 1000,
      churnMensual: 0,
      negociosNuevosPorTrimestre: [1, 2, 3],
    })
    expect(r.map((t) => t.activos)).toEqual([1, 3, 6])
    expect(r.map((t) => t.mrrUSD)).toEqual([100, 300, 600])
    expect(r.map((t) => t.implementacionUSD)).toEqual([1000, 2000, 3000])
  })

  it("con churn, los activos se reducen trimestre a trimestre", () => {
    const r = proyectar({
      licenciaMensualUSD: 100,
      implementacionPromedioUSD: 0,
      churnMensual: 0.1,
      negociosNuevosPorTrimestre: [10, 0],
    })
    expect(r[1].activos).toBeCloseTo(10 * 0.9 ** 3, 1)
  })

  it("sin precios cargados no hay números: solo la fórmula (nada de los USD 290 de Yunque)", () => {
    const sinPrecio = PRECIOS.planes.map((p, i) => (i === 0 ? { ...p, precioMensual: "[COMPLETAR: precio]" } : { ...p, precioMensual: "50" }))
    expect(licenciaPromedioUSD(sinPrecio)).toBeNull()
    const conPrecios = PRECIOS.planes.map((p) => ({ ...p, precioMensual: "100" }))
    expect(licenciaPromedioUSD(conPrecios)).toBe(100)
  })
})
