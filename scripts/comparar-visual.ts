/**
 * Comparación visual antes/después de un cambio que no debería verse (p. ej. renombrar tokens).
 *
 *   npm run build && npx tsx scripts/comparar-visual.ts <carpeta>      # captura
 *   npx tsx scripts/comparar-visual.ts --comparar <antes> <despues>      # compara byte a byte
 *
 * Reloj fijo, movimiento reducido y los mismos pasos en cada corrida: si el
 * cambio es invisible, los PNG salen idénticos.
 */
import { chromium, type Page } from "@playwright/test"
import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const PUERTO = Number(process.env.PUERTO_COMPARAR ?? 3420)
const BASE = `http://localhost:${PUERTO}`
const RELOJ = "2026-10-07T16:30:00-03:00"

type Caso = { id: string; ruta: string; usuario?: string; tema?: "claro" | "oscuro"; completa?: boolean; clave?: string; escena?: number }

const CASOS: Caso[] = [
  { id: "sitio", ruta: "/", completa: true },
  { id: "marca", ruta: "/marca", completa: true },
  { id: "ingresar-oscuro", ruta: "/ingresar" },
  { id: "ingresar-claro", ruta: "/ingresar", tema: "claro" },
  { id: "inversores-02", ruta: "/inversores", clave: "yunque-demo", escena: 2 },
  { id: "inversores-04", ruta: "/inversores", clave: "yunque-demo", escena: 4 },
  { id: "inversores-08", ruta: "/inversores", clave: "yunque-demo", escena: 8 },
  { id: "inversores-11", ruta: "/inversores", clave: "yunque-demo", escena: 11 },
  { id: "ferremix-02", ruta: "/demo/ferremix", escena: 2 },
  { id: "ferremix-07", ruta: "/demo/ferremix", escena: 7 },
  ...(["oscuro", "claro"] as const).flatMap((tema) => [
    { id: `app-tablero-${tema}`, ruta: "/app", usuario: "dueno@demo.yunque.app", tema },
    { id: `app-usuarios-${tema}`, ruta: "/app/usuarios", usuario: "dueno@demo.yunque.app", tema },
    { id: `app-servicio-${tema}`, ruta: "/app/servicio", usuario: "tecnico@demo.yunque.app", tema },
    { id: `app-reportes-${tema}`, ruta: "/app/reportes", usuario: "dueno@demo.yunque.app", tema, completa: true },
  ]),
]

async function ingresar(page: Page, email: string) {
  await page.goto(`${BASE}/ingresar`)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Contraseña").fill("demo1234")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/(app|ingresar\/verificar)/)
  if (page.url().includes("/ingresar/verificar")) {
    const codigo = (await page.getByTestId("codigo-demo").innerText()).replace(/\D/g, "")
    await page.getByLabel("Código de 6 dígitos").fill(codigo)
    await page.getByRole("button", { name: "Verificar" }).click()
    await page.waitForURL(/\/app/)
  }
}

async function capturar(carpeta: string) {
  mkdirSync(carpeta, { recursive: true })
  const proc = spawn("npx", ["next", "start", "-p", String(PUERTO)], { shell: true, stdio: "ignore", env: { ...process.env, INVERSORES_KEY: "yunque-demo" } })
  for (let i = 0; i < 120 && !(await fetch(`${BASE}/api/salud`).then((r) => r.ok).catch(() => false)); i++) await new Promise((r) => setTimeout(r, 1000))
  const browser = await chromium.launch()
  try {
    for (const c of CASOS) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires" })
      const page = await ctx.newPage()
      await page.clock.install({ time: new Date(RELOJ) })
      if (c.tema === "claro") await page.addInitScript(() => localStorage.setItem("theme", "light"))
      if (c.usuario) await ingresar(page, c.usuario)
      await page.goto(BASE + c.ruta, { waitUntil: "networkidle" })
      if (c.clave) {
        await page.getByLabel("Clave").fill(c.clave)
        await page.getByRole("button", { name: "Entrar" }).click()
      }
      if (c.escena) {
        await page.getByTestId("presentacion-play").waitFor({ timeout: 60_000 })
        await page.evaluate((n) => (window.location.hash = String(n)), c.escena)
      }
      if (c.usuario) await page.waitForSelector("#contenido h1", { timeout: 30_000 })
      await page.waitForTimeout(2500)
      await page.screenshot({ path: path.join(carpeta, `${c.id}.png`), fullPage: Boolean(c.completa), animations: "disabled" })
      console.log(`✓ ${c.id}`)
      await ctx.close()
    }
  } finally {
    await browser.close()
    if (process.platform === "win32" && proc.pid) spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { shell: true, stdio: "ignore" })
    else proc.kill()
  }
}

/** Pixeles distintos y el rectángulo que los contiene (decodifica los PNG en Chromium). */
async function diferencia(page: Page, a: string, b: string) {
  const datos = (p: string) => `data:image/png;base64,${readFileSync(p).toString("base64")}`
  return page.evaluate(
    async ([ua, ub]) => {
      const cargar = (src: string) =>
        new Promise<HTMLImageElement>((ok) => {
          const img = new Image()
          img.onload = () => ok(img)
          img.src = src
        })
      const [ia, ib] = await Promise.all([cargar(ua), cargar(ub)])
      if (ia.width !== ib.width || ia.height !== ib.height) return { pixeles: -1, caja: `${ia.width}×${ia.height} vs ${ib.width}×${ib.height}` }
      const lienzo = (img: HTMLImageElement) => {
        const c = document.createElement("canvas")
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext("2d")!
        ctx.drawImage(img, 0, 0)
        return ctx.getImageData(0, 0, img.width, img.height).data
      }
      const [da, db] = [lienzo(ia), lienzo(ib)]
      let pixeles = 0
      let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
      for (let i = 0; i < da.length; i += 4) {
        if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) {
          pixeles++
          const p = i / 4
          const x = p % ia.width
          const y = Math.floor(p / ia.width)
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
        }
      }
      return { pixeles, caja: pixeles ? `x ${x0}–${x1}, y ${y0}–${y1}` : "" }
    },
    [datos(a), datos(b)] as const,
  )
}

async function comparar(a: string, b: string) {
  let distintos = 0
  const browser = await chromium.launch()
  const page = await browser.newPage()
  // tsx agrega __name() a las funciones con nombre; en el navegador no existe
  await page.evaluate("window.__name = (f) => f")
  for (const archivo of readdirSync(a).filter((f) => f.endsWith(".png"))) {
    const otro = path.join(b, archivo)
    const igual = existsSync(otro) && readFileSync(path.join(a, archivo)).equals(readFileSync(otro))
    if (igual) {
      console.log(`igual    ${archivo}`)
      continue
    }
    distintos++
    const d = existsSync(otro) ? await diferencia(page, path.join(a, archivo), otro) : { pixeles: -1, caja: "falta" }
    console.log(`DISTINTO ${archivo} · ${d.pixeles} pixeles · ${d.caja}`)
  }
  await browser.close()
  console.log(distintos ? `${distintos} captura(s) distintas` : "Todas las capturas son idénticas")
  process.exitCode = distintos ? 1 : 0
}

const args = process.argv.slice(2)
if (args[0] === "--comparar") void comparar(args[1], args[2])
else capturar(args[0] ?? "comparacion")
