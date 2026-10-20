/**
 * Escala de calor de Forja: el calor del trabajo. Es la ÚNICA excepción a la paleta negro y blanco de Quvant,
 * y solo como visualización de datos: discreta, del gris profundo al blanco con un tibio apagado en el medio
 * (el mismo tono del estado de alerta). Documentada en docs/TIPOGRAFIA.md.
 *
 * frío → ascua → brasa → chispa → blanco caliente. El valor de calor es
 * relativo a cada sucursal: ventas de la última hora sobre su promedio por
 * hora hábil (0 = quieta, 1 = un día normal, ≥ 2 = pico). La interpolación es
 * en OKLab para que el degradé avance parejo a la vista (en sRGB se "embarra").
 */
export const PARADAS_CALOR = [
  { calor: 0, hex: "#26262b", nombre: "frío", token: "--frio" },
  { calor: 0.6, hex: "#4a3f38", nombre: "ascua", token: "--ascua" },
  { calor: 1.1, hex: "#8a6a4c", nombre: "brasa", token: "--brasa" },
  { calor: 1.7, hex: "#d7ac68", nombre: "chispa", token: "--chispa" },
  { calor: 2.5, hex: "#ececee", nombre: "blanco caliente", token: "--blanco-caliente" },
] as const

export const CALOR_MAXIMO = PARADAS_CALOR[PARADAS_CALOR.length - 1].calor

export function calorRelativo(ventasUltimaHora: number, promedioHora: number) {
  if (!(promedioHora > 0)) return ventasUltimaHora > 0 ? 1.5 : 0
  return Math.min(CALOR_MAXIMO, Math.max(0, ventasUltimaHora / promedioHora))
}

type Lab = [number, number, number]

function hexARgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const aLineal = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const aSrgb = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, c)) * 255)
}

export function hexAOklab(hex: string): Lab {
  const [r, g, b] = hexARgb(hex).map(aLineal)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}

export function oklabAHex([L, a, b]: Lab) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
  return `#${rgb.map((v) => aSrgb(v).toString(16).padStart(2, "0")).join("")}`
}

const LABS = PARADAS_CALOR.map((p) => hexAOklab(p.hex))

/** Color de la escala para un valor de calor (continuo). */
export function colorCalor(calor: number) {
  const c = Math.min(CALOR_MAXIMO, Math.max(0, Number.isFinite(calor) ? calor : 0))
  for (let i = 1; i < PARADAS_CALOR.length; i++) {
    const hasta = PARADAS_CALOR[i].calor
    if (c <= hasta) {
      const desde = PARADAS_CALOR[i - 1].calor
      const t = (c - desde) / (hasta - desde)
      const [a, b] = [LABS[i - 1], LABS[i]]
      return oklabAHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
    }
  }
  return PARADAS_CALOR[PARADAS_CALOR.length - 1].hex
}

/** Nombre del tramo, para textos alternativos y leyendas ("brasa", "frío", …). */
export function nombreCalor(calor: number) {
  let nombre: string = PARADAS_CALOR[0].nombre
  for (const p of PARADAS_CALOR) if (calor >= p.calor - 0.25) nombre = p.nombre
  return calor <= 0.05 ? "frío" : nombre
}

/** Componentes RGB 0..1 (para materiales de Three.js y capas de deck.gl). */
export function rgbCalor(calor: number): [number, number, number] {
  return hexARgb(colorCalor(calor)).map((v) => v / 255) as [number, number, number]
}

export function rgb255Calor(calor: number): [number, number, number] {
  return hexARgb(colorCalor(calor))
}
