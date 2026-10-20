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

/**
 * Quvant · las 3 propuestas de titular para el hero (tanda 1). Michel elige una y en la tanda 2
 * queda como el titular del sitio; esta lista se borra entonces. Se ven compuestas en /marca/sistema/titulares.
 */
export const TITULARES_PROPUESTOS = [
  {
    id: "A",
    titular: "Del kiosco a la empresa.",
    bajada: "Vendé, cobrá y controlá con el mismo sistema. Cada negocio enciende lo que necesita: una caja rápida o cuarenta sucursales.",
    porQue: "Dice el alcance en cinco palabras y deja que el control de la escala lo cuente. Claro antes que técnico.",
    ojo: null,
  },
  {
    id: "B",
    titular: "Una caja o cuarenta sucursales.",
    bajada: "El mismo Quvant, con los módulos que tu negocio necesita. Y el mostrador sigue vendiendo aunque se corte internet.",
    porQue: "Concreto: dos imágenes que el dueño reconoce. El contraste entre las dos es la promesa.",
    ojo: "Cuarenta sucursales hoy se muestran en la demo (Grupo Cordal), no con un cliente de ese tamaño. Es capacidad del sistema, no un caso real.",
  },
  {
    id: "C",
    titular: "Se adapta a tu negocio. No al revés.",
    bajada: "Ventas, caja, stock, precios, clientes y sucursales en un solo lugar, con la forma de trabajar de tu rubro.",
    porQue: "Cercano y seguro: habla del dolor de siempre (adaptarse al sistema) sin nombrar la tecnología.",
    ojo: null,
  },
] as const

/** Rubros del formulario "Pedir una demo". */
export const RUBROS = ["Ferretería industrial", "Distribuidora de maquinaria", "Corralón", "Casa de repuestos", "Ferretería", "Otro"] as const

export const ES_COMPLETAR = /\[COMPLETAR[^\]]*\]/

export function estaCompleto(valor: string) {
  return !ES_COMPLETAR.test(valor)
}
