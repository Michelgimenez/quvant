import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { contraste, nivelAA, textoSobre } from "@/lib/color"

// Los valores se leen de globals.css: si alguien cambia un token, el test lo controla.
const css = readFileSync("src/app/globals.css", "utf8")
function token(nombre: string, bloque: ":root {" | ":root,\n.light {" | ".dark {" = ":root {") {
  const inicio = css.indexOf(bloque)
  const fin = css.indexOf("\n}", inicio)
  const m = css.slice(inicio, fin).match(new RegExp(`--${nombre}:\\s*([^;]+);`))
  if (!m) throw new Error(`No está --${nombre} en ${bloque}`)
  const valor = m[1].trim()
  const ref = valor.match(/^var\(--([\w-]+)\)$/)
  if (ref) {
    try {
      return token(ref[1], bloque)
    } catch {
      return token(ref[1])
    }
  }
  return valor
}
const claro = (n: string) => token(n, ":root,\n.light {")
const oscuro = (n: string) => token(n, ".dark {")

describe("la paleta de Quvant (manual, pág. 8)", () => {
  it("los cuatro colores de pantalla son los del manual", () => {
    expect(token("negro")).toBe("#0d0d0f")
    expect(token("blanco")).toBe("#ececee")
    expect(token("acero")).toBe("#9c9ca3")
    expect(token("profundo")).toBe("#26262b")
  })

  it("blanco sobre negro supera AAA", () => {
    expect(contraste(token("blanco"), token("negro"))).toBeGreaterThan(7)
  })

  it("acero sobre negro cumple AA, pero sobre blanco no: en claro el secundario usa un gris más oscuro", () => {
    expect(contraste(token("acero"), token("negro"))).toBeGreaterThanOrEqual(4.5)
    expect(contraste(token("acero"), token("blanco"))).toBeLessThan(4.5)
    expect(contraste(claro("muted-foreground"), claro("background"))).toBeGreaterThanOrEqual(4.5)
    expect(contraste(claro("muted-foreground"), claro("muted"))).toBeGreaterThanOrEqual(4.5)
  })

  it("el texto secundario y el terciario del oscuro cumplen AA sobre fondo y superficies", () => {
    for (const fondo of ["background", "card", "popover", "muted"]) {
      expect(contraste(oscuro("texto-2"), oscuro(fondo))).toBeGreaterThanOrEqual(4.5)
      expect(contraste(oscuro("texto-3"), oscuro(fondo))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("el botón principal (blanco sobre negro y al revés) supera AAA en los dos modos", () => {
    expect(contraste(oscuro("primary"), oscuro("primary-foreground"))).toBeGreaterThan(7)
    expect(contraste(claro("primary"), claro("primary-foreground"))).toBeGreaterThan(7)
  })
})

describe("colores de estado (extensión del prompt)", () => {
  for (const estado of ["ok", "alerta", "error", "info"]) {
    it(`${estado} cumple AA como texto en oscuro y en claro`, () => {
      for (const fondo of ["background", "card", "popover", "muted"]) {
        expect(contraste(oscuro(estado), oscuro(fondo))).toBeGreaterThanOrEqual(4.5)
        expect(contraste(claro(estado), claro(fondo))).toBeGreaterThanOrEqual(4.5)
      }
    })
  }
})

describe("co-branding", () => {
  it("elige texto negro Quvant sobre colores claros y blanco Quvant sobre oscuros", () => {
    expect(textoSobre("#FFB224")).toBe("#0d0d0f")
    expect(textoSobre("#15171A")).toBe("#ececee")
    expect(textoSobre("#FF5A1F")).toBe("#0d0d0f")
  })

  it("informa el nivel alcanzado", () => {
    expect(nivelAA("#0D0D0F", "#ECECEE")).toBe("AAA")
    expect(nivelAA("#ECECEE", "#9C9CA3")).toBe("insuficiente")
  })
})
