// Abre Forja dentro de la demo (grupo y distribuidora) o la pública ("publica": /forja) y captura la activación en
// varios momentos, la red y el taller de la primera sucursal.
// Uso (con la app en 3010): npx tsx scripts/marca/capturar-forja-demo.mts <carpeta> [grupo|distribuidora|publica...]
import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3010"
const [carpeta = "docs/capturas/quvant/tmp", ...pedidas] = process.argv.slice(2)
const empresas = pedidas.length ? pedidas : ["grupo", "distribuidora"]
mkdirSync(carpeta, { recursive: true })

const navegador = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const errores: string[] = []
try {
  for (const empresa of empresas) {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "es-AR" })
    const page = await ctx.newPage()
    page.on("pageerror", (e) => errores.push(`${empresa} (página): ${e.message.slice(0, 240)}`))
    page.on("console", (m) => m.type() === "error" && !/React DevTools|instant navigation|WebGL|GPU stall|webglcontext/i.test(m.text()) && errores.push(`${empresa}: ${m.text().slice(0, 240)}`))
    await page.goto(empresa === "publica" ? `${BASE}/forja` : `${BASE}/demo?empresa=${empresa}`, { waitUntil: "networkidle", timeout: 120_000 })
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
    if (empresa !== "publica") await page.getByTestId("modulo-forja").click()
    const activacion = page.getByTestId("activacion")
    await activacion.waitFor({ timeout: 60_000 })
    const t0 = Date.now()
    for (const en of [0.6, 1.6, 2.2, 3.2]) {
      await page.waitForTimeout(Math.max(0, en * 1000 - (Date.now() - t0)))
      await page.screenshot({ path: `${carpeta}/forja-${empresa}-activacion-${String(en).replace(".", "_")}.png` })
    }
    await activacion.waitFor({ state: "detached", timeout: 15_000 })
    await page.waitForTimeout(3500)
    await page.screenshot({ path: `${carpeta}/forja-${empresa}-red.png` })
    // El taller de la sucursal que más vende (la primera de la lista con nombre)
    // Los nodos siguen al mapa cuadro a cuadro (nunca están "quietos"): se entra con el teclado, como en los e2e.
    await page.getByTestId("nodo-forja").locator("button").first().focus()
    await page.keyboard.press("Enter")
    await page.getByTestId("forja-taller").waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    await page.screenshot({ path: `${carpeta}/forja-${empresa}-taller.png` })
    console.log("✓", empresa)
    await ctx.close()
  }
} finally {
  await navegador.close()
}
console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de página ni de consola")
