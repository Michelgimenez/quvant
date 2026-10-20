import { ES_COMPLETAR } from "./sitio"

/**
 * Precios públicos de Quvant. Editables: el sitio y la presentación leen de acá.
 * Valores en USD por mes, por negocio (un negocio puede tener varias sucursales).
 */
export const PRECIOS = {
  moneda: "USD",
  desdePorNegocio: 290,
  implementacion: "Cotizada aparte según migración, sucursales y capacitación.",
  planes: [
    {
      id: "negocio",
      nombre: "Negocio",
      precioMensual: 290,
      unidad: "por mes por negocio",
      para: "Un negocio con hasta 2 sucursales",
      incluye: [
        "Inventario, precios y mostrador sin conexión",
        "Presupuestos, clientes y cuentas corrientes",
        "Servicio técnico y entregas",
        "Usuarios ilimitados con permisos por rol",
        "Copias diarias y exportación de datos",
      ],
    },
    {
      id: "multinegocio",
      nombre: "Multinegocio",
      precioMensual: null,
      unidad: "a medida",
      para: "Grupos con varios negocios o más de 2 sucursales",
      incluye: [
        "Todo lo del plan Negocio",
        "Tablero consolidado de todos los negocios",
        "Transferencias de stock entre sucursales",
        "Listas de precios por negocio",
        "Soporte prioritario",
      ],
    },
  ],
  sociosFundadores: {
    cupos: 5,
    estado: "Cupos abiertos",
    condiciones: [
      "Precio de lanzamiento congelado durante 24 meses",
      "Implementación y migración bonificadas",
      "Línea directa con el equipo y prioridad en la hoja de ruta",
    ],
    aCambio: "Uso real del sistema, reuniones de seguimiento y permiso para aprender de su operación.",
  },
  /** Extensiones que se contratan aparte. Mientras el precio sea [COMPLETAR] se muestra "Consultá". */
  extensiones: {
    forja: { precioMensual: "[COMPLETAR: precio mensual de Forja por organización, en USD]", unidad: "por mes por organización" },
  },
} as const

/** Texto del precio de una extensión: "Consultá" mientras no tenga valor real. */
export function textoPrecioExtension(id: keyof typeof PRECIOS.extensiones) {
  const p = PRECIOS.extensiones[id]
  return ES_COMPLETAR.test(String(p.precioMensual)) ? "Consultá" : `USD ${p.precioMensual} ${p.unidad}`
}

export type PlanId = (typeof PRECIOS.planes)[number]["id"]
