import type { IdEmpresa } from "./empresas"
import { inicioDePasos, type PasoRecorrido } from "./recorrido"

/**
 * Los guiones de los videos (punto 8.2 de PROMPT-QUVANT.md). Cada video es una página (/videos/<id>) con una línea
 * de tiempo maestra de GSAP: los pasos manejan la demo real (los mismos botones que tocaría una persona) y las
 * "pantallas" (la firma, "Probá la demo" y el cierre) se superponen a la demo. Con ?film=1 se filma cuadro por cuadro.
 */
export type Pantalla = "firma" | "probala" | "cierre"

export type PasoPelicula = PasoRecorrido & {
  /** Una pantalla de marca encima de la demo (sin empresa ni módulo). */
  pantalla?: Pantalla
}

export type IdVideo = "quvant-60s" | "quvant-60s-vertical" | "cambio-de-empresa"
export type Formato = "horizontal" | "vertical"

export type Guion = {
  pasos: PasoPelicula[]
  /** ¿Avanza el reloj de la demo con el video? (en el loop, no: el último cuadro tiene que ser igual al primero). */
  relojVivo: boolean
  subtitulos: boolean
}

const fav = (n: number) => `favorito@${n}`

/** "Quvant en 60 segundos": la firma, el kiosco sin conexión y con la caja justa, el salto a las otras tres empresas y el cierre. */
const SESENTA: PasoPelicula[] = [
  { empresa: null, modulo: null, pantalla: "firma", duracion: 5, texto: "" },
  {
    empresa: "kiosco",
    modulo: "mostrador",
    duracion: 9,
    texto: "Un kiosco vende con un toque. Se corta internet y sigue vendiendo.",
    acciones: [
      { en: 0.9, testid: "cortar-conexion" },
      { en: 1.8, testid: fav(0) },
      { en: 2.4, testid: fav(3) },
      { en: 3.0, testid: fav(5) },
      { en: 3.8, testid: "cobrar-kiosco" },
      { en: 5.0, testid: "cortar-conexion" },
    ],
  },
  {
    empresa: "kiosco",
    modulo: "caja",
    duracion: 6,
    texto: "A la noche, la caja cierra justa: diferencia cero.",
    acciones: [
      { en: 1.0, testid: "contar-todo" },
      { en: 2.4, testid: "cerrar-caja-kiosco" },
    ],
  },
  { empresa: "ferreteria", modulo: "presupuestos", duracion: 6.5, texto: "Un salto: una ferretería con tres sucursales. El presupuesto pasa a venta.", acciones: [{ en: 1.6, testid: "pasar-a-venta" }] },
  { empresa: "distribuidora", modulo: "preventa", duracion: 6, texto: "Una distribuidora: el pedido llega desde la calle.", acciones: [{ en: 1.4, testid: "simular-pedido" }] },
  {
    empresa: "grupo",
    modulo: "aprobaciones",
    duracion: 8,
    texto: "Un grupo de 40 sucursales: las compras grandes se aprueban en dos niveles.",
    acciones: [
      { en: 1.6, testid: "aprobar" },
      { en: 3.4, testid: "aprobar" },
    ],
  },
  { empresa: null, modulo: null, pantalla: "probala", duracion: 5.5, texto: "" },
  { empresa: null, modulo: null, pantalla: "cierre", duracion: 7.5, texto: "" },
]

/** "El cambio de empresa": las cuatro transiciones en un loop (termina como empieza). */
const CAMBIO: PasoPelicula[] = [
  { empresa: "kiosco", modulo: "tablero", duracion: 0.8, texto: "" },
  { empresa: "ferreteria", modulo: "tablero", duracion: 1.6, texto: "" },
  { empresa: "distribuidora", modulo: "tablero", duracion: 1.6, texto: "" },
  { empresa: "grupo", modulo: "tablero", duracion: 1.6, texto: "" },
  { empresa: "kiosco", modulo: "tablero", duracion: 1.6, texto: "" },
]

export const GUIONES: Record<IdVideo, Guion> = {
  "quvant-60s": { pasos: SESENTA, relojVivo: true, subtitulos: true },
  "quvant-60s-vertical": { pasos: SESENTA, relojVivo: true, subtitulos: true },
  "cambio-de-empresa": { pasos: CAMBIO, relojVivo: false, subtitulos: false },
}

export const FORMATO_DE: Record<IdVideo, Formato> = { "quvant-60s": "horizontal", "quvant-60s-vertical": "vertical", "cambio-de-empresa": "horizontal" }

export const IDS_VIDEOS = Object.keys(GUIONES) as IdVideo[]

export function esIdVideo(x: string): x is IdVideo {
  return x in GUIONES
}

/** Cuándo empieza cada paso. Las pantallas no cambian de empresa. */
export function tiemposPelicula(pasos: PasoPelicula[], empresaInicial: IdEmpresa = "kiosco") {
  return inicioDePasos(pasos, empresaInicial)
}

export function duracionPelicula(pasos: PasoPelicula[], empresaInicial: IdEmpresa = "kiosco") {
  const t = tiemposPelicula(pasos, empresaInicial)
  const u = t.at(-1)
  return u ? u.contenido + pasos[pasos.length - 1].duracion : 0
}

/** "favorito@3" → el cuarto botón con ese testid. */
export function separarTestid(x: string): { testid: string; n: number } {
  const [testid, n] = x.split("@")
  return { testid, n: Number(n ?? 0) || 0 }
}
