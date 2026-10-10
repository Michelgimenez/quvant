/**
 * Datos públicos de Yunque. Donde todavía no hay dato real va un [COMPLETAR]
 * visible: la regla de honestidad del proyecto prohíbe inventarlos.
 */
export const SITIO = {
  nombre: "Yunque",
  url: process.env.NEXT_PUBLIC_SITIO_URL ?? "http://localhost:3000",
  tagline: "Firme, aunque todo se mueva.",
  descripcion:
    "El sistema de gestión para ferreterías industriales y distribuidores que no se cae, no se traba y se entiende.",
  estado: "Demo funcional · primer piloto en negociación",
  contacto: {
    email: "[COMPLETAR: email de contacto]",
    whatsapp: "[COMPLETAR: WhatsApp comercial]",
    ciudad: "Buenos Aires, Argentina",
  },
  redes: {
    linkedin: "[COMPLETAR: URL de LinkedIn]",
  },
} as const

/** Rubros del formulario "Pedir una demo". */
export const RUBROS = ["Ferretería industrial", "Distribuidora de maquinaria", "Corralón", "Casa de repuestos", "Ferretería", "Otro"] as const

export const ES_COMPLETAR = /\[COMPLETAR[^\]]*\]/

export function estaCompleto(valor: string) {
  return !ES_COMPLETAR.test(valor)
}
