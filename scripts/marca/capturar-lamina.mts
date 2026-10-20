// Captura la lámina del sistema aplicado, los titulares propuestos y la imagen para redes.
// Uso (con la app corriendo): npx tsx scripts/marca/capturar-lamina.mts [url-base] [carpeta-vueltas]
//   url-base: por defecto http://localhost:3010
//   carpeta-vueltas: si se pasa, además guarda una copia numerada de la lámina ahí (bitácora estética)
import { chromium } from "@playwright/test"
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import { join } from "node:path"

const BASE = process.argv[2] ?? "http://localhost:3010"
const VUELTAS = process.argv[3]

const PIEZAS = [
  { ruta: "/marca/sistema", salida: "docs/marca/quvant-sistema.png", ancho: 1600, alto: 1000, escala: 1.5 },
  { ruta: "/marca/sistema/titulares", salida: "docs/marca/quvant-titulares.png", ancho: 1600, alto: 1240, escala: 1.5 },
  { ruta: "/marca/sistema/og", salida: "public/marca/quvant-og.png", ancho: 1200, alto: 630, escala: 1 },
]

const navegador = await chromium.launch()
try {
  for (const p of PIEZAS) {
    const pagina = await navegador.newPage({ viewport: { width: p.ancho, height: p.alto }, deviceScaleFactor: p.escala })
    await pagina.goto(`${BASE}${p.ruta}`, { waitUntil: "networkidle" })
    // Sin el indicador de Next en desarrollo; con las fuentes y las imágenes cargadas.
    await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" })
    await pagina.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(
        [...document.images].map((i) => (i.complete ? Promise.resolve() : new Promise((ok) => ((i.onload = ok), (i.onerror = ok))))),
      )
    })
    await pagina.waitForTimeout(300)
    mkdirSync(p.salida.replace(/\/[^/]+$/, ""), { recursive: true })
    await pagina.locator("[data-lamina]").screenshot({ path: p.salida })
    console.log(`✓ ${p.salida}`)
    await pagina.close()
  }
  if (VUELTAS) {
    mkdirSync(VUELTAS, { recursive: true })
    const n = existsSync(VUELTAS) ? readdirSync(VUELTAS).filter((f) => f.startsWith("lamina-vuelta-")).length + 1 : 1
    copyFileSync(PIEZAS[0].salida, join(VUELTAS, `lamina-vuelta-${n}.png`))
    console.log(`✓ vuelta ${n} en ${VUELTAS}`)
  }
} finally {
  await navegador.close()
}
