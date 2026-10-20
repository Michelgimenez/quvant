import { describe, expect, it } from "vitest"
import { fuenteForjaDemo } from "@/demo/forja-demo"
import { ANCLA_MS } from "@/demo/generar"
import type { TallerForja } from "@/forja/dominio/modelo"
import { nombreZona, planoTaller } from "@/forja/dominio/plano"

const base: TallerForja = {
  sucursalId: "s1",
  puestos: [{ puesto: 1, ventasHoy: 3, importeHoy: 1000, cajaAbierta: true, sinConexion: 0, ultimaVenta: null }],
  racks: [{ id: "GO-A", categoria: "GO", categoriaNombre: "Golosinas", pasillo: "A", productos: [], unidades: 0, criticos: 0, sinStock: 0, niveles: [] }],
  bancos: [],
  muelle: [],
}
const zonas = (t: TallerForja, tipo: "sucursal" | "deposito" = "sucursal") => planoTaller(t, tipo).zonas.map((z) => z.tipo).sort()

describe("Forja · la vista por dentro según el rubro", () => {
  it("el comercio, como siempre: mostrador, depósito, servicio técnico y muelle", () => {
    expect(zonas(base)).toEqual(["deposito", "mostrador", "muelle", "servicio"])
  })

  it("el kiosco: mostrador y góndolas, sin servicio ni muelle", () => {
    const p = planoTaller({ ...base, rubro: "kiosco" }, "sucursal")
    expect(p.zonas.map((z) => z.tipo).sort()).toEqual(["deposito", "mostrador"])
    expect(p.zonas.find((z) => z.tipo === "deposito")!.nombre).toBe("Góndolas")
    expect(p.bancos).toEqual([])
    expect(p.estanteRetiro.ancho).toBe(0)
  })

  it("la distribuidora: el depósito con andenes y camiones (los que están en la calle dejan el andén vacío)", () => {
    const muelle: TallerForja["muelle"] = [
      { id: "c1", tipo: "transferencia", estado: "en_transito", detalle: "Camión 1", franja: null, destinoId: null },
      { id: "c2", tipo: "transferencia", estado: "pendiente", detalle: "Camión 2", franja: "mañana", destinoId: null },
    ]
    const p = planoTaller({ ...base, rubro: "distribuidora", puestos: [], muelle }, "deposito")
    expect(p.zonas.map((z) => z.tipo).sort()).toEqual(["deposito", "muelle"])
    expect(nombreZona("distribuidora", "muelle")).toBe("Andenes y camiones")
    expect(p.camiones.map((c) => c.enViaje)).toEqual([true, false])
  })

  it("la sucursal de una cadena: salón y depósito, cajas y carga, sin servicio técnico", () => {
    const p = planoTaller({ ...base, rubro: "sucursal", puestos: Array.from({ length: 6 }, (_, i) => ({ ...base.puestos[0], puesto: i + 1 })) }, "sucursal")
    expect(p.zonas.map((z) => z.tipo).sort()).toEqual(["deposito", "mostrador", "muelle"])
    expect(p.puestos).toHaveLength(6)
    expect(p.zonas.find((z) => z.tipo === "deposito")!.nombre).toBe("Salón y depósito")
  })

  it("en la demo: el grupo usa la sucursal y la distribuidora, su depósito con camiones", () => {
    const g = fuenteForjaDemo("grupo", ANCLA_MS)
    expect(g.taller(g.red.nodos[0].id)!.rubro).toBe("sucursal")
    const d = fuenteForjaDemo("distribuidora", ANCLA_MS)
    const t = d.taller(d.red.nodos[0].id)!
    expect(t.rubro).toBe("distribuidora")
    expect(planoTaller(t, "deposito").camiones.length).toBeGreaterThanOrEqual(2)
  })
})
