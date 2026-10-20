/**
 * Utilidades de color para el co-branding: cada organización elige su color de
 * acento y Quvant calcula el texto que va encima para mantener contraste AA.
 */

export function hexARgb(hex: string): [number, number, number] {
  const limpio = hex.trim().replace(/^#/, "")
  const completo = limpio.length === 3 ? limpio.split("").map((c) => c + c).join("") : limpio
  if (!/^[0-9a-fA-F]{6}$/.test(completo)) throw new Error(`Color inválido: ${hex}`)
  const n = parseInt(completo, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function esHexValido(hex: string) {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim())
}

function canalLineal(c: number) {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/** Luminancia relativa WCAG 2.x. */
export function luminancia(hex: string) {
  const [r, g, b] = hexARgb(hex)
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b)
}

/** Relación de contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b: string) {
  const la = luminancia(a)
  const lb = luminancia(b)
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la]
  return (claro + 0.05) / (oscuro + 0.05)
}

/** Blanco y negro Quvant (manual, pág. 8). */
export const BLANCO = "#ececee"
export const NEGRO = "#0d0d0f"

/** Elige el texto (blanco o negro Quvant) con mejor contraste sobre el color dado. */
export function textoSobre(fondo: string) {
  return contraste(fondo, BLANCO) >= contraste(fondo, NEGRO) ? BLANCO : NEGRO
}

/** Nivel WCAG alcanzado por un par de colores para texto normal. */
export function nivelAA(fondo: string, texto: string): "AAA" | "AA" | "AA grande" | "insuficiente" {
  const c = contraste(fondo, texto)
  if (c >= 7) return "AAA"
  if (c >= 4.5) return "AA"
  if (c >= 3) return "AA grande"
  return "insuficiente"
}
