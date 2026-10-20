// Hoja de contacto: junta varias capturas en una grilla (para revisar una animación cuadro por cuadro).
// Uso: node scripts/marca/hoja-contacto.mjs <salida.png> <columnas> <ancho-celda> <imagen...>
import sharp from "sharp"
const [salida, columnas, ancho, ...imagenes] = process.argv.slice(2)
const cols = Number(columnas), w = Number(ancho), h = Math.round((w * 900) / 1440)
const filas = Math.ceil(imagenes.length / cols)
const capas = await Promise.all(imagenes.map(async (img, i) => ({ input: await sharp(img).resize(w, h).toBuffer(), left: (i % cols) * (w + 6), top: Math.floor(i / cols) * (h + 6) })))
await sharp({ create: { width: cols * (w + 6) - 6, height: filas * (h + 6) - 6, channels: 3, background: "#444" } }).composite(capas).png().toFile(salida)
console.log("✓", salida)
