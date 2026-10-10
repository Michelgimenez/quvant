import type { Centavos } from "./tipos"

/** Pesos (número con decimales) → centavos enteros. */
export function aCentavos(pesos: number): Centavos {
  return Math.round(pesos * 100)
}

/** Centavos → pesos. */
export function aPesos(c: Centavos) {
  return c / 100
}

const FORMATO_ARS = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const FORMATO_ARS_ENTERO = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 })

/** $ 1.284.500,00 */
export function formatoPesos(c: Centavos, opciones: { sinDecimales?: boolean; signo?: boolean } = {}) {
  const valor = aPesos(c)
  const texto = opciones.sinDecimales ? FORMATO_ARS_ENTERO.format(Math.abs(valor)) : FORMATO_ARS.format(Math.abs(valor))
  const signo = valor < 0 ? "−" : opciones.signo && valor > 0 ? "+" : ""
  return `${signo}$ ${texto}`
}

/** Formato compacto para tableros: $ 1,3 M · $ 845 k */
export function formatoPesosCorto(c: Centavos) {
  const v = aPesos(c)
  const abs = Math.abs(v)
  const signo = v < 0 ? "−" : ""
  if (abs >= 1_000_000_000) return `${signo}$ ${(abs / 1_000_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} mil M`
  if (abs >= 1_000_000) return `${signo}$ ${(abs / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`
  if (abs >= 10_000) return `${signo}$ ${(abs / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 0 })} k`
  return `${signo}$ ${FORMATO_ARS_ENTERO.format(abs)}`
}

export function formatoCantidad(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 3 })
}

export function formatoPorcentaje(n: number, decimales = 1) {
  return `${n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} %`
}

/** Redondea cantidades a 3 decimales (evita 0,30000000000000004). */
export function redondearCantidad(n: number) {
  return Math.round(n * 1000) / 1000
}
