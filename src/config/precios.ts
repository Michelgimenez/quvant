import { ES_COMPLETAR } from "./sitio"

/**
 * Precios públicos de Quvant. Editables: el sitio y las presentaciones leen de acá.
 * Mientras un precio sea [COMPLETAR], se muestra "Consultá" (nunca un número inventado).
 * Cada cosa que incluye un plan apunta a su ficha del registro (src/showcase/features.ts): el sitio muestra su
 * estado real al lado (las que están "en demo" o "próximamente" lo dicen).
 */
export type ItemPlan = { texto: string; feature?: string }

export type Plan = {
  id: "kiosco" | "comercio" | "distribuidora" | "empresa"
  nombre: string
  /** La empresa de la demo que muestra este tamaño (/demo?empresa=…). */
  empresaDemo: "kiosco" | "ferreteria" | "distribuidora" | "grupo"
  precioMensual: string
  unidad: string
  para: string
  incluye: ItemPlan[]
}

const PLANES: readonly Plan[] = [
  {
    id: "kiosco",
    nombre: "Kiosco",
    empresaDemo: "kiosco",
    precioMensual: "[COMPLETAR: precio mensual del plan Kiosco, en USD]",
    unidad: "por mes",
    para: "Una caja, una persona. Kioscos, almacenes y comercios chicos.",
    incluye: [
      { texto: "Mostrador rápido, con lector o favoritos", feature: "mostrador-kiosco" },
      { texto: "Sigue vendiendo sin internet", feature: "mostrador-sin-conexion" },
      { texto: "Caja diaria con arqueo", feature: "caja" },
      { texto: "El fiado, sin cuaderno", feature: "fiado" },
      { texto: "Precios al día por proveedor", feature: "aumento-masivo" },
    ],
  },
  {
    id: "comercio",
    nombre: "Comercio",
    empresaDemo: "ferreteria",
    precioMensual: "[COMPLETAR: precio mensual del plan Comercio, en USD]",
    unidad: "por mes por negocio",
    para: "Ferreterías, corralones y repuestos, con una o varias sucursales.",
    incluye: [
      { texto: "Todo lo del plan Kiosco" },
      { texto: "Stock por sucursal y transferencias", feature: "inventario-multisucursal" },
      { texto: "Presupuestos que pasan a venta", feature: "presupuestos" },
      { texto: "Clientes y cuentas corrientes", feature: "clientes-cuentas" },
      { texto: "Compras y proveedores", feature: "compras" },
      { texto: "Servicio técnico", feature: "servicio-tecnico" },
    ],
  },
  {
    id: "distribuidora",
    nombre: "Distribuidora",
    empresaDemo: "distribuidora",
    precioMensual: "[COMPLETAR: precio mensual del plan Distribuidora, en USD]",
    unidad: "por mes por negocio",
    para: "Mayoristas y distribuidoras que venden en la calle.",
    incluye: [
      { texto: "Todo lo del plan Comercio" },
      { texto: "Listas de precios por cliente", feature: "listas-precios" },
      { texto: "Preventa en la calle", feature: "preventa" },
      { texto: "Reparto con hoja de ruta", feature: "entregas" },
      { texto: "Cobranzas en la calle", feature: "cobranzas-calle" },
    ],
  },
  {
    id: "empresa",
    nombre: "Empresa",
    empresaDemo: "grupo",
    precioMensual: "[COMPLETAR: precio del plan Empresa, o «a medida»]",
    unidad: "a medida",
    para: "Grupos con muchas sucursales, en una o varias provincias.",
    incluye: [
      { texto: "Los módulos que necesite cada negocio" },
      { texto: "Tablero consolidado de todo el grupo", feature: "tablero-multinegocio" },
      { texto: "Comparación de sucursales", feature: "comparacion-sucursales" },
      { texto: "Aprobaciones por niveles", feature: "aprobaciones-niveles" },
      { texto: "Roles, permisos y auditoría", feature: "roles-permisos" },
    ],
  },
]

export const PRECIOS = {
  moneda: "USD",
  implementacion: "Cotizada aparte según migración, sucursales y capacitación.",
  planes: PLANES,
  /** Programa de socios fundadores: sin cupos inventados (si hay un número, que lo decida Michel). */
  sociosFundadores: {
    estado: "Abierto",
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

/** "USD 45 por mes" o "Consultá" mientras el precio sea [COMPLETAR]. */
export function textoPrecioPlan(p: Plan) {
  if (ES_COMPLETAR.test(p.precioMensual)) return { precio: "Consultá", unidad: null }
  return { precio: /^\d/.test(p.precioMensual) ? `${PRECIOS.moneda} ${p.precioMensual}` : p.precioMensual, unidad: p.unidad }
}

/** ¿Hay al menos un precio cargado? (para decidir si se muestra "desde"). */
export function hayPrecios() {
  return PRECIOS.planes.some((p) => !ES_COMPLETAR.test(p.precioMensual))
}

/** Texto del precio de una extensión: "Consultá" mientras no tenga valor real. */
export function textoPrecioExtension(id: keyof typeof PRECIOS.extensiones) {
  const p = PRECIOS.extensiones[id]
  return ES_COMPLETAR.test(String(p.precioMensual)) ? "Consultá" : `USD ${p.precioMensual} ${p.unidad}`
}

export type PlanId = Plan["id"]
