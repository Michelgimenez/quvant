// Genera los sellos estáticos "funciona con yunque" (SVG) para webs de clientes
// que no usan React. Uso: node scripts/generar-sellos.mjs
import { readFileSync, writeFileSync } from "node:fs"

const trazos = readFileSync("src/components/marca/trazos.ts", "utf8")
const leer = (n) => trazos.match(new RegExp(`export const ${n} = "([^"]+)"`))[1]
const YUNQUE = leer("TRAZO_YUNQUE")
const CHISPA = leer("TRAZO_CHISPA")
const WORDMARK = leer("TRAZO_WORDMARK")

function sello(tema) {
  const claro = tema === "claro"
  const fondo = claro ? "#FFFFFF" : "#0E1116"
  const borde = claro ? "#D5DAE0" : "#2A3039"
  const texto = claro ? "#4A525D" : "#B4BBC4"
  const tinta = claro ? "#0E1116" : "#EEF1F4"
  const chispa = claro ? "#3B6EF5" : "#FFB224"
  const isoX = 96, isoS = 16 / 88, wmX = isoX + 100 * isoS + 4, wmS = 13 / 141.86
  const ancho = Math.ceil(wmX + 651 * wmS + 14)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} 36" width="${ancho}" height="36" role="img" aria-label="funciona con yunque"><title>funciona con yunque</title>
<rect x="0.5" y="0.5" width="${ancho - 1}" height="35" rx="17.5" fill="${fondo}" stroke="${borde}"/>
<text x="14" y="22.2" font-family="Inter, system-ui, -apple-system, Segoe UI, sans-serif" font-size="12" font-weight="500" fill="${texto}">funciona con</text>
<g transform="translate(${isoX} 10) scale(${isoS.toFixed(4)})"><path fill="${tinta}" d="${YUNQUE}"/><path fill="${chispa}" d="${CHISPA}"/></g>
<g transform="translate(${wmX.toFixed(2)} 11.5) scale(${wmS.toFixed(4)})"><path fill="${tinta}" d="${WORDMARK}"/></g>
</svg>
`
}

writeFileSync("public/marca/con-yunque-claro.svg", sello("claro"))
writeFileSync("public/marca/con-yunque-oscuro.svg", sello("oscuro"))
console.log("Sellos generados en public/marca/")
