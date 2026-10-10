import type {
  AumentoPrecio,
  Categoria,
  Cliente,
  Conteo,
  Entrega,
  Id,
  ListaPrecio,
  Marca,
  MovimientoCaja,
  MovimientoCuenta,
  MovimientoStock,
  Negocio,
  OrdenCompra,
  OrdenServicio,
  Organizacion,
  Precio,
  Presupuesto,
  Producto,
  Proveedor,
  RegistroAuditoria,
  SesionCaja,
  Stock,
  Sucursal,
  Usuario,
  Venta,
} from "./tipos"

/**
 * Estado completo de una organización tal como lo ve la réplica local.
 * Lo producen: el generador de la empresa demo (semilla) y la aplicación
 * de operaciones (reductores). Es serializable con structuredClone.
 */
export type EstadoEmpresa = {
  org: Organizacion
  negocios: Negocio[]
  sucursales: Sucursal[]
  usuarios: Usuario[]
  categorias: Categoria[]
  marcas: Marca[]
  proveedores: Proveedor[]
  listas: ListaPrecio[]
  productos: Record<Id, Producto>
  /** Clave `${listaId}:${productoId}` */
  precios: Record<string, Precio>
  /** Clave `${sucursalId}:${productoId}` */
  stock: Record<string, Stock>
  movimientos: MovimientoStock[]
  clientes: Record<Id, Cliente>
  movimientosCuenta: MovimientoCuenta[]
  ventas: Record<Id, Venta>
  presupuestos: Record<Id, Presupuesto>
  servicio: Record<Id, OrdenServicio>
  compras: Record<Id, OrdenCompra>
  entregas: Record<Id, Entrega>
  cajas: Record<Id, SesionCaja>
  movimientosCaja: MovimientoCaja[]
  conteos: Record<Id, Conteo>
  aumentos: AumentoPrecio[]
  auditoria: RegistroAuditoria[]
  /** Último número definitivo por clave (`venta:CC`, `presupuesto:CC`, ...). */
  numeradores: Record<string, number>
}

export const clavePrecio = (listaId: Id, productoId: Id) => `${listaId}:${productoId}`
export const claveStock = (sucursalId: Id, productoId: Id) => `${sucursalId}:${productoId}`

export function precioDe(e: EstadoEmpresa, listaId: Id, productoId: Id) {
  return e.precios[clavePrecio(listaId, productoId)]?.precio ?? 0
}

export function stockDe(e: EstadoEmpresa, sucursalId: Id, productoId: Id) {
  return e.stock[claveStock(sucursalId, productoId)]?.cantidad ?? 0
}

export function stockTotal(e: EstadoEmpresa, productoId: Id) {
  return e.sucursales.reduce((s, suc) => s + stockDe(e, suc.id, productoId), 0)
}

export function listaDefault(e: EstadoEmpresa) {
  return e.listas.find((l) => l.esDefault) ?? e.listas[0]
}

export function sucursal(e: EstadoEmpresa, id: Id) {
  const s = e.sucursales.find((x) => x.id === id)
  if (!s) throw new Error(`Sucursal desconocida: ${id}`)
  return s
}

export function usuario(e: EstadoEmpresa, id: Id | null) {
  return id ? e.usuarios.find((u) => u.id === id) ?? null : null
}

/** Saldo de cuenta corriente de un cliente (positivo = nos debe). */
export function saldoCliente(e: EstadoEmpresa, clienteId: Id) {
  let s = 0
  for (const m of e.movimientosCuenta) if (m.clienteId === clienteId) s += m.importe
  return s
}

export function siguienteNumero(e: EstadoEmpresa, clave: string) {
  const n = (e.numeradores[clave] ?? 0) + 1
  e.numeradores[clave] = n
  return n
}
