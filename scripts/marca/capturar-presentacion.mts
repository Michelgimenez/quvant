// Captura cada escena de una presentación (/inversores o /demo/<cliente>) a 1920 × 1080.
// Uso (con la app en 3010): npx tsx scripts/marca/capturar-presentacion.mts inversores <carpeta> [escenas...]
import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3010"
const CLAVE = process.env.CLAVE ?? "quvant-demo"
const [rutaDada = "inversores", carpeta = "docs/capturas/quvant/tmp", ...pedidas] = process.argv.slice(2)
// Sin barra inicial (Git Bash convierte "/inversores" en una ruta de Windows).
const ruta = `/${rutaDada.replace(/^\/+/, "")}`
mkdirSync(carpeta, { recursive: true })
const nombre = ruta.replace(/^\//, "").replace(/\//g, "-") || "inicio"

const navegador = await chromium.launch()
const errores: string[] = []
try {
  const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "dark", locale: "es-AR" })
  const page = await ctx.newPage()
  page.on("pageerror", (e) => errores.push(`(página) ${e.message.slice(0, 240)}`))
  page.on("console", (m) => m.type() === "error" && !/React DevTools/.test(m.text()) && errores.push(m.text().slice(0, 240)))
  await page.goto(`${BASE}${ruta}`, { waitUntil: "networkidle", timeout: 120_000 })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  if (await page.getByLabel("Clave").count()) {
    await page.getByLabel("Clave").fill(CLAVE)
    await page.getByRole("button", { name: "Entrar" }).click()
  }
  await page.getByTestId("presentacion-play").waitFor({ timeout: 60_000 })
  await page.keyboard.press("h")
  const total = Number((await page.getByTestId("presentacion-escena").textContent().catch(() => "")) ?? "") || 0
  void total
  const cuantas = await page.evaluate(() => document.querySelectorAll("[data-indice-escenas] rect").length - 2)
  const lista = pedidas.length ? pedidas.map(Number) : Array.from({ length: cuantas }, (_, i) => i + 1)
  for (const n of lista) {
    await page.evaluate((x) => (window.location.hash = String(x)), n)
    await page.waitForTimeout(n === 5 ? 5200 : 3800)
    await page.screenshot({ path: `${carpeta}/${nombre}-${String(n).padStart(2, "0")}.png` })
    console.log("✓", n)
  }
  await ctx.close()
} finally {
  await navegador.close()
}
console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de página ni de consola")
