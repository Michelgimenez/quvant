// Filma los videos de Quvant cuadro por cuadro (punto 8.2 de PROMPT-QUVANT.md).
//
//   npm run build && npx next start -p 3020          (nunca contra next dev)
//   BASE=http://localhost:3020 npx tsx scripts/videos/filmar.mts [video...] [--cuadros 0,12.5,30]
//
// Cada video es una página (/videos/<id>?film=1) con una línea de tiempo maestra de GSAP que expone
// window.__ready, window.__duration y window.__seek(t). Por cada cuadro (30 fps): __seek(t), dos
// requestAnimationFrame, un JPEG por pipe a ffmpeg (libx264, -crf 18, BT.709, +faststart). Después, ffprobe.
// Con --cuadros solo guarda esos instantes como PNG en logs/cuadros/ (para revisar sin codificar).
import { chromium, type Page } from "@playwright/test"
import { spawn, spawnSync } from "node:child_process"
import { mkdirSync } from "node:fs"
import { once } from "node:events"
import ffmpeg from "ffmpeg-static"
import ffprobe from "ffprobe-static"

const BASE = process.env.BASE ?? "http://localhost:3020"
const FPS = 30
const VIDEOS = {
  "quvant-60s": { ancho: 1920, alto: 1080, salida: "public/videos/quvant-60s.mp4" },
  "quvant-60s-vertical": { ancho: 1080, alto: 1920, salida: "public/videos/quvant-60s-vertical.mp4" },
  "cambio-de-empresa": { ancho: 1920, alto: 1080, salida: "public/videos/quvant-cambio-de-empresa.mp4" },
} as const
type IdVideo = keyof typeof VIDEOS

const args = process.argv.slice(2)
const iCuadros = args.indexOf("--cuadros")
const cuadros = iCuadros >= 0 ? args[iCuadros + 1].split(",").map(Number) : null
const pedidos = args.filter((a, i) => !a.startsWith("--") && i !== iCuadros + 1) as IdVideo[]
const lista = (pedidos.length ? pedidos : (Object.keys(VIDEOS) as IdVideo[])).filter((v) => v in VIDEOS)

type Ventana = Window & { __ready?: boolean; __duration?: number; __seek?: (t: number) => void }

async function ir(page: Page, t: number) {
  await page.evaluate((x) => (window as Ventana).__seek!(x), t)
  // Dos cuadros de animación: React termina de pintar lo que cambió en el salto de tiempo.
  await page.evaluate(() => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok()))))
}

const navegador = await chromium.launch()
try {
  for (const id of lista) {
    const v = VIDEOS[id]
    const ctx = await navegador.newContext({ viewport: { width: v.ancho, height: v.alto }, deviceScaleFactor: 1, colorScheme: "dark", locale: "es-AR", reducedMotion: "no-preference" })
    const page = await ctx.newPage()
    const errores: string[] = []
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 240)))
    await page.goto(`${BASE}/videos/${id}?film=1`, { waitUntil: "networkidle", timeout: 120_000 })
    await page.waitForFunction(() => (window as Ventana).__ready === true, null, { timeout: 60_000 })
    const duracion = await page.evaluate(() => (window as Ventana).__duration ?? 0)
    const total = Math.round(duracion * FPS)
    console.log(`▶ ${id}: ${duracion.toFixed(2)} s · ${total} cuadros · ${v.ancho}×${v.alto}`)

    if (cuadros) {
      // Se avanza cuadro por cuadro igual que al filmar (un salto grande dispararía los clics antes de que React
      // pinte el módulo), pero solo se guardan los instantes pedidos.
      mkdirSync("logs/cuadros", { recursive: true })
      const pedidosCuadro = new Map(cuadros.map((t) => [Math.round(t * FPS), t]))
      const ultimo = Math.max(...pedidosCuadro.keys())
      for (let i = 0; i <= ultimo; i++) {
        await ir(page, i / FPS)
        const t = pedidosCuadro.get(i)
        if (t === undefined) continue
        await page.screenshot({ path: `logs/cuadros/${id}-${String(t).replace(".", "_")}.png` })
        console.log("  ✓ cuadro", t)
      }
      if (errores.length) console.log("  errores de página:\n  " + errores.join("\n  "))
      await ctx.close()
      continue
    }

    mkdirSync("public/videos", { recursive: true })
    const ff = spawn(
      ffmpeg as unknown as string,
      [
        "-y",
        "-loglevel", "error",
        "-f", "image2pipe",
        "-framerate", String(FPS),
        "-c:v", "mjpeg",
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "18",
        "-vf", "scale=in_color_matrix=bt601:in_range=pc:out_color_matrix=bt709:out_range=tv,format=yuv420p",
        "-colorspace", "bt709",
        "-color_primaries", "bt709",
        "-color_trc", "bt709",
        "-color_range", "tv",
        "-r", String(FPS),
        "-movflags", "+faststart",
        v.salida,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    )
    const inicio = Date.now()
    for (let i = 0; i < total; i++) {
      await ir(page, i / FPS)
      const jpeg = await page.screenshot({ type: "jpeg", quality: 92 })
      if (!ff.stdin.write(jpeg)) await once(ff.stdin, "drain")
      if (i % (FPS * 5) === 0) console.log(`  ${(i / FPS).toFixed(0).padStart(3)} s · ${Math.round((Date.now() - inicio) / 1000)} s de reloj`)
    }
    ff.stdin.end()
    const [codigo] = await once(ff, "close")
    if (codigo !== 0) throw new Error(`ffmpeg terminó con ${codigo}`)
    if (errores.length) console.log("  errores de página:\n  " + errores.join("\n  "))

    // La verificación: lo que dice ffprobe del archivo.
    const r = spawnSync(ffprobe.path, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt,color_space,color_primaries,color_transfer,color_range,r_frame_rate,nb_frames:format=duration,size", "-of", "json", v.salida], { encoding: "utf8" })
    console.log(`✓ ${v.salida}\n${r.stdout}`)
    await ctx.close()
  }
} finally {
  await navegador.close()
}
