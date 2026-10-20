/**
 * Revisión final: recorre el producto en 1440×900 y 390×844 con el build de
 * producción, guarda capturas en docs/capturas/revision/ y registra todo error
 * de consola, error de página, pedido fallido y respuesta ≥ 400.
 *
 *   npm run build && npx tsx scripts/revision.ts
 *   REVISION_URL=https://… REVISION_SALIDA=carpeta npx tsx scripts/revision.ts   # contra un sitio publicado
 *
 * Recorre: el sitio (con la demo "Nunca se cae": vender, cortar, vender en cola,
 * reconectar), /app con cada usuario de prueba y cada módulo que su rol puede
 * ver, /inversores (12 escenas) y /demo/ferremix (7 escenas).
 */
import { chromium, type Browser, type Page } from "@playwright/test"
import { spawn, spawnSync, type ChildProcess } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { NAVEGACION } from "@/cliente/navegacion"
import { USUARIOS_DEMO } from "@/datos/demo/catalogo"
import { PERMISOS_POR_ROL } from "@/dominio/permisos"

const PUERTO = Number(process.env.PUERTO_REVISION ?? 3410)
const EXTERNA = process.env.REVISION_URL?.replace(/\/$/, "")
const BASE = EXTERNA ?? `http://localhost:${PUERTO}`
const SALIDA = process.env.REVISION_SALIDA ? path.resolve(process.env.REVISION_SALIDA) : path.join(process.cwd(), "docs", "capturas", "revision")
const CLAVE_INVERSORES = process.env.INVERSORES_KEY ?? "quvant-demo"
const VISTAS = [
  { nombre: "escritorio", width: 1440, height: 900, movil: false },
  { nombre: "celular", width: 390, height: 844, movil: true },
] as const
type Vista = (typeof VISTAS)[number]

type Incidente = { seccion: string; vista: string; pagina: string; tipo: string; detalle: string }
const incidentes: Incidente[] = []
const recorridas: { seccion: string; vista: string; id: string; ruta: string; ok: boolean; nota?: string }[] = []
/** [COMPLETAR] visibles en pantalla, por sección y lugar (solo escritorio: el texto es el mismo). */
const completar = new Map<string, Set<string>>()

async function anotarCompletar(page: Page, vista: Vista, seccion: string, lugar: string, selector = "body") {
  if (vista.nombre !== "escritorio") return
  const textos = await page.locator(selector).first().evaluate((el) => (el as HTMLElement).innerText.match(/\[COMPLETAR[^\]]*\]/g) ?? [])
  for (const t of textos) {
    const k = `${seccion} · ${lugar}`
    if (!completar.has(k)) completar.set(k, new Set())
    completar.get(k)!.add(t.replace(/\s+/g, " "))
  }
}

async function servidorArriba() {
  try {
    return (await fetch(`${BASE}/api/salud`)).ok
  } catch {
    return false
  }
}

async function levantarServidor(): Promise<ChildProcess> {
  if (await servidorArriba()) throw new Error(`Ya hay algo en el puerto ${PUERTO}`)
  const proc = spawn("npx", ["next", "start", "-p", String(PUERTO)], {
    shell: true,
    stdio: "ignore",
    env: {
      ...process.env,
      INVERSORES_KEY: process.env.INVERSORES_KEY ?? "quvant-demo",
      PANEL_KEY: process.env.PANEL_KEY ?? "quvant-panel",
      SESION_SECRETO: process.env.SESION_SECRETO ?? "secreto-de-revision-no-usar-en-produccion-0000000",
    },
  })
  for (let i = 0; i < 120; i++) {
    if (await servidorArriba()) return proc
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error("El servidor no levantó en 120 s")
}

/** Contexto nuevo (datos locales limpios) que registra incidentes de la sección. */
async function contexto(browser: Browser, vista: Vista, seccion: string) {
  const ctx = await browser.newContext({
    viewport: { width: vista.width, height: vista.height },
    deviceScaleFactor: 1,
    isMobile: vista.movil,
    hasTouch: vista.movil,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    colorScheme: "dark",
  })
  const page = await ctx.newPage()
  const anotar = (tipo: string, detalle: string) => incidentes.push({ seccion, vista: vista.nombre, pagina: page.url().replace(BASE, "") || "/", tipo, detalle: detalle.slice(0, 500) })
  page.on("console", (m) => {
    if (m.type() === "error") anotar("consola", m.text())
  })
  page.on("pageerror", (e) => anotar("error de página", String(e)))
  page.on("requestfailed", (r) => {
    const motivo = r.failure()?.errorText ?? ""
    // Cancelaciones normales al navegar o al desmontar (prefetch, streaming): no son errores
    if (motivo.includes("ERR_ABORTED") || motivo.includes("NS_BINDING_ABORTED")) return
    anotar("pedido fallido", `${r.method()} ${r.url().replace(BASE, "")} · ${motivo}`)
  })
  page.on("response", (r) => {
    if (r.status() >= 400) anotar(`HTTP ${r.status()}`, `${r.request().method()} ${r.url().replace(BASE, "")}`)
  })
  return { ctx, page }
}

async function capturar(page: Page, vista: Vista, id: string, completa = false) {
  await page.screenshot({ path: path.join(SALIDA, `${id}--${vista.nombre}.jpg`), type: "jpeg", quality: 80, fullPage: completa })
}

async function paso(seccion: string, vista: Vista, id: string, ruta: string, fn: () => Promise<void>) {
  try {
    await fn()
    recorridas.push({ seccion, vista: vista.nombre, id, ruta, ok: true })
    console.log(`✓ ${id} (${vista.nombre})`)
  } catch (e) {
    const nota = (e as Error).message.split("\n")[0]
    recorridas.push({ seccion, vista: vista.nombre, id, ruta, ok: false, nota })
    incidentes.push({ seccion, vista: vista.nombre, pagina: ruta, tipo: "falla del recorrido", detalle: nota })
    console.log(`✗ ${id} (${vista.nombre}): ${nota}`)
  }
}

// ───────── Sitio ─────────

async function sitio(browser: Browser, vista: Vista) {
  const { ctx, page } = await contexto(browser, vista, "Sitio")
  await paso("Sitio", vista, "sitio", "/", async () => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" })
    // Recorrer para que carguen las secciones que se montan al verse
    const alto = await page.evaluate(() => document.body.scrollHeight)
    for (let y = 0; y < alto; y += 600) {
      await page.evaluate((n) => window.scrollTo(0, n), y)
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(1500)
    await page.evaluate(() => window.scrollTo(0, 0))
    await anotarCompletar(page, vista, "Sitio", "/")
    await capturar(page, vista, "sitio-completo", true)
  })
  await paso("Sitio", vista, "sitio-corte", "/#nunca-se-cae", async () => {
    await page.locator("#nunca-se-cae").scrollIntoViewIfNeeded()
    const demo = page.getByTestId("demo-conexion")
    await demo.waitFor({ timeout: 20_000 })
    const estado = demo.getByTestId("demo-estado")
    await demo.getByRole("button").first().click()
    await demo.getByText("sincronizada").first().waitFor({ timeout: 10_000 })
    await demo.getByTestId("demo-interruptor").click()
    await demo.getByRole("button").nth(1).click()
    await demo.getByRole("button").nth(2).click()
    await page.waitForFunction((el) => el?.textContent?.includes("2 ventas en cola"), await estado.elementHandle())
    await demo.scrollIntoViewIfNeeded()
    await capturar(page, vista, "sitio-corte-sin-conexion")
    await demo.getByTestId("demo-interruptor").click()
    await page.waitForFunction((el) => el?.textContent?.trim() === "Sincronizado", await estado.elementHandle(), { timeout: 15_000 })
    await page.waitForTimeout(800)
    await capturar(page, vista, "sitio-corte-reconectado")
  })
  await ctx.close()
}

// ───────── App por usuario ─────────

async function ingresar(page: Page, email: string) {
  await page.goto(`${BASE}/ingresar`)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Contraseña").fill("demo1234")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/(app|ingresar\/verificar)/, { timeout: 20_000 })
  if (page.url().includes("/ingresar/verificar")) {
    const codigo = (await page.getByTestId("codigo-demo").innerText()).replace(/\D/g, "")
    await page.getByLabel("Código de 6 dígitos").fill(codigo)
    await page.getByRole("button", { name: "Verificar" }).click()
    await page.waitForURL(/\/app/, { timeout: 20_000 })
  }
}

function modulosDe(rol: keyof typeof PERMISOS_POR_ROL) {
  const permisos = new Set<string>(PERMISOS_POR_ROL[rol])
  return NAVEGACION.flatMap((g) => g.items).filter((i) => permisos.has(i.permiso))
}

async function app(browser: Browser, vista: Vista) {
  for (const u of USUARIOS_DEMO) {
    const usuario = u.email.split("@")[0]
    const seccion = `App · ${usuario}`
    const { ctx, page } = await contexto(browser, vista, seccion)
    await paso(seccion, vista, `app-${usuario}-ingreso`, "/ingresar", async () => {
      await ingresar(page, u.email)
      await page.waitForSelector("#contenido h1", { timeout: 30_000 })
    })
    for (const m of modulosDe(u.rol)) {
      const nombre = m.href === "/app" ? "tablero" : m.href.replace("/app/", "").replaceAll("/", "-")
      await paso(seccion, vista, `app-${usuario}-${nombre}`, m.href, async () => {
        await page.goto(BASE + m.href)
        await page.waitForSelector("#contenido h1", { timeout: 30_000 })
        if (await page.getByText("Algo falló en esta pantalla").isVisible()) throw new Error("Pantalla de error")
        await page.waitForTimeout(700)
        await capturar(page, vista, `app-${usuario}-${nombre}`)
      })
    }
    await ctx.close()
  }
}

// ───────── Presentaciones ─────────

async function presentacion(browser: Browser, vista: Vista, seccion: string, ruta: string, escenas: string[], prefijo: string, clave?: string) {
  const { ctx, page } = await contexto(browser, vista, seccion)
  await paso(seccion, vista, `${prefijo}-entrada`, ruta, async () => {
    await page.goto(BASE + ruta)
    if (clave) {
      await page.getByLabel("Clave").fill(clave)
      await page.getByRole("button", { name: "Entrar" }).click()
    }
    await page.getByTestId("presentacion-play").waitFor({ timeout: 60_000 })
  })
  for (const [i, nombre] of escenas.entries()) {
    const id = `${prefijo}-${String(i + 1).padStart(2, "0")}-${nombre}`
    await paso(seccion, vista, id, `${ruta}#${i + 1}`, async () => {
      await page.evaluate((n) => (window.location.hash = String(n)), i + 1)
      await page.locator(`[data-escena="${nombre}"]:not([aria-hidden=true])`).waitFor({ timeout: 15_000 })
      await page.waitForTimeout(4500)
      await anotarCompletar(page, vista, seccion, `escena ${i + 1} · ${nombre}`, `[data-escena="${nombre}"]:not([aria-hidden=true])`)
      await capturar(page, vista, id)
    })
  }
  await ctx.close()
}

// ───────── Informe ─────────

function informe(inicio: Date) {
  const porSeccion = new Map<string, { paginas: number; fallas: number; incidentes: number }>()
  for (const r of recorridas) {
    const k = r.seccion
    const v = porSeccion.get(k) ?? { paginas: 0, fallas: 0, incidentes: 0 }
    v.paginas++
    if (!r.ok) v.fallas++
    porSeccion.set(k, v)
  }
  for (const i of incidentes) {
    const v = porSeccion.get(i.seccion)
    if (v && i.tipo !== "falla del recorrido") v.incidentes++
  }
  const lineas = [
    "# Revisión final · recorrido con Playwright",
    "",
    `Fecha: ${inicio.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hourCycle: "h23" })} · ${EXTERNA ? `sitio publicado (${EXTERNA})` : "build de producción (\`next start\`)"} · escritorio 1440×900 y celular 390×844.`,
    "Generado por `scripts/revision.ts`. Se registran errores de consola, errores de página, pedidos fallidos (sin contar cancelaciones normales de navegación) y respuestas HTTP ≥ 400.",
    "",
    "| Sección | Pantallas recorridas (ambos tamaños) | Fallas del recorrido | Errores registrados |",
    "|---|---|---|---|",
    ...[...porSeccion.entries()].map(([s, v]) => `| ${s} | ${v.paginas} | ${v.fallas} | ${v.incidentes} |`),
    "",
    `**Total:** ${recorridas.length} pantallas, ${recorridas.filter((r) => !r.ok).length} fallas, ${incidentes.filter((i) => i.tipo !== "falla del recorrido").length} errores registrados.`,
    "",
    "## [COMPLETAR] visibles en pantalla",
    "",
    "Leídos del texto de cada pantalla (escritorio).",
    "",
    ...(completar.size === 0 ? ["Ninguno."] : [...completar.entries()].map(([k, v]) => `- **${k}:** ${[...v].map((t) => `\`${t}\``).join(" · ")}`)),
    "",
    "## Detalle de errores",
    "",
    incidentes.length === 0 ? "Ninguno." : "| Sección | Tamaño | Página | Tipo | Detalle |\n|---|---|---|---|---|\n" + incidentes.map((i) => `| ${i.seccion} | ${i.vista} | \`${i.pagina}\` | ${i.tipo} | ${i.detalle.replaceAll("|", "\\|").replaceAll("\n", " ")} |`).join("\n"),
    "",
  ]
  writeFileSync(path.join(SALIDA, "RESULTADO.md"), lineas.join("\n"), "utf8")
}

async function main() {
  const inicio = new Date()
  rmSync(SALIDA, { recursive: true, force: true })
  mkdirSync(SALIDA, { recursive: true })
  const proc = EXTERNA ? null : await levantarServidor()
  const browser = await chromium.launch()
  try {
    for (const vista of VISTAS) {
      await sitio(browser, vista)
      await app(browser, vista)
      await presentacion(browser, vista, "Inversores", "/inversores", ["apertura", "problema", "terreno", "solucion", "demo", "diferencial", "modelo", "estado", "hoja-de-ruta", "inversion", "equipo", "cierre"], "inversores", CLAVE_INVERSORES)
      await presentacion(browser, vista, "Demo Ferremix", "/demo/ferremix", ["portada", "su-problema", "su-marca", "un-dia", "corte", "como-empezamos", "socio-fundador"], "demo-ferremix")
    }
  } finally {
    await browser.close()
    if (proc && process.platform === "win32" && proc.pid) spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { shell: true, stdio: "ignore" })
    else proc?.kill()
    informe(inicio)
  }
  console.log(`${recorridas.length} pantallas · ${recorridas.filter((r) => !r.ok).length} fallas · ${incidentes.length} incidentes`)
}

main()
