// Recorre el sitio (/) y captura el hero, cada sección por su id y la escala en movimiento.
// Uso (con la app en 3010): npx tsx scripts/marca/revisar-sitio.mts <carpeta> [ancho]
import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3010"
const [carpeta = "docs/capturas/quvant/tmp", anchoTexto = "1440"] = process.argv.slice(2)
const ANCHO = Number(anchoTexto)
mkdirSync(carpeta, { recursive: true })

const SECCIONES = ["problema", "nunca-se-cae", "cuatro-negocios", "modulos", "precios-al-dia", "seguridad", "planes", "a-medida", "socios", "estado", "preguntas", "pedir-demo"]

const navegador = await chromium.launch()
const errores: string[] = []
try {
  const ctx = await navegador.newContext({ viewport: { width: ANCHO, height: 900 }, colorScheme: "dark", locale: "es-AR", reducedMotion: "no-preference" })
  const page = await ctx.newPage()
  page.on("pageerror", (e) => errores.push(`(página) ${e.message.slice(0, 240)}`))
  page.on("console", (m) => m.type() === "error" && !/React DevTools/.test(m.text()) && errores.push(m.text().slice(0, 240)))
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  await page.screenshot({ path: `${carpeta}/sitio-hero-${ANCHO}.png` })

  // La escala: la vista viva, y un salto hacia la empresa (con fotos durante el cambio).
  const control = page.getByTestId("escala-control")
  await control.waitFor({ timeout: 30_000 })
  await control.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -80))
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${carpeta}/sitio-escala-kiosco-${ANCHO}.png` })
  await control.focus()
  await page.keyboard.press("End")
  await page.waitForTimeout(420)
  await page.screenshot({ path: `${carpeta}/sitio-escala-salto-${ANCHO}.png` })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${carpeta}/sitio-escala-grupo-${ANCHO}.png` })

  // En las fotos de cada sección, el encabezado fijo no tapa nada.
  await page.addStyleTag({ content: "body > div > header{visibility:hidden}" })
  for (const id of SECCIONES) {
    const s = page.locator(`#${id}`)
    await s.scrollIntoViewIfNeeded()
    await page.waitForTimeout(id === "nunca-se-cae" || id === "precios-al-dia" ? 2500 : 500)
    await s.screenshot({ path: `${carpeta}/sitio-${id}-${ANCHO}.png` })
    console.log("✓", id)
  }
  await page.locator("footer").screenshot({ path: `${carpeta}/sitio-pie-${ANCHO}.png` })
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth)
  if (ancho > ANCHO) errores.push(`La página se desborda: ${ancho} px de ancho en una ventana de ${ANCHO}`)
  await ctx.close()
} finally {
  await navegador.close()
}
console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de página ni de consola")
