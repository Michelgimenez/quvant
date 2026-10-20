/**
 * Contenido editable de la presentación para inversores.
 * Regla de honestidad: ningún número de mercado sin fuente. Donde falta el
 * dato real queda [COMPLETAR ...] visible en la presentación.
 */

/** El problema, contado para cada tamaño de negocio (del kiosco a la empresa). */
export const MERCADO = {
  titular: "Del kiosco a la empresa, la gestión sigue en sistemas viejos, planillas y cuadernos.",
  tamanos: [
    {
      id: "kiosco",
      nombre: "Kioscos y almacenes",
      dato: "[COMPLETAR con dato y fuente: cantidad de kioscos y almacenes en Argentina]",
      dolores: ["El fiado en un cuaderno", "La caja que no cierra", "Precios a mano cada semana"],
    },
    {
      id: "comercio",
      nombre: "Comercios con stock",
      dato: "[COMPLETAR con dato y fuente: ferreterías, corralones y repuestos en Argentina]",
      dolores: ["Sistemas de escritorio que se traban", "Actualizar precios lleva un día", "Presupuestos perdidos en WhatsApp"],
    },
    {
      id: "distribuidora",
      nombre: "Distribuidoras y mayoristas",
      dato: "[COMPLETAR con dato y fuente: distribuidoras mayoristas en Argentina]",
      dolores: ["Pedidos en papel y audios", "Deuda en la calle sin control", "Reparto por teléfono"],
    },
    {
      id: "empresa",
      nombre: "Empresas con sucursales",
      dato: "[COMPLETAR con dato y fuente: cadenas con 10 o más sucursales]",
      dolores: ["Cada sucursal con su planilla", "Compras sin aprobación clara", "Números a fin de mes"],
    },
  ],
}

/**
 * "Lo que vimos en el terreno": diagnóstico de un caso real, anonimizado.
 * Se completa con el relevamiento de la ferretería (web y sistema). Hasta
 * tener acceso a ese material, cada hallazgo queda como [COMPLETAR].
 */
export const TERRENO = {
  caso: "Ferretería industrial, zona oeste de Buenos Aires",
  alcance: "Relevamiento de su sitio web y de su sistema de gestión",
  hallazgos: [
    { area: "Sistema de gestión", hallazgo: "[COMPLETAR: hallazgo del relevamiento del sistema]" },
    { area: "Precios y listas", hallazgo: "[COMPLETAR: cómo actualizan precios hoy y cuánto tardan]" },
    { area: "Stock y sucursales", hallazgo: "[COMPLETAR: cómo controlan el stock entre sucursales]" },
    { area: "Presupuestos y clientes", hallazgo: "[COMPLETAR: cómo arman y siguen presupuestos]" },
    { area: "Sitio web", hallazgo: "[COMPLETAR: hallazgo del relevamiento del sitio]" },
  ],
  conclusion: "[COMPLETAR: conclusión del diagnóstico en una frase]",
}

/** El estado actual, con honestidad: lo que se sabe y lo que falta contar del piloto. */
export const ESTADO = {
  titular: "Demo funcional. Primer piloto en negociación.",
  bajada: "Todavía no hay clientes pagando. Esto es lo que funciona hoy, lo que se ve con partes emuladas y lo que viene.",
  piloto: "[COMPLETAR: estado del piloto — con quién, desde cuándo y qué se va a probar]",
}
