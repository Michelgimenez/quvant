/**
 * Capturas de cada pantalla con Playwright en docs/capturas/
 * (escritorio 1440×900 y celular 390×844).
 *
 * Uso:
 *   npm run build && npm run capturas            # todas
 *   npm run capturas -- app-mostrador sitio      # solo las que contienen esos textos
 *
 * Levanta `next start` en el puerto 3200 si no hay un servidor corriendo.
 * Con --sitio copia además las capturas de la app a public/capturas/ (las usa el sitio).
 */
import { chromium, type Browser, type Page } from "@playwright/test"
import { spawn, type ChildProcess } from "node:child_process"
import { copyFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { PANTALLAS, type Pantalla } from "./pantallas"

const PUERTO = Number(process.env.PUERTO_CAPTURAS ?? 3200)
const BASE = `http://localhost:${PUERTO}`
const SALIDA = path.join(process.cwd(), "docs", "capturas")
const PUBLICAS = path.join(process.cwd(), "public", "capturas")

const VISTAS = [
  { nombre: "escritorio", width: 1440, height: 900, escala: 1 },
  { nombre: "celular", width: 390, height: 844, escala: 2 },
] as const

async function servidorArriba() {
  try {
    const r = await fetch(`${BASE}/api/salud`)
    return r.ok
  } catch {
    return false
  }
}

async function levantarServidor(): Promise<ChildProcess | null> {
  if (await servidorArriba()) return null
  const proc = spawn("npx", ["next", "start", "-p", String(PUERTO)], {
    shell: true,
    stdio: "ignore",
    env: { ...process.env, INVERSORES_KEY: process.env.INVERSORES_KEY ?? "yunque-demo" },
  })
  for (let i = 0; i < 120; i++) {
    if (await servidorArriba()) return proc
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error("El servidor no levantó en 120 s")
}

async function ingresar(page: Page, usuario: string) {
  await page.goto(`${BASE}/ingresar`)
  await page.getByLabel("Email").fill(usuario)
  await page.getByLabel("Contraseña").fill("demo1234")
  await page.getByRole("button", { name: "Ingresar" }).click()
  const dosFactor = page.getByLabel("Código de 6 dígitos")
  await Promise.race([
    page.waitForURL(/\/app/, { timeout: 20_000 }),
    dosFactor.waitFor({ timeout: 20_000 }),
  ])
  if (await dosFactor.isVisible().catch(() => false)) {
    const codigo = await page.getByTestId("codigo-demo").innerText()
    await dosFactor.fill(codigo.replace(/\D/g, ""))
    await page.getByRole("button", { name: "Verificar" }).click()
    await page.waitForURL(/\/app/, { timeout: 20_000 })
  }
}

async function capturar(browser: Browser, p: Pantalla) {
  for (const vista of VISTAS) {
    if (p.soloEscritorio && vista.nombre === "celular") continue
    const ctx = await browser.newContext({
      viewport: { width: vista.width, height: vista.height },
      deviceScaleFactor: vista.escala,
      isMobile: vista.nombre === "celular",
      hasTouch: vista.nombre === "celular",
      locale: "es-AR",
      timezoneId: "America/Argentina/Buenos_Aires",
      reducedMotion: "reduce",
      colorScheme: p.tema === "claro" ? "light" : "dark",
    })
    const page = await ctx.newPage()
    if (p.usuario) await ingresar(page, p.usuario)
    if (p.tema === "claro") {
      await page.addInitScript(() => localStorage.setItem("theme", "light"))
    }
    await page.goto(`${BASE}${p.ruta}`, { waitUntil: "networkidle" })
    if (p.esperar) await page.waitForSelector(p.esperar, { timeout: 30_000 })
    if (p.antes) await p.antes(page)
    await page.waitForTimeout(600)
    const archivo = path.join(SALIDA, `${p.id}--${vista.nombre}.png`)
    await page.screenshot({ path: archivo, fullPage: Boolean(p.paginaCompleta) })
    if (p.publica && vista.nombre === "escritorio") {
      mkdirSync(PUBLICAS, { recursive: true })
      copyFileSync(archivo, path.join(PUBLICAS, `${p.id}.png`))
    }
    console.log(`✓ ${p.id} (${vista.nombre})`)
    await ctx.close()
  }
}

async function main() {
  const filtros = process.argv.slice(2).filter((a) => !a.startsWith("--"))
  mkdirSync(SALIDA, { recursive: true })
  const lista = PANTALLAS.filter((p) => filtros.length === 0 || filtros.some((f) => p.id.includes(f)))
  const proc = await levantarServidor()
  const browser = await chromium.launch()
  let fallas = 0
  try {
    for (const p of lista) {
      try {
        await capturar(browser, p)
      } catch (e) {
        fallas++
        console.error(`✗ ${p.id}: ${(e as Error).message.split("\n")[0]}`)
      }
    }
  } finally {
    await browser.close()
    if (proc) {
      if (process.platform === "win32" && proc.pid) spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { shell: true })
      else proc.kill()
    }
  }
  console.log(`${lista.length - fallas}/${lista.length} pantallas capturadas`)
  if (fallas) process.exitCode = 1
}

main()
