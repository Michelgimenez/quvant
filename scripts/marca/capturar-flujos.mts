// Recorre los flujos de la demo como una persona y captura los momentos clave.
// Uso (con la app en 3010): npx tsx scripts/marca/capturar-flujos.mts <carpeta> [flujos...]
import { chromium, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3010"
const [carpeta = "docs/capturas/quvant/tmp", ...pedidos] = process.argv.slice(2)
mkdirSync(carpeta, { recursive: true })

type Flujo = { empresa: string; pasos: (p: Page, foto: (n: string) => Promise<void>) => Promise<void> }
const ir = (p: Page, modulo: string) => p.getByTestId(`modulo-${modulo}`).click()

const FLUJOS: Record<string, Flujo> = {
  "kiosco-vender": {
    empresa: "kiosco",
    pasos: async (p, foto) => {
      await ir(p, "mostrador")
      const fav = p.getByTestId("favorito")
      await fav.nth(0).click()
      await fav.nth(2).click()
      await fav.nth(2).click()
      await fav.nth(5).click()
      await p.getByTestId("simular-escaneo").click()
      await p.waitForTimeout(700)
      await foto("kiosco-vender")
    },
  },
  "kiosco-sin-conexion": {
    empresa: "kiosco",
    pasos: async (p, foto) => {
      await ir(p, "mostrador")
      await p.getByTestId("cortar-conexion").click()
      await p.getByTestId("favorito").nth(1).click()
      await p.getByTestId("favorito").nth(3).click()
      await p.getByTestId("cobrar-kiosco").click()
      await p.getByTestId("favorito").nth(4).click()
      await p.getByTestId("cobrar-kiosco").click()
      await p.waitForTimeout(400)
      await foto("kiosco-sin-conexion")
      await p.getByTestId("cortar-conexion").click()
      await p.waitForTimeout(1750)
      await foto("kiosco-cola-sincronizada")
    },
  },
  "kiosco-caja": {
    empresa: "kiosco",
    pasos: async (p, foto) => {
      await ir(p, "caja")
      await p.getByTestId("contar-todo").click()
      await p.waitForTimeout(300)
      await foto("kiosco-caja-arqueo")
      await p.getByTestId("cerrar-caja-kiosco").click()
      await p.waitForTimeout(820)
      await foto("kiosco-caja-salto")
    },
  },
  "kiosco-fiado": {
    empresa: "kiosco",
    pasos: async (p, foto) => {
      await ir(p, "fiado")
      await p.getByTestId("anotar-fiado").click()
      await p.waitForTimeout(400)
      await foto("kiosco-fiado")
    },
  },
  "kiosco-precios": {
    empresa: "kiosco",
    pasos: async (p, foto) => {
      await ir(p, "precios")
      await p.waitForTimeout(500)
      await foto("kiosco-precios")
    },
  },
  "ferreteria-presupuesto": {
    empresa: "ferreteria",
    pasos: async (p, foto) => {
      await ir(p, "presupuestos")
      await p.getByTestId("pasar-a-venta").click()
      await p.waitForTimeout(800)
      await foto("ferreteria-presupuesto-venta")
    },
  },
  "ferreteria-transferencia": {
    empresa: "ferreteria",
    pasos: async (p, foto) => {
      await ir(p, "transferencias")
      await p.getByTestId("despachar-transferencia").click()
      await p.waitForTimeout(600)
      await foto("ferreteria-transferencia")
    },
  },
  "ferreteria-servicio": {
    empresa: "ferreteria",
    pasos: async (p, foto) => {
      await ir(p, "servicio")
      await p.getByTestId("nueva-orden").click()
      await p.getByLabel("Cliente").fill("Talleres Ruiz")
      await p.getByLabel("Equipo").fill("Amoladora angular 115 mm")
      await p.getByLabel("Falla").fill("No arranca")
      await p.getByTestId("guardar-orden").click()
      await p.waitForTimeout(500)
      await foto("ferreteria-servicio")
    },
  },
}

const navegador = await chromium.launch()
const errores: string[] = []
try {
  for (const nombre of pedidos.length ? pedidos : Object.keys(FLUJOS)) {
    const f = FLUJOS[nombre]
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "es-AR" })
    const page = await ctx.newPage()
    page.on("pageerror", (e) => errores.push(`${nombre} (página): ${e.message.slice(0, 240)}`))
    page.on("console", (m) => m.type() === "error" && !/instant navigation|React DevTools/.test(m.text()) && errores.push(`${nombre}: ${m.text().slice(0, 240)}`))
    page.on("dialog", (d) => d.accept())
    await page.goto(`${BASE}/demo?empresa=${f.empresa}`, { waitUntil: "networkidle", timeout: 120_000 })
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
    await page.waitForSelector("[data-demo]")
    await f.pasos(page, async (n) => {
      await page.screenshot({ path: `${carpeta}/${n}.png` })
      console.log("✓", n)
    })
    await ctx.close()
  }
} finally {
  await navegador.close()
}
console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de página ni de consola")
