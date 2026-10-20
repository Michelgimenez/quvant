/**
 * El salto (manual, pág. 11): un punto de la grilla se separa, traza un arco punteado y cae adelante
 * como el punto cuadrado del logo. Geometría pura: el mismo cálculo dibuja los cuadros quietos de la
 * lámina, la recompensa de la app y (tanda 8) la filmación cuadro por cuadro, porque todo es función
 * del progreso y no del reloj.
 */
export type Punto = { x: number; y: number }

export type Arco = { desde: Punto; hasta: Punto; control: Punto }

/** Arco cuadrático de `desde` a `hasta`; la altura es una fracción de la distancia (0,45: como el manual). */
export function arcoDeSalto(desde: Punto, hasta: Punto, altura = 0.45): Arco {
  const dx = hasta.x - desde.x
  const dy = hasta.y - desde.y
  const distancia = Math.hypot(dx, dy)
  // En una curva cuadrática el pico llega a la mitad del control: el control va al doble de la altura buscada.
  return {
    desde,
    hasta,
    control: { x: desde.x + dx / 2, y: (desde.y + hasta.y) / 2 - distancia * altura * 2 },
  }
}

export function puntoEnArco({ desde, hasta, control }: Arco, t: number): Punto {
  const u = 1 - t
  return {
    x: u * u * desde.x + 2 * u * t * control.x + t * t * hasta.x,
    y: u * u * desde.y + 2 * u * t * control.y + t * t * hasta.y,
  }
}

export function trazoDeArco({ desde, hasta, control }: Arco) {
  const r = (n: number) => Math.round(n * 100) / 100
  return `M${r(desde.x)} ${r(desde.y)} Q${r(control.x)} ${r(control.y)} ${r(hasta.x)} ${r(hasta.y)}`
}

/** Fracción del largo del arco recorrida hasta el parámetro t (para que el trazo llegue justo hasta el punto). */
export function largoRecorrido(arco: Arco, t: number, muestras = 48) {
  const c = Math.min(1, Math.max(0, t))
  let total = 0
  let hastaT = 0
  let previo = arco.desde
  for (let i = 1; i <= muestras; i++) {
    const s0 = (i - 1) / muestras
    const s1 = i / muestras
    const p = puntoEnArco(arco, s1)
    const tramo = Math.hypot(p.x - previo.x, p.y - previo.y)
    total += tramo
    if (c >= s1) hastaT += tramo
    else if (c > s0) hastaT += tramo * (c - s0) * muestras
    previo = p
  }
  return total === 0 ? 0 : hastaT / total
}

/** Suavizado del vuelo: arranca decidido y aterriza calmo, sin rebote. */
export function suavizarSalto(t: number) {
  const c = Math.min(1, Math.max(0, t))
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

/**
 * Las fases del salto según el progreso total (0 a 1):
 * - despegue (0 → 0,15): el punto de la grilla se vuelve un aro hueco: ahí estaba.
 * - vuelo (0,15 → 1): el cuadrado recorre el arco y el trazo punteado lo sigue.
 */
export function fasesDelSalto(progreso: number) {
  const p = Math.min(1, Math.max(0, progreso))
  const despegue = Math.min(1, p / 0.15)
  const vuelo = suavizarSalto((p - 0.15) / 0.85)
  return { despegue, vuelo, aterrizo: p >= 1 }
}
