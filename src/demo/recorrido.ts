import type { IdEmpresa, ModuloDemo } from "./empresas"

/**
 * El recorrido guiado: un paseo automático por las cuatro empresas, con subtítulos breves al costado, para
 * mostrar en una reunión sin tocar nada. Es una línea de tiempo de GSAP (el único reloj): se pausa con la
 * barra espaciadora, avanza y retrocede con las flechas y se sale con Esc. Las acciones se hacen sobre la
 * interfaz real (los mismos botones que tocaría una persona). Es la base del video "Quvant en 60 segundos".
 */
export type PasoRecorrido = {
  empresa: IdEmpresa | null
  modulo: ModuloDemo | null
  duracion: number
  texto: string
  /** Clics sobre la interfaz real, en segundos desde el inicio del paso. */
  acciones?: { en: number; testid: string }[]
}

export const PASOS_RECORRIDO: PasoRecorrido[] = [
  { empresa: "kiosco", modulo: "tablero", duracion: 5.5, texto: "Un kiosco: una caja, una persona. Lo importante, en una pantalla que se lee de lejos." },
  {
    empresa: "kiosco",
    modulo: "mostrador",
    duracion: 6,
    texto: "Vender es tocar un favorito o pasar el lector. Si se corta internet, se sigue vendiendo.",
    acciones: [
      { en: 1.2, testid: "favorito" },
      { en: 1.8, testid: "simular-escaneo" },
      { en: 3.2, testid: "cobrar-kiosco" },
    ],
  },
  {
    empresa: "kiosco",
    modulo: "caja",
    duracion: 5,
    texto: "A la noche, la caja cierra justa: diferencia cero.",
    acciones: [
      { en: 1.2, testid: "contar-todo" },
      { en: 2.4, testid: "cerrar-caja-kiosco" },
    ],
  },
  { empresa: "ferreteria", modulo: "tablero", duracion: 5.5, texto: "El mismo Quvant en una ferretería industrial: dos negocios, tres sucursales y su stock por sucursal." },
  { empresa: "ferreteria", modulo: "presupuestos", duracion: 5, texto: "Un presupuesto pasa a venta con un clic.", acciones: [{ en: 1.6, testid: "pasar-a-venta" }] },
  { empresa: "distribuidora", modulo: "tablero", duracion: 5.5, texto: "En una distribuidora manda la calle: doce preventistas, cobranzas y el reparto del día." },
  { empresa: "distribuidora", modulo: "reparto", duracion: 5, texto: "La hoja de ruta, entrega por entrega, sobre el mapa." },
  { empresa: "grupo", modulo: "tablero", duracion: 6, texto: "Y en un grupo de cuarenta sucursales en seis provincias: el control, de un vistazo." },
  {
    empresa: "grupo",
    modulo: "aprobaciones",
    duracion: 6,
    texto: "Las compras grandes se aprueban en dos niveles, y todo queda en la auditoría.",
    acciones: [
      { en: 1.4, testid: "aprobar" },
      { en: 3.0, testid: "aprobar" },
    ],
  },
  { empresa: null, modulo: null, duracion: 5, texto: "Un sistema, del kiosco a la empresa. Probalo: 1 a 4 cambia de empresa." },
]

/** Cuánto tarda el cambio de empresa antes de que el paso muestre su módulo. */
export const ESPERA_CAMBIO = 1.7

export function inicioDePasos(pasos: PasoRecorrido[], empresaInicial: IdEmpresa) {
  let t = 0
  let empresa = empresaInicial
  return pasos.map((p) => {
    const cambia = p.empresa !== null && p.empresa !== empresa
    const inicio = t
    t += p.duracion + (cambia ? ESPERA_CAMBIO : 0)
    if (p.empresa) empresa = p.empresa
    return { inicio, cambia, contenido: inicio + (cambia ? ESPERA_CAMBIO : 0) }
  })
}

/** Cuánto dura el recorrido entero, en segundos (el video de 60 segundos se arma sobre esto). */
export function duracionRecorrido(pasos: PasoRecorrido[], empresaInicial: IdEmpresa) {
  const t = inicioDePasos(pasos, empresaInicial)
  const ultimo = t.at(-1)
  return ultimo ? ultimo.contenido + pasos[pasos.length - 1].duracion : 0
}
