import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { CLIENTES } from "@/config/clientes"
import { FEATURES } from "@/showcase/features"

/** Archivos de código bajo una carpeta. */
function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : /\.(tsx?|css|json)$/.test(n) ? [p] : []
  })
}

const RAIZ = path.join(process.cwd(), "src")
const relativo = (p: string) => path.relative(process.cwd(), p).replaceAll("\\", "/")

describe("regla de honestidad", () => {
  it("Ferremix solo aparece en su configuración de demo comercial", () => {
    const con = archivos(RAIZ)
      .filter((p) => /ferremix/i.test(readFileSync(p, "utf8")))
      .map(relativo)
    expect(con.sort()).toEqual(["src/config/clientes/ferremix.ts", "src/config/clientes/index.ts"])
  })

  it("ningún prospecto se presenta como cliente activo o caso de éxito", () => {
    for (const c of Object.values(CLIENTES)) {
      const texto = JSON.stringify(c).toLowerCase()
      expect(texto).not.toMatch(/cliente activo|caso de éxito|testimonio/)
    }
  })

  it("no quedan los USD 290 de Yunque: los precios salen de src/config/precios.ts", () => {
    const con = archivos(RAIZ)
      .filter((p) => /USD\s*290\b|licenciaMensualUSD:\s*290/.test(readFileSync(p, "utf8")))
      .map(relativo)
    expect(con).toEqual([])
  })

  it("cada función del registro tiene un estado válido", () => {
    for (const f of FEATURES) expect(["disponible", "demo", "próximamente"]).toContain(f.estado)
  })
})
