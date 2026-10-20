// Genera todas las versiones del logo de Quvant que usa la web, desde los archivos de marca/.
// Uso: node scripts/marca/generar-marca.mjs
//
// Fuentes (no se tocan sus formas):
//   marca/quvant-q-cromada-del-manual.png   la Q cromada oficial, extraída sin cambios del PDF del manual (2000×2000, con alfa)
//   marca/quvant-logotipo-provisorio.svg    QUVANT en Michroma +0,18 em, PROVISORIO hasta que llegue el archivo oficial
//
// Salidas: public/marca/quvant-*, src/app/(íconos) no se tocan acá (el cableado es de la tanda 2),
// y src/components/marca/q-geometria.ts con las medidas del PNG para animar con máscaras.
import sharp from "sharp"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"

const Q = "marca/quvant-q-cromada-del-manual.png"
const LOGOTIPO = "marca/quvant-logotipo-provisorio.svg"
const SALIDA = "public/marca"
mkdirSync(SALIDA, { recursive: true })

const NEGRO = "#0D0D0F"
const BLANCO = "#ECECEE"

// ───────── Geometría de la Q, medida sobre el alfa del original ─────────
const { data: px, info } = await sharp(Q).raw().toBuffer({ resolveWithObject: true })
const L = info.width
const alfa = (x, y) => px[(y * L + x) * info.channels + 3]
function transiciones(fijo, horizontal) {
  const t = []
  let dentro = false
  for (let i = 0; i < L; i++) {
    const v = (horizontal ? alfa(i, fijo) : alfa(fijo, i)) > 127
    if (v !== dentro) {
      t.push(i)
      dentro = v
    }
  }
  return t
}
// El punto: el cuadrado de abajo a la derecha, separado del resto.
let puntoX = L - 1
while (alfa(puntoX - 1, L - 20) > 127) puntoX--
let puntoY = L - 1
while (alfa(L - 20, puntoY - 1) > 127) puntoY--
// El aro: por la fila de su centro (la fila donde el aro es más ancho).
let filaCentro = 0
let anchoMax = 0
for (let y = 0; y < puntoY; y++) {
  const t = transiciones(y, true)
  if (t.length >= 4 && t[3] - t[0] > anchoMax) {
    anchoMax = t[3] - t[0]
    filaCentro = y
  }
}
const [exIzq, inIzq, inDer, exDer] = transiciones(filaCentro, true)
const centro = (exIzq + exDer) / 2
const geometria = {
  lado: L,
  aro: { cx: centro, cy: centro, radioExterior: (exDer - exIzq) / 2, radioInterior: (inDer - inIzq) / 2 },
  punto: { x: puntoX, y: puntoY, lado: L - puntoX },
}
console.log("Geometría de la Q:", JSON.stringify(geometria))

// ───────── La Q cromada (principal) en los tamaños que usa la web ─────────
const png = (s) => s.png({ compressionLevel: 9, adaptiveFiltering: true })
await png(sharp(Q)).toFile(`${SALIDA}/quvant-q-cromada.png`)
for (const t of [1024, 512, 256, 128, 64]) await png(sharp(Q).resize(t, t, { kernel: "lanczos3" })).toFile(`${SALIDA}/quvant-q-cromada-${t}.png`)

// ───────── La Q en una tinta (blanca y negra), desde el alfa del original ─────────
const alfaOriginal = await sharp(Q).extractChannel("alpha").toBuffer()
async function unaTinta(color, t) {
  const capa = await sharp({ create: { width: L, height: L, channels: 3, background: color } })
    .joinChannel(alfaOriginal)
    .png()
    .toBuffer()
  return png(sharp(capa).resize(t, t, { kernel: "lanczos3" }))
}
for (const [nombre, color] of [["blanca", BLANCO], ["negra", NEGRO]])
  for (const t of [1024, 256, 64]) await (await unaTinta(color, t)).toFile(`${SALIDA}/quvant-q-${nombre}-${t}.png`)

// ───────── El logotipo QUVANT (provisorio) en blanco y en negro ─────────
const logotipo = readFileSync(LOGOTIPO, "utf8")
const caja = logotipo.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number)
const conTinta = (color) => logotipo.replace(/fill="#0D0D0F"/, `fill="${color}"`)
writeFileSync(`${SALIDA}/quvant-logotipo-blanco.svg`, conTinta(BLANCO))
writeFileSync(`${SALIDA}/quvant-logotipo-negro.svg`, conTinta(NEGRO))

// ───────── La firma horizontal: la Q + QUVANT, con las proporciones del manual ─────────
// Medidas en la firma del manual (págs. 2, 5 y 6), en lados de la Q (S):
//   mayúsculas = 0,46 S · separación Q → letras = 0,435 S · letras centradas en el alto del cuadrado (tope a 0,258 S).
// En Michroma, la altura de mayúsculas es 0,75 em y la T va de 0 a 0,75: el tope de la T marca la altura.
const S = 1000
const ALTURA_MAYUSCULA = 0.46 * S
const capLogotipo = 112.5 // unidades del SVG del logotipo (0,75 em × 150)
const topeT = 59.25 // tope de la T en las unidades del SVG del logotipo
const k = ALTURA_MAYUSCULA / capLogotipo
const textoX = S + 0.435 * S
const textoY = 0.258 * S
const firmaAncho = Math.ceil(textoX + caja[2] * k)
function firmaSvg(qDataUri, color) {
  const cuerpo = logotipo
    .replace(/^[\s\S]*?<g fill="#0D0D0F">/, "")
    .replace(/<\/g>\s*<\/svg>\s*$/, "")
  const tx = textoX - caja[0] * k
  const ty = textoY - topeT * k
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${firmaAncho} ${S}" width="${firmaAncho}" height="${S}" role="img" aria-label="Quvant"><title>Quvant</title>
<image href="${qDataUri}" x="0" y="0" width="${S}" height="${S}"/>
<g fill="${color}" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(5)})">${cuerpo}</g>
</svg>
`
}
const dataUri = async (s) => `data:image/png;base64,${(await s.toBuffer()).toString("base64")}`
const qCromada1024 = await dataUri(png(sharp(Q).resize(1024, 1024, { kernel: "lanczos3" })))
const qNegra1024 = await dataUri(await unaTinta(NEGRO, 1024))
const firmaPrincipal = firmaSvg(qCromada1024, BLANCO)
const firmaNegativa = firmaSvg(qNegra1024, NEGRO)
writeFileSync(`${SALIDA}/quvant-firma.svg`, firmaPrincipal)
writeFileSync(`${SALIDA}/quvant-firma-negativa.svg`, firmaNegativa)
for (const [nombre, svg] of [["quvant-firma", firmaPrincipal], ["quvant-firma-negativa", firmaNegativa]])
  await png(sharp(Buffer.from(svg), { density: 72 * (2400 / firmaAncho) * 1.5 }).resize(2400)).toFile(`${SALIDA}/${nombre}-2400.png`)

// ───────── Íconos: la Q cromada sobre negro (favicon, app, PWA) ─────────
// La Q ocupa el 74 % del lado (68 % en el maskable, que recorta en círculo) y queda centrada por su caja completa.
async function icono(t, { proporcion = 0.74, redondeo = 0.22 } = {}) {
  const q = Math.round(t * proporcion)
  const margen = Math.round((t - q) / 2)
  const r = Math.round(t * redondeo)
  const fondo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}"><rect width="${t}" height="${t}" rx="${r}" fill="${NEGRO}"/></svg>`,
  )
  const qPng = await sharp(Q).resize(q, q, { kernel: "lanczos3" }).png().toBuffer()
  return png(sharp(fondo).composite([{ input: qPng, left: margen, top: margen }]))
}
const favicons = {}
for (const t of [16, 32, 48]) {
  favicons[t] = await (await icono(t, { proporcion: 0.8, redondeo: 0.2 })).toBuffer()
  writeFileSync(`${SALIDA}/quvant-favicon-${t}.png`, favicons[t])
}
await (await icono(180, { redondeo: 0 })).toFile(`${SALIDA}/quvant-apple-icon-180.png`)
for (const t of [192, 512, 1024]) await (await icono(t)).toFile(`${SALIDA}/quvant-icono-${t}.png`)
await (await icono(512, { proporcion: 0.6, redondeo: 0 })).toFile(`${SALIDA}/quvant-icono-maskable-512.png`)

// favicon.ico con 16, 32 y 48 (PNG adentro del contenedor ICO)
const tamanos = [16, 32, 48]
const cabecera = Buffer.alloc(6 + 16 * tamanos.length)
cabecera.writeUInt16LE(0, 0)
cabecera.writeUInt16LE(1, 2)
cabecera.writeUInt16LE(tamanos.length, 4)
let desplazamiento = cabecera.length
tamanos.forEach((t, i) => {
  const o = 6 + i * 16
  cabecera.writeUInt8(t, o)
  cabecera.writeUInt8(t, o + 1)
  cabecera.writeUInt16LE(1, o + 4)
  cabecera.writeUInt16LE(32, o + 6)
  cabecera.writeUInt32LE(favicons[t].length, o + 8)
  cabecera.writeUInt32LE(desplazamiento, o + 12)
  desplazamiento += favicons[t].length
})
writeFileSync(`${SALIDA}/quvant-favicon.ico`, Buffer.concat([cabecera, ...tamanos.map((t) => favicons[t])]))

// Las medidas para los componentes: la Q (para animarla con máscaras) y la firma (para armarla con dos <img>).
const firma = {
  ancho: firmaAncho / S,
  logotipo: { x: textoX / S, y: (textoY - (topeT - caja[1]) * k) / S, ancho: (caja[2] * k) / S, alto: (caja[3] * k) / S },
  resguardo: (2 * geometria.punto.lado) / L,
}
writeFileSync(
  "src/components/marca/q-geometria.ts",
  `// Generado por scripts/marca/generar-marca.mjs a partir del PNG oficial de la Q. No editar a mano.
// Q_GEOMETRIA: píxeles del archivo original (${L}×${L}); sirve para animar con máscaras sin redibujar el logo.
// FIRMA_PROPORCIONES: en lados de la Q (la Q mide 1); el área de resguardo es el doble del lado del punto.
export const Q_GEOMETRIA = ${JSON.stringify(geometria, null, 2)} as const

export const FIRMA_PROPORCIONES = ${JSON.stringify(firma, null, 2)} as const
`,
)

console.log(`Listo: versiones de la marca en ${SALIDA}/ (firma ${firmaAncho}×${S} unidades).`)
