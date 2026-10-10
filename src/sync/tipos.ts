import type { Permiso } from "@/dominio/permisos"
import type { ParametrosAumento } from "@/dominio/precios"
import type {
  Centavos,
  Cliente,
  EstadoEntrega,
  EstadoServicio,
  FechaISO,
  Id,
  Ilustracion,
  ItemComercial,
  MedioPago,
  Modulo,
  OrdenCompra,
  Organizacion,
  Pago,
  Producto,
  Rol,
  Unidad,
  Usuario,
} from "@/dominio/tipos"

/**
 * Operaciones de sincronización.
 *
 * Toda escritura de la app es una Operación con un id único (UUID). Se guarda
 * primero en la cola local (IndexedDB), se aplica de forma optimista en la
 * réplica local y se envía al servidor cuando hay conexión. El servidor la
 * vuelve a aplicar con el MISMO reductor (src/sync/reductores) en modo
 * autoritativo: asigna números definitivos, valida permisos y resuelve
 * conflictos. Reenviar una operación ya aplicada es seguro (idempotencia por id).
 */

export type VentaNueva = {
  id: Id
  sucursalId: Id
  puesto: number
  numeroLocal: string
  fecha: FechaISO
  clienteId: Id | null
  listaId: Id
  items: ItemComercial[]
  pagos: Pago[]
  entrega: null | {
    id: Id
    destinatario: string
    direccion: string
    telefono: string
    fechaProgramada: FechaISO
    franja: "mañana" | "tarde"
    notas: string
  }
}

export type PresupuestoNuevo = {
  id: Id
  sucursalId: Id
  numeroLocal: string
  fecha: FechaISO
  vencimiento: FechaISO
  clienteId: Id | null
  clienteNombre: string
  listaId: Id
  items: ItemComercial[]
  notas: string
  estado: "borrador" | "enviado"
}

export type OrdenServicioNueva = {
  id: Id
  sucursalId: Id
  numeroLocal: string
  fechaIngreso: FechaISO
  fechaPrometida: FechaISO
  clienteId: Id
  equipo: { tipo: Ilustracion; marca: string; modelo: string; serie: string }
  falla: string
  accesorios: string
  prioridad: "normal" | "urgente"
  tecnicoId: Id | null
}

export type FilaImportada = {
  sku: string
  nombre: string
  categoria: string
  marca: string
  codigoBarras: string
  unidad: Unidad
  costo: Centavos
  iva: 21 | 10.5
  precio: Centavos | null
  stock: number | null
}

export type DatosOp = {
  "venta.crear": { venta: VentaNueva }
  "venta.anular": { ventaId: Id; motivo: string }
  "presupuesto.guardar": { presupuesto: PresupuestoNuevo }
  "presupuesto.estado": { presupuestoId: Id; estado: "enviado" | "aceptado" | "rechazado" }
  "presupuesto.convertir": { presupuestoId: Id; venta: VentaNueva }
  "stock.ajustar": { sucursalId: Id; productoId: Id; cantidad: number; motivo: string }
  "stock.transferir": { transferenciaId: Id; desdeId: Id; haciaId: Id; items: { productoId: Id; cantidad: number }[]; motivo: string }
  "stock.minimo": { sucursalId: Id; productoId: Id; minimo: number; ubicacion: string }
  "conteo.crear": { conteoId: Id; sucursalId: Id; nombre: string; productoIds: Id[] }
  "conteo.registrar": { conteoId: Id; productoId: Id; contado: number }
  "conteo.cerrar": { conteoId: Id }
  "precios.aumento": { aumentoId: Id; descripcion: string; parametros: ParametrosAumento }
  "precios.revertir": { aumentoId: Id }
  "precio.editar": { productoId: Id; listaId: Id; precio: Centavos }
  "producto.guardar": {
    productoId: Id
    nuevo?: Producto
    cambios?: Partial<Pick<Producto, "nombre" | "codigoBarras" | "categoriaId" | "marcaId" | "proveedorId" | "unidad" | "costo" | "iva" | "activo">>
    /** Valores anteriores de los campos cambiados (detección de conflictos). */
    antes?: Record<string, unknown>
    precios?: { listaId: Id; precio: Centavos }[]
  }
  "cliente.guardar": {
    clienteId: Id
    nuevo?: Cliente
    cambios?: Partial<Omit<Cliente, "id" | "orgId" | "creadoEn">>
    antes?: Record<string, unknown>
  }
  "cuenta.pago": { movimientoId: Id; clienteId: Id; importe: Centavos; medio: MedioPago; referencia: string }
  "servicio.crear": { orden: OrdenServicioNueva }
  "servicio.estado": {
    ordenId: Id
    estado: EstadoServicio
    nota: string
    diagnostico?: string
    presupuestoReparacion?: Centavos | null
    avisar: boolean
  }
  "servicio.asignar": { ordenId: Id; tecnicoId: Id | null }
  "compra.guardar": { orden: Pick<OrdenCompra, "id" | "sucursalId" | "proveedorId" | "numeroLocal" | "fecha" | "items" | "notas"> }
  "compra.enviar": { ordenId: Id }
  "compra.recibir": { ordenId: Id; items: { productoId: Id; cantidad: number }[] }
  "entrega.estado": { entregaId: Id; estado: EstadoEntrega; nota: string }
  "entrega.orden": { entregaIds: Id[] }
  "caja.abrir": { sesionId: Id; sucursalId: Id; puesto: number; montoInicial: Centavos }
  "caja.movimiento": { movimientoId: Id; sesionId: Id; tipo: "ingreso" | "retiro" | "gasto"; importe: Centavos; motivo: string }
  "caja.cerrar": { sesionId: Id; montoContado: Centavos }
  "org.config": { cambios: Partial<Pick<Organizacion, "nombre" | "logo" | "logoNegativo" | "colorAcento">> & { modulos?: Partial<Record<Modulo, boolean>> } }
  "usuario.guardar": {
    usuarioId: Id
    nuevo?: Usuario
    cambios?: Partial<Pick<Usuario, "nombre" | "rol" | "sucursalIds" | "activo">>
  }
  "importar.productos": { importacionId: Id; filas: FilaImportada[]; listaId: Id; sucursalId: Id | null }
}

export type TipoOp = keyof DatosOp

export type Operacion<T extends TipoOp = TipoOp> = {
  [K in T]: {
    id: Id
    tipo: K
    orgId: Id
    usuarioId: Id
    /** Sucursal en la que se hizo (para alcance por sucursal). */
    sucursalId: Id | null
    creadaEn: FechaISO
    dispositivo: string
    /** true si se creó sin conexión. */
    sinConexion: boolean
    datos: DatosOp[K]
  }
}[T]

export type CodigoRechazo =
  | "permiso"
  | "sucursal"
  | "no_existe"
  | "invalida"
  | "ya_convertido"
  | "estado"
  | "duplicada"
  | "ultimo_dueno"

export type Resultado =
  | {
      ok: true
      avisos: string[]
      /** Valores asignados por el servidor (número definitivo, etc.). */
      asignado?: Record<string, number | string>
    }
  | { ok: false; codigo: CodigoRechazo; error: string }

export type UsuarioContexto = { id: Id; rol: Rol; sucursalIds: Id[] | null }

/** Operación ya procesada por el servidor, con su posición en el orden global. */
export type OpConfirmada = {
  seq: number
  op: Operacion
  resultado: Resultado
  recibidaEn: FechaISO
  /** Usuario y permisos con los que el servidor la aplicó (para reaplicarla igual). */
  autor: UsuarioContexto
}

export type Contexto = {
  /** "servidor": autoritativo (asigna números). "local": optimista. */
  modo: "servidor" | "local"
  usuario: UsuarioContexto
  /** Momento de aplicación: recepción en el servidor o creación local. */
  ahora: FechaISO
  /**
   * Valores que el servidor ya asignó (al reaplicar una operación confirmada).
   * Si vienen, se usan en lugar de recalcular: la réplica queda idéntica al servidor.
   */
  asignado?: Record<string, number | string>
}

/** Permiso que exige cada tipo de operación (se valida en ambos modos). */
export const PERMISO_OPERACION: Record<TipoOp, Permiso> = {
  "venta.crear": "mostrador.vender",
  "venta.anular": "ventas.anular",
  "presupuesto.guardar": "presupuestos.editar",
  "presupuesto.estado": "presupuestos.editar",
  "presupuesto.convertir": "mostrador.vender",
  "stock.ajustar": "stock.ajustar",
  "stock.transferir": "stock.transferir",
  "stock.minimo": "inventario.editar",
  "conteo.crear": "conteo.realizar",
  "conteo.registrar": "conteo.realizar",
  "conteo.cerrar": "conteo.realizar",
  "precios.aumento": "precios.editar",
  "precios.revertir": "precios.editar",
  "precio.editar": "precios.editar",
  "producto.guardar": "inventario.editar",
  "cliente.guardar": "clientes.editar",
  "cuenta.pago": "cuentas.cobrar",
  "servicio.crear": "servicio.editar",
  "servicio.estado": "servicio.editar",
  "servicio.asignar": "servicio.editar",
  "compra.guardar": "compras.editar",
  "compra.enviar": "compras.editar",
  "compra.recibir": "compras.recibir",
  "entrega.estado": "entregas.editar",
  "entrega.orden": "entregas.editar",
  "caja.abrir": "caja.operar",
  "caja.movimiento": "caja.operar",
  "caja.cerrar": "caja.operar",
  "org.config": "config.editar",
  "usuario.guardar": "usuarios.gestionar",
  "importar.productos": "importar.datos",
}
