import { describe, expect, it } from "vitest"
import { fuenteForjaDemo } from "@/demo/forja-demo"
import { ANCLA_MS } from "@/demo/generar"

describe("Forja dentro de la demo (fuente de src/demo, sin base)", () => {
  it("el grupo: 40 sucursales en el mapa, con ventas del día, calor y sello de simulación", () => {
    const f = fuenteForjaDemo("grupo", ANCLA_MS + 60_000, ANCLA_MS + 60_000)
    expect(f.simulacion).toBe(true)
    expect(f.propuesta).toBe(false)
    expect(f.desfase).toBe(0)
    expect(f.red.nodos).toHaveLength(40)
    for (const n of f.red.nodos) {
      expect(n.demo).toBe(true)
      expect(n.lat).not.toBeNull()
      expect(Number.isFinite(n.calor)).toBe(true)
    }
    expect(f.red.nodos.reduce((a, n) => a + n.ventasHoy, 0)).toBeGreaterThan(1000)
    expect(f.red.transferencias.some((t) => t.estado === "en_transito")).toBe(true)
    // Los eventos del día, en orden
    const horas = f.eventos.map((e) => e.en)
    expect([...horas].sort()).toEqual(horas)
  })

  it("la repetición: a media mañana había menos ventas que ahora", () => {
    const f = fuenteForjaDemo("grupo", ANCLA_MS)
    const temprano = f.redEn(new Date(ANCLA_MS - 7 * 3_600_000))
    const total = (r: typeof f.red) => r.nodos.reduce((a, n) => a + n.ventasHoy, 0)
    expect(total(temprano)).toBeLessThan(total(f.red))
  })

  it("la distribuidora: el depósito y sus 12 zonas, con los camiones del reparto en viaje", () => {
    const f = fuenteForjaDemo("distribuidora", ANCLA_MS)
    expect(f.red.nodos).toHaveLength(13)
    expect(f.red.nodos[0].tipo).toBe("deposito")
    expect(f.red.nodos.slice(1).every((n) => n.nombre.startsWith("Zona "))).toBe(true)
    expect(f.red.transferencias.filter((t) => t.estado === "en_transito").length).toBeGreaterThan(0)
  })

  it("cada sede tiene su taller: puestos, racks por categoría y lo que espera en el muelle", () => {
    const f = fuenteForjaDemo("grupo", ANCLA_MS)
    const t = f.taller(f.red.nodos[0].id)!
    expect(t.puestos.length).toBeGreaterThan(0)
    expect(t.racks.length).toBeGreaterThan(3)
    expect(t.bancos).toEqual([])
    expect(f.taller("no-existe")).toBeNull()
  })
})
