// Capturas de /demo: cada empresa, el selector abierto y las vistas que se pidan.
// Uso (con la app corriendo en 3010): npx tsx scripts/marca/capturar-demo.mts <carpeta> [tomas...]
//   tomas: kiosco, ferreteria, distribuidora, grupo, selector, o "<empresa>:<modulo>" (p. ej. grupo:inventario)
import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3010"
const [carpeta = "docs/capturas/quvant/tmp", ...pedidas] = process.argv.slice(2)
const tomas = pedidas.length ? pedidas : ["kiosco", "ferreteria", "distribuidora", "grupo", "selector"]
mkdirSync(carpeta, { recursive: true })

const navegador = await chromium.launch()
const errores: string[] = []
try {
  for (const toma of tomas) {
    const [empresa, modulo] = toma === "selector" ? ["kiosco", undefined] : toma.split(":")
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "es-AR" })
    const page = await ctx.newPage()
    page.on("pageerror", (e) => errores.push(`${toma} (página): ${e.message.slice(0, 240)}`))
    page.on("console", (m) => m.type() === "error" && !/instant navigation|React DevTools/.test(m.text()) && errores.push(`${toma}: ${m.text().slice(0, 240)}`))
    await page.goto(`${BASE}/demo?empresa=${empresa}`, { waitUntil: "networkidle", timeout: 120_000 })
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
    await page.waitForSelector("[data-demo]", { timeout: 60_000 })
    if (modulo) await page.getByTestId(`modulo-${modulo}`).click()
    if (toma === "selector") await page.getByTestId("abrir-selector").click()
    await page.waitForTimeout(toma === "selector" ? 900 : 2200)
    await page.screenshot({ path: `${carpeta}/${toma.replace(":", "-")}.png` })
    console.log("✓", toma)
    await ctx.close()
  }
} finally {
  await navegador.close()
}
console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de página ni de consola")
