/**
 * Azar con semilla para la demo: todo lo que se genera sale de un número y siempre sale igual.
 * - `hash(...)`: un entero de 32 bits estable a partir de cualquier combinación de partes.
 * - `aleatorio(semilla)`: una secuencia (mulberry32) para generar listas largas.
 * Así el grupo puede calcular el stock de un producto en una sucursal "a pedido", sin guardarlo.
 */

/** Hash de 32 bits (FNV-1a con mezcla final): estable entre navegadores y entre Node y el navegador. */
export function hash(...partes: (string | number)[]): number {
  let h = 0x811c9dc5
  const texto = partes.join("·")
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** El hash llevado a [0, 1). */
export function u01(...partes: (string | number)[]) {
  return hash(...partes) / 4294967296
}

export type Azar = () => number

/** mulberry32: una secuencia en [0, 1) que siempre empieza igual para la misma semilla. */
export function aleatorio(semilla: number | string): Azar {
  let a = typeof semilla === "number" ? semilla >>> 0 : hash(semilla)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function entre(r: Azar, min: number, max: number) {
  return min + (max - min) * r()
}

export function entero(r: Azar, min: number, max: number) {
  return Math.floor(entre(r, min, max + 1))
}

export function elegir<T>(r: Azar, lista: readonly T[]): T {
  return lista[Math.floor(r() * lista.length) % lista.length]
}

/** Aproximación normal (suma de 3 uniformes), centrada en 0 y con desvío ~1. */
export function normal(r: Azar) {
  return (r() + r() + r() - 1.5) * 2
}

/** Redondea a un múltiplo "de precio" (los precios terminan en 0, 50 o 90 según su tamaño). */
export function redondearPrecio(pesos: number) {
  if (pesos < 1000) return Math.round(pesos / 10) * 10
  if (pesos < 20000) return Math.round(pesos / 50) * 50
  if (pesos < 200000) return Math.round(pesos / 100) * 100 - 10
  return Math.round(pesos / 1000) * 1000
}
