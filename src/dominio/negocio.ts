/**
 * El modelo de lectura del tablero: lo que una pantalla de Quvant necesita saber de un negocio,
 * venga de donde venga. Hay dos implementaciones:
 * - la de la app (src/datos/negocio-desde-estado.ts): se arma desde la réplica local de la empresa;
 * - la de la demo (src/demo/): cuatro empresas ficticias generadas con semilla, más el simulador del día.
 * Los tableros (src/components/negocio/) solo leen este modelo: no saben de dónde salen los datos.
 *
 * Convenciones (las de src/dominio/tipos.ts): importes en centavos, fechas ISO, días "AAAA-MM-DD" en hora argentina.
 */
import type { Centavos } from "./tipos"

export type SucursalNegocio = {
  id: string
  codigo: string
  nombre: string
  ciudad: string
  provincia: string
  lat: number
  lng: number
  tipo: "sucursal" | "deposito"
  puestos: number
  /** Peso relativo de la sucursal en las ventas (1 = promedio). */
  tamano: number
}

export type ProductoNegocio = {
  id: string
  sku: string
  /** Código de barras ficticio (rango interno 200–299 de GS1: no choca con productos reales). */
  codigo: string
  nombre: string
  categoria: string
  precio: Centavos
  costo: Centavos
  /** Stock total (en el grupo, la suma se calcula a pedido). */
  stock: number
  minimo: number
  unidad: string
  proveedor: string
  favorito?: boolean
}

export type ClienteNegocio = {
  id: string
  nombre: string
  zona: string
  saldo: Centavos
  limite: Centavos
  /** Días desde el movimiento más viejo sin pagar (0 si no debe). */
  diasDeuda: number
  telefono: string
  lista: string
}

export type DiaVentas = {
  /** "AAAA-MM-DD" (hora argentina). */
  fecha: string
  /** Total del día por sucursal, en el orden de `sucursales`. */
  porSucursal: Centavos[]
  tickets: number[]
  /** Costo de lo vendido (para el margen). */
  costo: Centavos
}

export type VentaReciente = { id: string; t: string; sucursal: number; monto: Centavos; items: number; medio: MedioPago; detalle: string }
export type MedioPago = "efectivo" | "tarjeta" | "transferencia" | "qr" | "cuenta"

export type ExtrasKiosco = {
  tipo: "kiosco"
  caja: { apertura: string; fondoInicial: Centavos; efectivo: Centavos; tarjeta: Centavos; transferencia: Centavos; qr: Centavos; ventas: number }
  proveedores: { id: string; nombre: string; rubro: string; visita: string }[]
  pedidoSugerido: { proveedorId: string; productoId: string; cantidad: number }[]
  ultimoAumento: { proveedor: string; porcentaje: number; productos: number; hace: string }
}

export type ExtrasComercio = {
  tipo: "comercio"
  negocios: { id: string; nombre: string; sucursales: number[] }[]
  presupuestos: { id: string; numero: string; cliente: string; monto: Centavos; vence: string; estado: "abierto" | "por-vencer" }[]
  servicio: { id: string; numero: string; cliente: string; equipo: string; estado: "ingresado" | "diagnostico" | "reparacion" | "listo"; tecnico: string }[]
  transferencias: { id: string; numero: string; desde: number; hasta: number; items: number; estado: "preparando" | "en-viaje" | "recibida" }[]
}

export type ExtrasDistribuidora = {
  tipo: "distribuidora"
  preventistas: { id: string; nombre: string; zona: string; objetivoDia: Centavos; pedidosHoy: number; montoHoy: Centavos; clientes: number }[]
  pedidosHoy: { id: string; numero: string; t: string; preventista: number; clienteId: string; monto: Centavos; items: number; estado: "nuevo" | "armado" | "en-reparto" }[]
  reparto: { id: string; chofer: string; patente: string; paradas: { clienteId: string; x: number; y: number; monto: Centavos; estado: "entregado" | "en-camino" | "pendiente" }[] }[]
  listas: { id: string; nombre: string; ajuste: number; clientes: number }[]
  cobradoHoy: Centavos
}

export type ExtrasGrupo = {
  tipo: "grupo"
  provincias: string[]
  objetivoDia: Centavos[]
  aprobaciones: { id: string; numero: string; sucursal: number; proveedor: string; detalle: string; monto: Centavos; nivel: 1 | 2; solicita: string; t: string }[]
  auditoria: { id: string; t: string; usuario: string; rol: string; sucursal: number | null; accion: string; detalle: string }[]
  roles: { rol: string; usuarios: number; alcance: string }[]
  integraciones: { nombre: string; detalle: string; estado: "demo" | "próximamente" }[]
  margenPorSucursal: number[]
  stockCriticoPorSucursal: number[]
  stockValorizado: Centavos
}

export type DatosNegocio = {
  empresaId: string
  /** El momento de los datos (la fecha ancla en la demo; el reloj real en la app). */
  ahora: string
  sucursales: SucursalNegocio[]
  productos: ProductoNegocio[]
  clientes: ClienteNegocio[]
  /** 90 días de ventas; el último es hoy, parcial hasta `ahora`. */
  dias: DiaVentas[]
  /** Ventas de hoy por hora (24 valores, centavos). */
  hoyPorHora: Centavos[]
  /** Lo más vendido en los últimos 30 días. */
  top: { productoId: string; unidades: number; importe: Centavos }[]
  recientes: VentaReciente[]
  stockCritico: { productoId: string; sucursal: number; stock: number; minimo: number }[]
  extras: ExtrasKiosco | ExtrasComercio | ExtrasDistribuidora | ExtrasGrupo
}

// ───────────────────────── Cálculos puros ─────────────────────────

export const suma = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)

export function totalDia(d: DiaVentas) {
  return suma(d.porSucursal)
}

export function ticketsDia(d: DiaVentas) {
  return suma(d.tickets)
}

/** El mismo día de la semana anterior (7 días antes) que `dias.at(-1)`. */
export function mismoDiaSemanaPasada(dias: DiaVentas[]) {
  return dias.length > 7 ? dias[dias.length - 8] : null
}

/** Variación porcentual; null si no hay base. */
export function variacionPct(actual: number, anterior: number) {
  if (!anterior) return null
  return ((actual - anterior) / anterior) * 100
}

/** Totales de un tramo de días (los últimos `n`, sin contar hoy si `sinHoy`). */
export function tramo(dias: DiaVentas[], n: number, { sinHoy = false, desplazamiento = 0 } = {}) {
  const fin = dias.length - (sinHoy ? 1 : 0) - desplazamiento
  const parte = dias.slice(Math.max(0, fin - n), fin)
  const total = suma(parte.map(totalDia))
  const tickets = suma(parte.map(ticketsDia))
  const costo = suma(parte.map((d) => d.costo))
  return { total, tickets, costo, ticketPromedio: tickets ? total / tickets : 0, margen: total ? (total - costo) / total : 0, dias: parte.length }
}

/** Una fracción del día argentino transcurrida a la hora `h` (0-24), según una curva de demanda. */
export function fraccionDelDia(curva: readonly number[], hora: number) {
  const total = suma(curva)
  let acum = 0
  for (let h = 0; h < 24; h++) {
    if (hora >= h + 1) acum += curva[h]
    else if (hora > h) acum += curva[h] * (hora - h)
  }
  return total ? acum / total : 0
}
