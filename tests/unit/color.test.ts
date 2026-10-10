import { describe, expect, it } from "vitest"
import { contraste, nivelAA, textoSobre } from "@/lib/color"

describe("contraste de la paleta de Yunque", () => {
  it("texto niebla sobre hierro supera AAA", () => {
    expect(contraste("#EEF1F4", "#0E1116")).toBeGreaterThan(7)
  })

  it("texto secundario acero sobre hierro y forja cumple AA", () => {
    expect(contraste("#9AA3AE", "#0E1116")).toBeGreaterThanOrEqual(4.5)
    expect(contraste("#9AA3AE", "#1A1F27")).toBeGreaterThanOrEqual(4.5)
  })

  it("el temple de marca con texto blanco no llega a AA: por eso los botones usan temple-accion", () => {
    expect(contraste("#3B6EF5", "#FFFFFF")).toBeLessThan(4.5)
    expect(contraste("#3466F0", "#FFFFFF")).toBeGreaterThanOrEqual(4.5)
  })

  it("enlaces: claro sobre hierro y oscuro sobre niebla cumplen AA", () => {
    expect(contraste("#6E93F8", "#0E1116")).toBeGreaterThanOrEqual(4.5)
    expect(contraste("#2A55D0", "#EEF1F4")).toBeGreaterThanOrEqual(4.5)
  })

  it("texto secundario del modo claro cumple AA sobre niebla y blanco", () => {
    expect(contraste("#5B6470", "#EEF1F4")).toBeGreaterThanOrEqual(4.5)
    expect(contraste("#5B6470", "#FFFFFF")).toBeGreaterThanOrEqual(4.5)
  })
})

describe("co-branding", () => {
  it("elige texto hierro sobre colores claros y blanco sobre oscuros", () => {
    expect(textoSobre("#FFB224")).toBe("#0e1116")
    expect(textoSobre("#15171A")).toBe("#ffffff")
    expect(textoSobre("#FF5A1F")).toBe("#0e1116")
  })

  it("informa el nivel alcanzado", () => {
    expect(nivelAA("#0E1116", "#EEF1F4")).toBe("AAA")
    expect(nivelAA("#FFFFFF", "#9AA3AE")).toBe("insuficiente")
  })
})
