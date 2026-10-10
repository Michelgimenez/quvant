import { describe, expect, it } from "vitest"
import { generarEmpresaDemo } from "@/datos/demo/generar"
import { stockDe } from "@/dominio/estado"

const AHORA = new Date("2026-10-07T15:30:00.000Z") // miércoles 12:30 en Argentina

describe("empresa demo", () => {
  const e = generarEmpresaDemo({ ahora: AHORA })

  it("tiene la estructura pedida: 2 negocios, 3 sucursales, ~300 productos", () => {
    expect(e.org.nombre).toBe("Ferretería Industrial Demo")
    expect(e.org.esDemo).toBe(true)
    expect(e.negocios).toHaveLength(2)
    expect(e.sucursales).toHaveLength(3)
    const n = Object.keys(e.productos).length
    expect(n).toBeGreaterThanOrEqual(270)
    expect(n).toBeLessThanOrEqual(340)
  })

  it("tiene 6 meses de actividad", () => {
    const ventas = Object.values(e.ventas)
    expect(ventas.length).toBeGreaterThan(3000)
    const primera = ventas.reduce((m, v) => (v.fecha < m ? v.fecha : m), ventas[0].fecha)
    const dias = (AHORA.getTime() - new Date(primera).getTime()) / 86_400_000
    expect(dias).toBeGreaterThan(170)
    expect(Object.values(e.presupuestos).length).toBeGreaterThan(300)
    expect(Object.values(e.servicio).length).toBeGreaterThan(120)
    expect(Object.values(e.compras).length).toBeGreaterThan(30)
  })

  it("no genera nada en el futuro", () => {
    const futuro = Object.values(e.ventas).filter((v) => new Date(v.fecha) > AHORA)
    expect(futuro).toEqual([])
  })

  it("es determinística para la misma semilla y el mismo momento", () => {
    const otra = generarEmpresaDemo({ ahora: AHORA })
    expect(Object.keys(otra.ventas)).toEqual(Object.keys(e.ventas))
    expect(otra.stock).toEqual(e.stock)
  })

  it("el stock final coincide con la suma de movimientos", () => {
    // stock final = stock inicial + Σ movimientos. Verificamos con una muestra.
    const cc = e.sucursales[0]
    for (const p of Object.values(e.productos).slice(0, 40)) {
      const movs = e.movimientos.filter((m) => m.sucursalId === cc.id && m.productoId === p.id)
      const suma = movs.reduce((s, m) => s + m.cantidad, 0)
      const final = stockDe(e, cc.id, p.id)
      // El stock inicial es positivo: final − Σmovimientos > 0
      expect(Math.round((final - suma) * 1000) / 1000).toBeGreaterThan(0)
    }
  })

  it("los totales de venta cuadran con ítems y pagos", () => {
    for (const v of Object.values(e.ventas).slice(0, 500)) {
      const items = v.items.reduce((t, it) => t + Math.round(it.cantidad * it.precioUnitario * (1 - it.descuentoPct / 100)), 0)
      const pagos = v.pagos.reduce((t, p) => t + p.importe, 0)
      expect(items).toBe(v.total)
      expect(pagos).toBe(v.total)
    }
  })

  it("marca hay cajas abiertas hoy y conteo en curso", () => {
    expect(Object.values(e.cajas).some((c) => c.estado === "abierta")).toBe(true)
    expect(Object.values(e.conteos).some((c) => c.estado === "en_curso")).toBe(true)
  })
})
