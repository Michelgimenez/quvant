// Capturas de la app real con la identidad de Quvant, con datos y en el estado que se quiere mirar.
// Uso (con `npm run dev -- -p 3010` corriendo): npx tsx scripts/marca/capturar-app.mts <carpeta> [ids...]
//   carpeta: dónde guardar (p. ej. docs/capturas/quvant/tanda-2)
//   ids: solo esas tomas (por defecto, todas). Junta los errores de página y de consola (sin los avisos de desarrollo).
import { chromium, expect, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3010"
const [carpeta = "docs/capturas/quvant/tmp", ...soloIds] = process.argv.slice(2)
mkdirSync(carpeta, { recursive: true })

async function ingresar(page: Page, email: string) {
  await page.goto(`${BASE}/ingresar`)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Contraseña").fill("demo1234")
  await page.getByRole("button", { name: "Ingresar" }).click()
  const dos = page.getByLabel("Código de 6 dígitos")
  await Promise.race([page.waitForURL(/\/app/, { timeout: 90_000 }), dos.waitFor({ timeout: 90_000 })])
  if (await dos.isVisible().catch(() => false)) {
    await dos.fill((await page.getByTestId("codigo-demo").innerText()).replace(/\D/g, ""))
    await page.getByRole("button", { name: "Verificar" }).click()
    await page.waitForURL(/\/app/, { timeout: 90_000 })
  }
}

async function cargarCarrito(page: Page) {
  for (const b of ["taladro", "disco de corte", "guantes"]) {
    const buscador = page.getByTestId("buscador-productos")
    await buscador.fill(b)
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 20_000 })
    await buscador.press("Enter")
  }
}

async function abrirCajaSiHaceFalta(page: Page) {
  const abrir = page.getByRole("button", { name: "Abrir caja para cobrar" })
  if (await abrir.isVisible().catch(() => false)) {
    await abrir.click()
    await page.getByRole("dialog").getByRole("button", { name: "Abrir caja" }).click()
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 })
  }
}

type Toma = { id: string; usuario: string; ruta: string; tema?: "light" | "dark"; antes?: (p: Page) => Promise<void> }
const TOMAS: Toma[] = [
  { id: "tablero-oscuro", usuario: "dueno@demo.quvant.app", ruta: "/app" },
  { id: "tablero-claro", usuario: "dueno@demo.quvant.app", ruta: "/app", tema: "light" },
  { id: "mostrador-oscuro", usuario: "mostrador@demo.quvant.app", ruta: "/app/mostrador", antes: async (p) => (await abrirCajaSiHaceFalta(p), await cargarCarrito(p)) },
  { id: "mostrador-claro", usuario: "mostrador@demo.quvant.app", ruta: "/app/mostrador", tema: "light", antes: async (p) => (await abrirCajaSiHaceFalta(p), await cargarCarrito(p)) },
  {
    id: "caja-cierre",
    usuario: "mostrador@demo.quvant.app",
    ruta: "/app/mostrador",
    antes: async (p) => {
      await abrirCajaSiHaceFalta(p)
      await p.getByRole("button", { name: /Cerrar caja/ }).first().click()
      await p.getByRole("dialog").waitFor()
    },
  },
  { id: "inventario", usuario: "dueno@demo.quvant.app", ruta: "/app/inventario" },
  { id: "presupuestos", usuario: "dueno@demo.quvant.app", ruta: "/app/presupuestos" },
  { id: "clientes", usuario: "dueno@demo.quvant.app", ruta: "/app/clientes" },
  { id: "servicio", usuario: "dueno@demo.quvant.app", ruta: "/app/servicio" },
  { id: "reportes", usuario: "dueno@demo.quvant.app", ruta: "/app/reportes" },
  { id: "precios", usuario: "dueno@demo.quvant.app", ruta: "/app/precios" },
  { id: "compras", usuario: "dueno@demo.quvant.app", ruta: "/app/compras" },
  { id: "configuracion", usuario: "dueno@demo.quvant.app", ruta: "/app/configuracion" },
  { id: "ingresar", usuario: "", ruta: "/ingresar" },
]

const navegador = await chromium.launch()
const errores: string[] = []
try {
  for (const t of TOMAS.filter((x) => !soloIds.length || soloIds.includes(x.id))) {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: t.tema ?? "dark", locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires" })
    const page = await ctx.newPage()
    page.on("pageerror", (e) => errores.push(`${t.id} (página): ${e.message.slice(0, 220)}`))
    page.on("console", (m) => {
      if (m.type() === "error" && !/instant navigation|Download the React DevTools/.test(m.text())) errores.push(`${t.id}: ${m.text().slice(0, 220)}`)
    })
    await page.addInitScript((tema) => localStorage.setItem("theme", tema), t.tema ?? "dark")
    if (t.usuario) await ingresar(page, t.usuario)
    await page.goto(`${BASE}${t.ruta}`, { waitUntil: "networkidle", timeout: 120_000 })
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
    if (t.antes) await t.antes(page)
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${carpeta}/${t.id}.png` })
    console.log("✓", t.id)
    await ctx.close()
  }
} finally {
  await navegador.close()
}
console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de página ni de consola")
