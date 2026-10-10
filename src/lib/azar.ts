/**
 * Generador pseudoaleatorio determinístico (mulberry32). Misma semilla →
 * mismos datos de demo en cualquier navegador, en los tests y en las capturas.
 */
export class Azar {
  private estado: number

  constructor(semilla: number | string) {
    this.estado = typeof semilla === "number" ? semilla >>> 0 : hashTexto(semilla)
  }

  /** Número en [0, 1). */
  siguiente() {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0
    let t = this.estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Entero en [min, max] (ambos incluidos). */
  entero(min: number, max: number) {
    return min + Math.floor(this.siguiente() * (max - min + 1))
  }

  decimal(min: number, max: number) {
    return min + this.siguiente() * (max - min)
  }

  probabilidad(p: number) {
    return this.siguiente() < p
  }

  elegir<T>(lista: readonly T[]): T {
    return lista[Math.floor(this.siguiente() * lista.length)]
  }

  /** Elige según pesos relativos. */
  ponderado<T>(opciones: readonly (readonly [T, number])[]): T {
    const total = opciones.reduce((s, [, p]) => s + p, 0)
    let r = this.siguiente() * total
    for (const [valor, peso] of opciones) {
      r -= peso
      if (r <= 0) return valor
    }
    return opciones[opciones.length - 1][0]
  }

  mezclar<T>(lista: readonly T[]): T[] {
    const copia = [...lista]
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(this.siguiente() * (i + 1))
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
    }
    return copia
  }

  /** Distribución normal aproximada (Box-Muller). */
  normal(media = 0, desvio = 1) {
    const u = Math.max(this.siguiente(), 1e-9)
    const v = this.siguiente()
    return media + desvio * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  /** UUID v4 con formato válido, determinístico. */
  uuid() {
    const h = () => Math.floor(this.siguiente() * 0x10000).toString(16).padStart(4, "0")
    const variante = (8 + Math.floor(this.siguiente() * 4)).toString(16)
    return `${h()}${h()}-${h()}-4${h().slice(1)}-${variante}${h().slice(1)}-${h()}${h()}${h()}`
  }
}

export function hashTexto(texto: string) {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** UUID determinístico a partir de un texto (útil para ids estables en la demo). */
export function uuidDe(texto: string) {
  return new Azar(texto).uuid()
}
