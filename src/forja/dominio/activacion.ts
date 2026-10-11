import type { ValorPreferencia } from "@/dominio/tipos"

/**
 * Activación de Forja: "el yunque se convierte en forja". Cronograma en
 * segundos, todo en función de un solo reloj (así se puede saltar, pausar con
 * la pestaña oculta y grabar cuadro a cuadro).
 */
export const DURACION_ACTIVACION = 4.5

export const CRONOGRAMA = {
  /** El yunque cae y apoya con peso. */
  caida: { desde: 0, hasta: 0.72 },
  /** Temblor de cámara de 2 px al apoyar. */
  temblor: { desde: 0.72, hasta: 0.92 },
  /** Polvo fino que se levanta y se asienta. */
  polvo: { desde: 0.72, hasta: 2.4 },
  /** Chispas desde la cara del yunque (tres golpes). */
  chispas: [0.72, 1.25, 1.8],
  /** Las placas del hogar suben desde abajo, una tras otra. */
  placas: { desde: 0.95, hasta: 1.9 },
  /** Campana y chimenea dibujadas con líneas de luz. */
  campana: { desde: 1.3, hasta: 2.6 },
  /** Se enciende el núcleo de brasa y late. */
  brasa: { desde: 1.9, hasta: 2.5 },
  /** Los bordes del yunque pasan de acero a naranja incandescente. */
  calor: { desde: 1.9, hasta: 3.2 },
  /** "yunque + forja" y la frase. */
  texto: { desde: 2.45, hasta: 2.95 },
  /** La cámara empuja hacia el núcleo de la brasa. */
  empuje: { desde: 3.3, hasta: 4.1 },
  /** El brillo llena la pantalla… */
  brillo: { desde: 3.8, hasta: 4.1 },
  /** …y se abre en un iris hacia el universo del taller. */
  iris: { desde: 4.1, hasta: DURACION_ACTIVACION },
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

/** Vértices de un trazo poligonal del isotipo ("M x,y L x,y … Z"), para extruirlo en 3D. */
export function poligonoDeTrazo(d: string): [number, number][] {
  return [...d.matchAll(/[ML]\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
}
