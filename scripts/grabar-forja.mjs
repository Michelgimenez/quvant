/**
 * Videos de Forja (1920×1080, 60 fps, H.264), cuadro a cuadro: el reloj de la
 * página está en pausa y se avanza 1/60 s por cuadro, así el video sale fluido
 * aunque el render vaya más lento que el tiempo real.
 *
 *   public/demo/forja.mp4              → toma genérica (Ferretería Industrial Demo): sitio e /inversores
 *   public/demo/forja-<prospecto>.mp4  → toma para cada prospecto con demo de Forja (sello PROPUESTA)
 *   public/demo/forja-poster.jpg       → cuadro de la toma genérica para el póster del video
 *
 * Misma secuencia en todas: la activación, la red con transferencias, la
 * entrada a una sucursal, una venta en el mostrador, un rack que pasa a
 * crítico y la repetición del día a 1200×.
 *
 * Uso: npm run build && npm run grabar-forja            (todas las tomas)
 *      npm run grabar-forja -- generica                 (solo la genérica)
 * Levanta `next start` en el puerto 3440 si no hay un servidor corriendo.
 * Chromium con aceleración de GPU si el equipo la tiene (si no, igual sale
 * fluido: cada cuadro espera su render). GRABAR_VENTANA=1 abre una ventana.
 */
import { chromium } from "@playwright/test"
import ffmpeg from "ffmpeg-static"
import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { CLIENTES } from "../src/config/clientes/index.ts"

const PUERTO = Number(process.env.PUERTO_GRABAR ?? 3440)
const BASE = `http://localhost:${PUERTO}`
const FPS = 60
const DURACION = Number(process.env.DURACION_GRABAR ?? 46) // segundos
const DESTINO = path.join(process.cwd(), "public", "demo")

const tomas = [
  { id: "generica", ruta: "/forja", salida: "forja.mp4", poster: "forja-poster.jpg" },
  ...Object.values(CLIENTES)
    .filter((c) => c.forja)
    .map((c) => ({ id: c.slug, ruta: `/demo/${c.slug}/forja`, salida: `forja-${c.slug}.mp4`, poster: null })),
]

/** Guion: segundo → acción. La activación arranca sola al entrar. */
const GUION = [
  { s: 6.2, hacer: (p) => p.locator("[data-nodo=CC] button").hover({ force: true }) },
  { s: 8.8, hacer: (p) => p.mouse.move(960, 1060) },
  { s: 9.4, hacer: (p) => p.locator("[data-nodo=CC] button").click({ force: true }) },
  { s: 16.5, hacer: (p) => p.evaluate(() => window.__forjaGuion?.vender("CC", 2)) },
  { s: 18.6, hacer: (p) => p.evaluate(() => window.__forjaGuion?.vender("CC", 1)) },
  { s: 20.4, hacer: (p) => p.getByTestId("zona-deposito").click() },
  { s: 21.8, hacer: (p) => p.evaluate(() => window.__forjaGuion?.quiebre("CC", 3)) },
  { s: 25.4, hacer: (p) => p.keyboard.press("Escape") },
  { s: 26.2, hacer: (p) => p.keyboard.press("Escape") },
  { s: 29.6, hacer: (p) => p.getByTestId("velocidad-1200").click() },
  { s: 30.0, hacer: (p) => p.getByTestId("repetir").click() },
]
const POSTER_S = 14

async function servidorArriba() {
  try {
    return (await fetch(`${BASE}/api/salud`)).ok
  } catch {
    return false
  }
}

async function levantarServidor() {
  if (await servidorArriba()) return null
  const proc = spawn("npx", ["next", "start", "-p", String(PUERTO)], { shell: true, stdio: "ignore", env: { ...process.env, SESION_SECRETO: process.env.SESION_SECRETO ?? "secreto-de-videos-no-usar-en-produccion-0000000" } })
  for (let i = 0; i < 120; i++) {
    if (await servidorArriba()) return proc
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error("El servidor no levantó en 120 s")
}

function codificador(archivo) {
  const proc = spawn(ffmpeg, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", archivo], { stdio: ["pipe", "inherit", "inherit"] })
  const fin = new Promise((ok, mal) => proc.on("close", (c) => (c === 0 ? ok() : mal(new Error(`ffmpeg terminó con ${c}`)))))
  return {
    escribir: (buf) => new Promise((ok) => (proc.stdin.write(buf) ? ok() : proc.stdin.once("drain", ok))),
    cerrar: () => {
      proc.stdin.end()
      return fin
    },
  }
}

async function grabar(browser, toma) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires", reducedMotion: "no-preference" })
  await ctx.addInitScript(() => localStorage.setItem("forja.vista", "3d"))
  const page = await ctx.newPage()
  await page.clock.install({ time: new Date() })
  await page.goto(`${BASE}${toma.ruta}?grabar=1`, { waitUntil: "networkidle" })
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2")
    const ext = gl?.getExtension("WEBGL_debug_renderer_info")
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "sin WebGL2"
  })
  console.log(`  render: ${gpu}`)
  await page.getByTestId("activacion").waitFor({ timeout: 60_000 })

  // Reloj en pausa; la red y la descarga de la escena siguen en tiempo real
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2000)
  for (let i = 0; i < 600; i++) {
    if (await page.locator("[data-testid=activacion][data-listo=true]").count()) break
    await page.clock.runFor(50)
    await page.waitForTimeout(80)
  }

  // La activación empieza recién ahora: el primer cuadro es su primer instante
  await page.evaluate(() => window.__forjaGuion?.arrancar())
  await page.waitForTimeout(150)
  mkdirSync(DESTINO, { recursive: true })
  const salida = codificador(path.join(DESTINO, toma.salida))
  const total = DURACION * FPS
  let siguiente = 0
  for (let f = 0; f < total; f++) {
    const s = f / FPS
    while (siguiente < GUION.length && GUION[siguiente].s <= s) {
      await GUION[siguiente].hacer(page).catch((e) => console.warn(`  aviso: ${e.message.split("\n")[0]}`))
      siguiente++
    }
    await page.clock.runFor(1000 / FPS)
    // Un respiro para que lleguen tiles y datos (no avanza el reloj de la página)
    if (f % 30 === 0) await page.waitForTimeout(40)
    const cuadro = await page.screenshot({ type: "jpeg", quality: 92 })
    await salida.escribir(cuadro)
    if (toma.poster && f === POSTER_S * FPS) writeFileSync(path.join(DESTINO, toma.poster), cuadro)
    if (f % (FPS * 5) === 0) console.log(`  ${toma.id}: ${Math.round(s)} s`)
  }
  await salida.cerrar()
  await ctx.close()
  console.log(`✓ public/demo/${toma.salida}`)
}

const filtro = process.argv.slice(2)
const proc = await levantarServidor()
const browser = await chromium.launch({
  headless: process.env.GRABAR_VENTANA !== "1",
  args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11", "--enable-features=Vulkan"],
})
try {
  for (const toma of tomas) if (!filtro.length || filtro.includes(toma.id)) await grabar(browser, toma)
} finally {
  await browser.close()
  if (proc) {
    // En Windows hay que matar el árbol (npx → next start)
    if (process.platform === "win32" && proc.pid) spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { shell: true, stdio: "ignore" })
    else proc.kill()
  }
}
