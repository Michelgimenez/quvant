// Verificación rápida de la app con la identidad nueva: entra con usuarios de prueba, captura tablero,
// mostrador (oscuro y claro) y el sitio, y junta errores de consola. Uso (con `npm run dev -- -p 3010`):
//   npx tsx scripts/marca/verificar-app.mts
import { chromium, type Page } from "@playwright/test"
const BASE = "http://localhost:3010"
const OUT = "docs/capturas/quvant/tanda-1"
async function ingresar(page: Page, usuario: string) {
  await page.goto(`${BASE}/ingresar`)
  await page.getByLabel("Email").fill(usuario)
  await page.getByLabel("Contraseña").fill("demo1234")
  await page.getByRole("button", { name: "Ingresar" }).click()
  const dos = page.getByLabel("Código de 6 dígitos")
  await Promise.race([page.waitForURL(/\/app/, { timeout: 60_000 }), dos.waitFor({ timeout: 60_000 })])
  if (await dos.isVisible().catch(() => false)) {
    const c = await page.getByTestId("codigo-demo").innerText()
    await dos.fill(c.replace(/\D/g, ""))
    await page.getByRole("button", { name: "Verificar" }).click()
    await page.waitForURL(/\/app/, { timeout: 60_000 })
  }
}
const tomas = [
  { id: "app-tablero-oscuro", usuario: "dueno@demo.quvant.app", ruta: "/app", tema: "dark" },
  { id: "app-mostrador-oscuro", usuario: "mostrador@demo.quvant.app", ruta: "/app/mostrador", tema: "dark" },
  { id: "app-mostrador-claro", usuario: "mostrador@demo.quvant.app", ruta: "/app/mostrador", tema: "light" },
  { id: "sitio-texto-largo", ruta: "/", tema: "dark", bajar: 2600 },
]
const b = await chromium.launch()
const errores: string[] = []
for (const t of tomas) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: t.tema as "dark" | "light", locale: "es-AR" })
  const page = await ctx.newPage()
  page.on("console", (m) => m.type() === "error" && errores.push(`${t.id}: ${m.text().slice(0, 200)}`))
  page.on("pageerror", (e) => errores.push(`${t.id} (pageerror): ${e.message.slice(0, 200)}`))
  if (t.tema === "light") await page.addInitScript(() => localStorage.setItem("theme", "light"))
  if (t.usuario) await ingresar(page, t.usuario)
  await page.goto(`${BASE}${t.ruta}`, { waitUntil: "networkidle", timeout: 120_000 })
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  if (t.bajar) await page.evaluate((y) => window.scrollTo(0, y), t.bajar)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/${t.id}.png` })
  console.log("✓", t.id)
  await ctx.close()
}
await b.close()
console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de consola")
