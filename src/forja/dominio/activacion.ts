import type { ValorPreferencia } from "@/dominio/tipos"

/**
 * Activación de Forja con la marca de Quvant (tanda 9): la Q se traza, el punto salta y, donde cae, se enciende
 * la primera sucursal; desde ahí, la grilla de puntos se convierte en el mapa con las demás. Cronograma en
 * segundos sobre un solo reloj (GSAP): se puede saltar y filmar cuadro por cuadro. Sin deformar el logo.
 */
export const DURACION_ACTIVACION = 4.5

export const CRONOGRAMA = {
  /** El aro de la Q se traza. */
  aro: { desde: 0.15, hasta: 1.15 },
  /** El punto aparece en su lugar, abajo a la derecha del aro. */
  punto: { desde: 1.0, hasta: 1.25 },
  /** El punto salta en arco hasta la primera sucursal. */
  salto: { desde: 1.3, hasta: 1.95 },
  /** Donde cae, se enciende la primera sucursal. */
  enciende: { desde: 1.95, hasta: 2.3 },
  /** La Q se retira. */
  retiro: { desde: 2.0, hasta: 2.5 },
  /** La grilla se vuelve el mapa: se encienden las demás sucursales, de la más cercana a la más lejana. */
  mapa: { desde: 2.2, hasta: 3.6 },
  /** La placa y la frase. */
  placa: { desde: 2.9, hasta: 3.4 },
  /** Fundido hacia el universo. */
  salida: { desde: 3.95, hasta: DURACION_ACTIVACION },
} as const

/** Avance 0..1 dentro de un tramo del cronograma. */
export function tramo(t: number, r: { desde: number; hasta: number }) {
  if (t <= r.desde) return 0
  if (t >= r.hasta) return 1
  return (t - r.desde) / (r.hasta - r.desde)
}

/** Clave de la preferencia (en el servidor, por persona) que marca la activación como vista. */
export const PREFERENCIA_ACTIVACION = "forja.activacion_vista"

/**
 * Se muestra la primera vez que la persona entra a Forja (o la primera vez que
 * la empresa la activa) y cada vez que la pide desde Extensiones.
 */
export function debeMostrarActivacion(pedida: boolean, preferencias: Record<string, ValorPreferencia>) {
  return pedida || !preferencias[PREFERENCIA_ACTIVACION]
}

export type PuntoMapa = { x: number; y: number }

/**
 * Las sucursales en la caja de la activación (0..1, con margen), con la misma forma que en el mapa:
 * longitud a la derecha, latitud hacia arriba, sin deformar. La primera es la que se enciende con el salto.
 */
export function puntosActivacion(nodos: { lat: number | null; lng: number | null }[], margen = 0.18): PuntoMapa[] {
  const con = nodos.filter((n): n is { lat: number; lng: number } => n.lat !== null && n.lng !== null)
  if (!con.length) return []
  const xs = con.map((n) => n.lng * Math.cos((con[0].lat * Math.PI) / 180))
  const ys = con.map((n) => -n.lat)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const lado = Math.max(x1 - x0, y1 - y0) || 1
  const util = 1 - margen * 2
  return con.map((_, i) => ({
    x: margen + ((xs[i] - x0) / lado) * util + (util - ((x1 - x0) / lado) * util) / 2,
    y: margen + ((ys[i] - y0) / lado) * util + (util - ((y1 - y0) / lado) * util) / 2,
  }))
}
