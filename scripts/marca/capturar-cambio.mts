// Cuadros clave del cambio de empresa, con el reloj de GSAP en pausa (modo ?film=1).
// Uso: npx tsx scripts/marca/capturar-cambio.mts <carpeta> <desde> <tecla> [segundos...]
import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3010"
const [carpeta = "docs/capturas/quvant/tmp", desde = "kiosco", tecla = "4", ...seg] = process.argv.slice(2)
const momentos = (seg.length ? seg : ["0", "0.25", "0.45", "0.65", "0.8", "0.95", "1.1", "1.3", "1.7"]).map(Number)
mkdirSync(carpeta, { recursive: true })
const navegador = await chromium.launch()
const errores: string[] = []
try {
  const page = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 240)))
  await page.goto(`${BASE}/demo?empresa=${desde}&film=1`, { waitUntil: "networkidle", timeout: 120_000 })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 60_000 })
  const t0 = await page.evaluate(() => (window as unknown as { __gsap: { globalTimeline: { totalTime: () => number } } }).__gsap.globalTimeline.totalTime())
  await page.keyboard.press(tecla)
  for (const s of momentos) {
    await page.evaluate((t) => (window as unknown as { __seek: (t: number) => void }).__seek(t), t0 + s)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    await page.screenshot({ path: `${carpeta}/${desde}-a-${tecla}-${String(Math.round(s * 1000)).padStart(4, "0")}.png` })
    console.log("✓", s)
  }
} finally {
  await navegador.close()
}
console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de página")
