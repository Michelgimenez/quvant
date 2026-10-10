import { chromium } from "@playwright/test"

const BASE = process.env.BASE ?? "http://localhost:3420"
const SALIDA = "C:/Users/miche/AppData/Local/Temp/claude/c--Users-miche-Yunque/95facb65-f649-438c-8035-779f134a22ac/scratchpad"
const ancho = Number(process.env.ANCHO ?? 1440)
const alto = Number(process.env.ALTO ?? 900)

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: ancho < 600 ? 2 : 1, locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires" })
  const page = await ctx.newPage()
  await page.clock.install({ time: new Date("2026-10-07T15:30:00-03:00") })
  const errores: string[] = []
  page.on("console", (m) => { if (m.type() === "error") errores.push(`${m.type()}: ${m.text().slice(0, 200)}`) })
  page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`))
  await page.goto(`${BASE}/ingresar`)
  await page.getByLabel("Email").fill("dueno@demo.yunque.app")
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
  await page.goto(`${BASE}/app/extensiones`)
  await page.getByTestId("activar-forja").click()
  await page.waitForURL(/\/app\/forja/)
  await page.locator("[data-testid=forja-red][data-listo=true]").waitFor({ timeout: 120_000 })
  await page.waitForTimeout(2000)
  const total = () => page.getByTestId("ventas-hoy-total").innerText()
  console.log("vivo", await total())
  await page.screenshot({ path: `${SALIDA}/f4-vivo.png` })
  await page.getByTestId("repetir").click()
  await page.waitForTimeout(300)
  console.log("inicio", await total(), await page.getByTestId("hora-repeticion").innerText())
  await page.waitForTimeout(9000)
  console.log("medio", await total(), await page.getByTestId("hora-repeticion").innerText())
  await page.screenshot({ path: `${SALIDA}/f4-repeticion.png` })
  await page.waitForTimeout(16000)
  console.log("fin", await total(), await page.getByTestId("hora-repeticion").innerText(), await page.getByTestId("repetir").getAttribute("aria-label"))
  await page.getByTestId("volver-en-vivo").click()
  await page.waitForTimeout(500)
  console.log("vivo otra vez", await total())
  if (ancho >= 768) {
    await page.getByTestId("abrir-sala").click()
    await page.waitForTimeout(3500)
    await page.screenshot({ path: `${SALIDA}/f4-sala.png` })
    console.log("parada", await page.getByTestId("sala-parada").innerText(), "titulares", await page.getByTestId("titular").count())
    await page.clock.fastForward(20_500)
    await page.waitForTimeout(4500)
    console.log("parada 2", await page.getByTestId("sala-parada").innerText())
    await page.screenshot({ path: `${SALIDA}/f4-sala2.png` })
    await page.getByTestId("salir-sala").click()
    await page.waitForTimeout(500)
    console.log("sala", await page.getByTestId("sala-control").count())
  }
  console.log(errores.filter((e) => !e.includes("instant navigation")).slice(0, 20).join("\n"))
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
