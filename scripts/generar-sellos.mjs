// Genera los sellos estáticos "Funciona con Quvant" (SVG) para webs de clientes que no usan React.
// Llevan la Q incrustada (PNG de 64 px) y el logotipo como trazados: no dependen de ninguna fuente.
// Uso: node scripts/generar-sellos.mjs (después de scripts/marca/generar-marca.mjs)
import { readFileSync, writeFileSync } from "node:fs"

const logotipo = readFileSync("marca/quvant-logotipo-provisorio.svg", "utf8")
const caja = logotipo.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number)
const trazos = logotipo.replace(/^[\s\S]*?<g fill="#0D0D0F">/, "").replace(/<\/g>\s*<\/svg>\s*$/, "")
const q = (tinta) => `data:image/png;base64,${readFileSync(`public/marca/quvant-q-${tinta}-64.png`).toString("base64")}`
const qCromada = `data:image/png;base64,${readFileSync("public/marca/quvant-q-cromada-64.png").toString("base64")}`

function sello(tema) {
  const claro = tema === "claro"
  const fondo = claro ? "#ECECEE" : "#0D0D0F"
  const borde = claro ? "#CDCDD1" : "#26262B"
  const texto = claro ? "#55555B" : "#9C9CA3"
  const tinta = claro ? "#0D0D0F" : "#ECECEE"
  const isotipo = claro ? q("negra") : qCromada
  // "Funciona con" en mayúsculas espaciadas; la Q de 18 px; QUVANT con 10 px de alto de caja.
  const textoAncho = 94
  const qX = 14 + textoAncho + 10
  const altoLogotipo = 10
  const k = altoLogotipo / caja[3]
  const lX = qX + 18 + 7
  const ancho = Math.ceil(lX + caja[2] * k + 14)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} 36" width="${ancho}" height="36" role="img" aria-label="Funciona con Quvant"><title>Funciona con Quvant</title>
<rect x="0.5" y="0.5" width="${ancho - 1}" height="35" fill="${fondo}" stroke="${borde}"/>
<text x="14" y="21.6" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="9.5" font-weight="500" letter-spacing="1.9" fill="${texto}">FUNCIONA CON</text>
<image href="${isotipo}" x="${qX}" y="9" width="18" height="18"/>
<g fill="${tinta}" transform="translate(${(lX - caja[0] * k).toFixed(2)} ${(13 - caja[1] * k).toFixed(2)}) scale(${k.toFixed(5)})">${trazos}</g>
</svg>
`
}

writeFileSync("public/marca/con-quvant-claro.svg", sello("claro"))
writeFileSync("public/marca/con-quvant-oscuro.svg", sello("oscuro"))
console.log("Sellos generados en public/marca/con-quvant-*.svg")
