// Las capturas del sitio, sacadas de la demo (/demo): los tableros de las cuatro empresas (el del kiosco es también
// la imagen de espera de la escala del hero) y los módulos. Van a public/capturas/sitio/ (las sirve next/image).
// Uso (con la app en 3010): npx tsx scripts/marca/capturar-sitio.mts [solo...]
import { chromium, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3010"
const CARPETA = "public/capturas/sitio"
const BARRA = 48
const pedidos = process.argv.slice(2)
mkdirSync(CARPETA, { recursive: true })

type Toma = { id: string; empresa: string; modulo?: string; ancho?: number; alto?: number; antes?: (p: Page) => Promise<void> }

const TOMAS: Toma[] = [
  { id: "tablero-kiosco", empresa: "kiosco" },
  { id: "tablero-ferreteria", empresa: "ferreteria" },
  { id: "tablero-distribuidora", empresa: "distribuidora" },
  { id: "tablero-grupo", empresa: "grupo" },
  {
    id: "kiosco-mostrador",
    empresa: "kiosco",
    modulo: "mostrador",
    antes: async (p) => {
      const fav = p.getByTestId("favorito")
      await fav.nth(0).click()
      await fav.nth(2).click()
      await fav.nth(2).click()
      await fav.nth(5).click()
    },
  },
  { id: "kiosco-caja", empresa: "kiosco", modulo: "caja", antes: (p) => p.getByTestId("contar-todo").click() },
  { id: "ferreteria-presupuestos", empresa: "ferreteria", modulo: "presupuestos" },
  { id: "ferreteria-transferencias", empresa: "ferreteria", modulo: "transferencias" },
  { id: "ferreteria-servicio", empresa: "ferreteria", modulo: "servicio" },
  { id: "distribuidora-preventa", empresa: "distribuidora", modulo: "preventa", antes: (p) => p.getByTestId("simular-pedido").click() },
  { id: "distribuidora-reparto", empresa: "distribuidora", modulo: "reparto" },
  { id: "grupo-aprobaciones", empresa: "grupo", modulo: "aprobaciones", antes: (p) => p.getByTestId("aprobar").click() },
]

const navegador = await chromium.launch()
const errores: string[] = []
try {
  for (const t of TOMAS.filter((x) => !pedidos.length || pedidos.includes(x.id))) {
    const ancho = t.ancho ?? 1440
    const alto = t.alto ?? 852
    const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto + BARRA }, colorScheme: "dark", locale: "es-AR" })
    const page = await ctx.newPage()
    page.on("pageerror", (e) => errores.push(`${t.id}: ${e.message.slice(0, 200)}`))
    await page.goto(`${BASE}/demo?empresa=${t.empresa}`, { waitUntil: "networkidle", timeout: 120_000 })
    await page.addStyleTag({ content: "nextjs-portal{display:none!important} [data-sonner-toaster]{display:none!important}" })
    await page.waitForSelector("[data-escena-empresa]")
    if (t.modulo) await page.getByTestId(`modulo-${t.modulo}`).click()
    if (t.antes) await t.antes(page)
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${CARPETA}/${t.id}.png`, clip: { x: 0, y: BARRA, width: ancho, height: alto } })
    console.log("✓", t.id)
    await ctx.close()
  }
} finally {
  await navegador.close()
}
console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de página")
