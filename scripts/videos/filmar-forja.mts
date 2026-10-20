// Filma los videos de Forja cuadro por cuadro (punto 8.2 de PROMPT-QUVANT.md; reemplaza a scripts/grabar-forja.mjs).
//
//   npm run build && npx next start -p 3020          (nunca contra next dev)
//   BASE=http://localhost:3020 npx tsx scripts/videos/filmar-forja.mts [generica] [ferremix]
//
// La página (/forja o /demo/<prospecto>/forja con ?film=1) arma el guion en una línea de tiempo maestra de GSAP
// (src/forja/ui/guion-video.ts) y expone window.__duration y window.__arrancar(). Como MapLibre y three.js tienen su
// propio bucle de animación, lo que se avanza cuadro por cuadro es el reloj de la página entera (requestAnimationFrame,
// performance y temporizadores, con el reloj de Playwright): la línea de tiempo y el mapa lo siguen igual.
// Cada cuadro: un JPEG por pipe a ffmpeg (libx264, -crf 18, BT.709, +faststart, 30 fps). Después, ffprobe.
import { chromium } from "@playwright/test"
import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { once } from "node:events"
import ffmpeg from "ffmpeg-static"
import ffprobe from "ffprobe-static"

const BASE = process.env.BASE ?? "http://localhost:3020"
const FPS = 30
const POSTER_S = 14
const TOMAS = [
  { id: "generica", ruta: "/forja", salida: "public/demo/forja.mp4", poster: "public/demo/forja-poster.jpg" },
  { id: "ferremix", ruta: "/demo/ferremix/forja", salida: "public/demo/forja-ferremix.mp4", poster: null },
] as const

type Ventana = Window & { __duration?: number; __arrancar?: () => void }
const pedidas = process.argv.slice(2)

const navegador = await chromium.launch({ args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11"] })
try {
  for (const toma of TOMAS.filter((t) => !pedidas.length || pedidas.includes(t.id))) {
    const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires", colorScheme: "dark", reducedMotion: "no-preference" })
    await ctx.addInitScript(() => localStorage.setItem("forja.vista", "3d"))
    const page = await ctx.newPage()
    const errores: string[] = []
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 240)))
    // Un reloj fijo: cada vez, el mismo video.
    await page.clock.install({ time: new Date("2026-10-20T15:30:00-03:00") })
    await page.goto(`${BASE}${toma.ruta}?film=1`, { waitUntil: "networkidle", timeout: 120_000 })
    await page.getByTestId("activacion").waitFor({ timeout: 60_000 })
    // El reloj, en pausa; mientras tanto bajan los tiles del mapa y la escena (en tiempo real).
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2000)
    for (let i = 0; i < 600; i++) {
      if (await page.locator("[data-testid=forja-red][data-listo=true]").count()) break
      await page.clock.runFor(50)
      await page.waitForTimeout(80)
    }
    const duracion = await page.evaluate(() => (window as Ventana).__duration ?? 0)
    const total = Math.round(duracion * FPS)
    console.log(`▶ ${toma.id}: ${duracion} s · ${total} cuadros`)
    // Sin devolver nada: una línea de tiempo de GSAP es "thenable" y evaluate esperaría a que termine (con el reloj en pausa, nunca).
    await page.evaluate(() => {
      ;(window as Ventana).__arrancar?.()
    })
    await page.waitForTimeout(150)

    mkdirSync("public/demo", { recursive: true })
    const ff = spawn(
      ffmpeg as unknown as string,
      ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-vf", "scale=in_color_matrix=bt601:in_range=pc:out_color_matrix=bt709:out_range=tv,format=yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-r", String(FPS), "-movflags", "+faststart", toma.salida],
      { stdio: ["pipe", "inherit", "inherit"] },
    )
    for (let f = 0; f < total; f++) {
      await page.clock.runFor(1000 / FPS)
      // Un respiro para que lleguen tiles y datos (no avanza el reloj de la página)
      if (f % 30 === 0) await page.waitForTimeout(40)
      const jpeg = await page.screenshot({ type: "jpeg", quality: 92 })
      if (!ff.stdin.write(jpeg)) await once(ff.stdin, "drain")
      if (toma.poster && f === POSTER_S * FPS) writeFileSync(toma.poster, jpeg)
      if (f % (FPS * 5) === 0) console.log(`  ${Math.round(f / FPS)} s`)
    }
    ff.stdin.end()
    const [codigo] = await once(ff, "close")
    if (codigo !== 0) throw new Error(`ffmpeg terminó con ${codigo}`)
    if (errores.length) console.log("  errores de página:\n  " + errores.join("\n  "))
    const r = spawnSync(ffprobe.path, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt,color_space,color_primaries,color_transfer,color_range,r_frame_rate,nb_frames:format=duration,size", "-of", "json", toma.salida], { encoding: "utf8" })
    console.log(`✓ ${toma.salida}\n${r.stdout}`)
    await ctx.close()
  }
} finally {
  await navegador.close()
}
