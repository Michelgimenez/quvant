/**
 * Contenido editable de la presentación para inversores.
 * Regla de honestidad: ningún número de mercado sin fuente. Donde falta el
 * dato real queda [COMPLETAR ...] visible en la presentación.
 */

export const MERCADO = {
  titular: "Miles de negocios en Argentina gestionan millones en stock con sistemas antiguos.",
  datos: [
    { valor: "[COMPLETAR con dato y fuente]", etiqueta: "Ferreterías, corralones y casas de repuestos en Argentina" },
    { valor: "[COMPLETAR con dato y fuente]", etiqueta: "Distribuidores de maquinaria y herramientas" },
    { valor: "[COMPLETAR con dato y fuente]", etiqueta: "Negocios del rubro que todavía usan sistemas de escritorio o planillas" },
  ],
  dolores: [
    "Sistemas de escritorio instalados en una sola PC",
    "Si se corta internet o el servidor, se frena la venta",
    "Actualizar precios lleva un día entero",
    "Presupuestos sin seguimiento, perdidos en WhatsApp",
    "Cada sucursal y cada negocio por separado",
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

export const PILARES = [
  { id: "stock", nombre: "Stock", frase: "Cada sucursal, en tiempo real. Conteos con el celular." },
  { id: "ventas", nombre: "Ventas", frase: "Mostrador rápido que no se cae y presupuestos que pasan a venta." },
  { id: "precios", nombre: "Precios", frase: "Miles de precios actualizados en minutos, con vista previa." },
  { id: "servicio", nombre: "Servicio técnico", frase: "Cada equipo en el taller, con su estado y el aviso al cliente." },
  { id: "multinegocio", nombre: "Multinegocio", frase: "Todos los negocios y sucursales en un tablero." },
] as const
