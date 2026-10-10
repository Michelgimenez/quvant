import type { Permiso } from "./permisos"

/**
 * Modelo de dominio de Yunque.
 *
 * Convenciones:
 * - Importes en CENTAVOS (enteros). `precio: 1284500` = $ 12.845,00.
 * - Cantidades de stock con hasta 3 decimales (metros, kilos).
 * - Fechas en ISO 8601 (UTC).
 * - Todo lo que pertenece a una empresa lleva `orgId` (en la base: `org_id` + RLS).
 */

export type Id = string
export type Centavos = number
export type FechaISO = string

// ───────────────────────── Organización ─────────────────────────

export const MODULOS = [
  "inventario",
  "precios",
  "mostrador",
  "presupuestos",
  "servicio",
  "clientes",
  "compras",
  "entregas",
  "reportes",
] as const
export type Modulo = (typeof MODULOS)[number]

export type Organizacion = {
  id: Id
  nombre: string
  slug: string
  /** URL o data URL del logo del cliente para fondos claros (co-branding). */
  logo: string | null
  /** Versión para fondos oscuros (opcional). */
  logoNegativo: string | null
  /** Color de acento del cliente (#RRGGBB). */
  colorAcento: string
  modulos: Record<Modulo, boolean>
  esDemo: boolean
  creadaEn: FechaISO
  /** Extensiones (Forja, …) activadas por la organización. */
  extensiones: Partial<Record<IdExtension, EstadoExtension>>
}

/** Extensiones de Yunque. Cada una se registra en src/extensiones/registro.ts. */
export const EXTENSIONES = ["forja"] as const
export type IdExtension = (typeof EXTENSIONES)[number]
export type EstadoExtension = { activa: boolean; activadaEn: FechaISO | null; activadaPor: Id | null }

export type Negocio = {
  id: Id
  orgId: Id
  nombre: string
  rubro: string
  cuit: string
}

export type Sucursal = {
  id: Id
  orgId: Id
  negocioId: Id
  nombre: string
  /** Código corto para fichas y numeración: CC, NO, DM. */
  codigo: string
  direccion: string
  /** Puestos de mostrador (cajas) de la sucursal. */
  puestos: number
  /** Sucursal con mostrador o depósito sin venta al público. */
  tipo: "sucursal" | "deposito"
  /** Ubicación (WGS84) para el mapa de Forja; null si no se cargó. */
  lat: number | null
  lng: number | null
  /** Sucursal ficticia (empresa demo o sucursales de ejemplo de una propuesta): se marca DEMO. */
  demo: boolean
}

// ───────────────────────── Usuarios y roles ─────────────────────────

export const ROLES = ["dueno", "administracion", "mostrador", "deposito", "tecnico", "compras"] as const
export type Rol = (typeof ROLES)[number]

export type Usuario = {
  id: Id
  orgId: Id
  nombre: string
  email: string
  rol: Rol
  /** null = todas las sucursales. */
  sucursalIds: Id[] | null
  activo: boolean
  dosFactor: boolean
  ultimoIngreso: FechaISO | null
  /** Permisos que se le dan a esta persona además de los de su rol (p. ej. "forja.ver"). */
  permisosExtra: Permiso[]
  /** Preferencias guardadas en el servidor (p. ej. animación de Forja ya vista). */
  preferencias: Record<string, ValorPreferencia>
}

export type ValorPreferencia = string | number | boolean | null

// ───────────────────────── Catálogo ─────────────────────────

export const ILUSTRACIONES = [
  "taladro",
  "amoladora",
  "soldadora",
  "compresor",
  "generador",
  "hidrolavadora",
  "sierra",
  "llave",
  "disco",
  "tornillo",
  "casco",
  "bomba",
  "medidor",
  "cable",
  "lubricante",
  "escalera",
] as const
export type Ilustracion = (typeof ILUSTRACIONES)[number]

export type Categoria = {
  id: Id
  orgId: Id
  nombre: string
  ilustracion: Ilustracion
}

export type Marca = { id: Id; orgId: Id; nombre: string }

export type Proveedor = {
  id: Id
  orgId: Id
  nombre: string
  cuit: string
  contacto: string
  telefono: string
  email: string
  diasEntrega: number
}

export type Unidad = "u" | "m" | "kg" | "l" | "caja"

export type Producto = {
  id: Id
  orgId: Id
  sku: string
  codigoBarras: string
  nombre: string
  categoriaId: Id
  marcaId: Id
  proveedorId: Id
  unidad: Unidad
  /** Costo de reposición sin IVA, en centavos. */
  costo: Centavos
  /** Alícuota de IVA: 21 o 10,5. */
  iva: 21 | 10.5
  ilustracion: Ilustracion
  activo: boolean
  actualizadoEn: FechaISO
}

export type ListaPrecio = {
  id: Id
  orgId: Id
  nombre: string
  /** Margen sugerido sobre costo (%) para productos nuevos. */
  margenSugerido: number
  esDefault: boolean
}

/** Precio final (IVA incluido) de un producto en una lista, en centavos. */
export type Precio = {
  orgId: Id
  productoId: Id
  listaId: Id
  precio: Centavos
  actualizadoEn: FechaISO
}

// ───────────────────────── Stock ─────────────────────────

export type Stock = {
  orgId: Id
  sucursalId: Id
  productoId: Id
  cantidad: number
  minimo: number
  ubicacion: string
}

export type TipoMovimiento =
  | "venta"
  | "anulacion"
  | "compra"
  | "ajuste"
  | "conteo"
  | "transferencia_salida"
  | "transferencia_entrada"
  | "servicio"
  | "inicial"

export type MovimientoStock = {
  id: Id
  orgId: Id
  sucursalId: Id
  productoId: Id
  tipo: TipoMovimiento
  /** Delta con signo: negativo sale, positivo entra. */
  cantidad: number
  refId: Id | null
  motivo: string
  usuarioId: Id
  fecha: FechaISO
}

// ───────────────────────── Clientes ─────────────────────────

export type CondicionIva = "RI" | "MT" | "CF" | "EX"

export type Cliente = {
  id: Id
  orgId: Id
  nombre: string
  cuit: string
  condicionIva: CondicionIva
  telefono: string
  whatsapp: string
  email: string
  direccion: string
  listaId: Id
  /** Límite de cuenta corriente en centavos (0 = sin cuenta corriente). */
  limiteCredito: Centavos
  notas: string
  creadoEn: FechaISO
}

export type TipoMovimientoCuenta = "venta" | "pago" | "nota_credito" | "ajuste"

export type MovimientoCuenta = {
  id: Id
  orgId: Id
  clienteId: Id
  fecha: FechaISO
  tipo: TipoMovimientoCuenta
  /** Positivo = debe (el cliente nos debe más). Negativo = haber. */
  importe: Centavos
  refId: Id | null
  descripcion: string
}

// ───────────────────────── Ventas ─────────────────────────

export type ItemComercial = {
  productoId: Id
  descripcion: string
  cantidad: number
  /** Precio unitario final (IVA incluido). */
  precioUnitario: Centavos
  descuentoPct: number
  /** Costo unitario al momento (para márgenes). */
  costoUnitario: Centavos
}

export const MEDIOS_PAGO = ["efectivo", "debito", "credito", "transferencia", "mercadopago", "cuenta_corriente"] as const
export type MedioPago = (typeof MEDIOS_PAGO)[number]

export type Pago = { medio: MedioPago; importe: Centavos; referencia?: string }

export type Comprobante = {
  tipo: "FA" | "FB" | "X"
  /** CAE emulado en la demo: siempre `emulado: true` hasta integrar ARCA. */
  cae: string | null
  emulado: boolean
}

export type Venta = {
  id: Id
  orgId: Id
  negocioId: Id
  sucursalId: Id
  puesto: number
  /** Número definitivo, lo asigna el servidor al sincronizar. */
  numero: number | null
  /** Número provisorio local, p. ej. "CC2-L0007". */
  numeroLocal: string
  fecha: FechaISO
  clienteId: Id | null
  listaId: Id
  items: ItemComercial[]
  total: Centavos
  pagos: Pago[]
  estado: "confirmada" | "anulada"
  comprobante: Comprobante
  presupuestoId: Id | null
  vendedorId: Id
  origen: "en_linea" | "sin_conexion"
  entrega: boolean
  advertencias: string[]
}

export type EstadoPresupuesto = "borrador" | "enviado" | "aceptado" | "rechazado" | "vencido" | "convertido"

export type Presupuesto = {
  id: Id
  orgId: Id
  negocioId: Id
  sucursalId: Id
  numero: number | null
  numeroLocal: string
  fecha: FechaISO
  vencimiento: FechaISO
  clienteId: Id | null
  clienteNombre: string
  listaId: Id
  items: ItemComercial[]
  total: Centavos
  estado: EstadoPresupuesto
  ventaId: Id | null
  notas: string
  vendedorId: Id
  actualizadoEn: FechaISO
}

// ───────────────────────── Servicio técnico ─────────────────────────

export const ESTADOS_SERVICIO = [
  "ingresado",
  "diagnostico",
  "esperando_aprobacion",
  "en_reparacion",
  "listo",
  "entregado",
  "sin_reparacion",
] as const
export type EstadoServicio = (typeof ESTADOS_SERVICIO)[number]

export type EventoServicio = {
  fecha: FechaISO
  estado: EstadoServicio
  nota: string
  usuarioId: Id
  aviso: { canal: "whatsapp"; mensaje: string; emulado: true } | null
}

export type OrdenServicio = {
  id: Id
  orgId: Id
  sucursalId: Id
  numero: number | null
  numeroLocal: string
  fechaIngreso: FechaISO
  fechaPrometida: FechaISO
  clienteId: Id
  equipo: { tipo: Ilustracion; marca: string; modelo: string; serie: string }
  falla: string
  accesorios: string
  diagnostico: string
  estado: EstadoServicio
  prioridad: "normal" | "urgente"
  tecnicoId: Id | null
  presupuestoReparacion: Centavos | null
  repuestos: { productoId: Id; cantidad: number }[]
  eventos: EventoServicio[]
  actualizadoEn: FechaISO
}

// ───────────────────────── Compras ─────────────────────────

export type EstadoCompra = "borrador" | "enviada" | "recibida_parcial" | "recibida" | "cancelada"

export type OrdenCompra = {
  id: Id
  orgId: Id
  sucursalId: Id
  proveedorId: Id
  numero: number | null
  numeroLocal: string
  fecha: FechaISO
  estado: EstadoCompra
  items: { productoId: Id; cantidad: number; costoUnitario: Centavos; recibido: number }[]
  total: Centavos
  notas: string
  actualizadoEn: FechaISO
}

// ───────────────────────── Entregas ─────────────────────────

export type EstadoEntrega = "pendiente" | "en_camino" | "entregada" | "fallida"

/** Transferencia entre sucursales. En tránsito: el stock salió del origen y todavía no llegó. */
export type Transferencia = {
  id: Id
  orgId: Id
  desdeId: Id
  haciaId: Id
  items: { productoId: Id; cantidad: number }[]
  estado: "en_transito" | "recibida"
  motivo: string
  despachadaEn: FechaISO
  llegadaEstimada: FechaISO
  recibidaEn: FechaISO | null
  usuarioId: Id
}

export type Entrega = {
  id: Id
  orgId: Id
  sucursalId: Id
  ventaId: Id
  clienteId: Id | null
  destinatario: string
  direccion: string
  telefono: string
  fechaProgramada: FechaISO
  franja: "mañana" | "tarde"
  estado: EstadoEntrega
  chofer: string
  orden: number
  notas: string
  actualizadoEn: FechaISO
}

// ───────────────────────── Caja ─────────────────────────

export type SesionCaja = {
  id: Id
  orgId: Id
  sucursalId: Id
  puesto: number
  abiertaPor: Id
  apertura: FechaISO
  montoInicial: Centavos
  cerradaPor: Id | null
  cierre: FechaISO | null
  /** Efectivo contado al cerrar. */
  montoContado: Centavos | null
  /** Efectivo esperado según ventas y movimientos. */
  esperado: Centavos | null
  estado: "abierta" | "cerrada"
}

export type MovimientoCaja = {
  id: Id
  orgId: Id
  sesionId: Id
  fecha: FechaISO
  tipo: "ingreso" | "retiro" | "gasto"
  importe: Centavos
  motivo: string
  usuarioId: Id
}

// ───────────────────────── Conteos ─────────────────────────

export type Conteo = {
  id: Id
  orgId: Id
  sucursalId: Id
  fecha: FechaISO
  nombre: string
  estado: "en_curso" | "cerrado"
  items: { productoId: Id; esperado: number; contado: number | null }[]
  usuarioId: Id
  cerradoEn: FechaISO | null
}

// ───────────────────────── Precios ─────────────────────────

export type FiltroProductos = {
  marcaIds?: Id[]
  categoriaIds?: Id[]
  proveedorIds?: Id[]
  texto?: string
}

export type Redondeo = "ninguno" | "10" | "100" | "1000" | "99"

export type AumentoPrecio = {
  id: Id
  orgId: Id
  fecha: FechaISO
  usuarioId: Id
  descripcion: string
  filtro: FiltroProductos
  porcentaje: number
  listaIds: Id[]
  redondeo: Redondeo
  cambios: { productoId: Id; listaId: Id; antes: Centavos; despues: Centavos }[]
  revertido: boolean
}

// ───────────────────────── Auditoría ─────────────────────────

export type RegistroAuditoria = {
  id: Id
  orgId: Id
  fecha: FechaISO
  usuarioId: Id
  accion: string
  entidad: string
  entidadId: Id | null
  resumen: string
  origen: "en_linea" | "sin_conexion" | "sistema"
}
