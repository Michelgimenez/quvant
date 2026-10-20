/**
 * Datos públicos de Quvant. Donde todavía no hay dato real va un [COMPLETAR]
 * visible: la regla de honestidad del proyecto prohíbe inventarlos.
 */
/**
 * Las 3 propuestas de titular para el hero (tanda 1). La elegida se marca en SITIO.titularElegido;
 * se ven compuestas en /marca/sistema/titulares.
 */
export const TITULARES_ALTERNATIVOS = [
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

/** El titular elegido para el hero: "A", "B" o "C". */
const TITULAR_ELEGIDO: "A" | "B" | "C" = "A"

export const SITIO = {
  nombre: "Quvant",
  url: process.env.NEXT_PUBLIC_SITIO_URL ?? "http://localhost:3000",
  /** La bajada de la marca (manual, pág. 2): mayúscula al inicio y punto final, nunca abreviada ni traducida. */
  tagline: "Software a la vanguardia de cada nicho.",
  /**
   * El titular del sitio (tanda 2). Michel no eligió todavía: queda la propuesta A por defecto y las otras dos
   * en TITULARES_ALTERNATIVOS. Para cambiarlo, cambiá TITULAR_ELEGIDO.
   */
  titularElegido: TITULAR_ELEGIDO,
  titular: TITULARES_ALTERNATIVOS.find((t) => t.id === TITULAR_ELEGIDO)!.titular as string,
  descripcion:
    "El sistema de gestión que se adapta a cada negocio: ventas, caja, stock, precios, compras, clientes y sucursales en un solo lugar. Del kiosco de barrio a la empresa con decenas de sucursales.",
  estado: "Demo funcional · primer piloto en negociación",
  contacto: {
    email: "[COMPLETAR: email de contacto]",
    whatsapp: "[COMPLETAR: WhatsApp comercial]",
    ciudad: "Buenos Aires, Argentina",
  },
  redes: {
    linkedin: "[COMPLETAR: URL de LinkedIn]",
  },
}


/** Rubros del formulario "Pedir una demo": del kiosco a la empresa. */
export const RUBROS = ["Kiosco o almacén", "Comercio", "Ferretería", "Distribuidora o mayorista", "Empresa con sucursales", "Otro"] as const

/** Tamaño del negocio, para el formulario. */
export const TAMANOS = ["1 caja", "2 a 5 cajas", "Varias sucursales", "Más de 10 sucursales"] as const

export const ES_COMPLETAR = /\[COMPLETAR[^\]]*\]/

export function estaCompleto(valor: string) {
  return !ES_COMPLETAR.test(valor)
}
