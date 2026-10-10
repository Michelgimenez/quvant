import type { Modulo, Rol } from "./tipos"

/**
 * Matriz de permisos por rol. Es la misma que siembra la migración
 * `supabase/migrations/0002_permisos.sql` (un test verifica que coincidan).
 */
export const PERMISOS = [
  "tablero.ver",
  "inventario.ver",
  "inventario.editar",
  "stock.ajustar",
  "stock.transferir",
  "conteo.realizar",
  "costos.ver",
  "precios.ver",
  "precios.editar",
  "mostrador.vender",
  "caja.operar",
  "ventas.ver",
  "ventas.anular",
  "presupuestos.ver",
  "presupuestos.editar",
  "servicio.ver",
  "servicio.editar",
  "clientes.ver",
  "clientes.editar",
  "cuentas.cobrar",
  "compras.ver",
  "compras.editar",
  "compras.recibir",
  "entregas.ver",
  "entregas.editar",
  "reportes.ver",
  "usuarios.gestionar",
  "config.editar",
  "auditoria.ver",
  "importar.datos",
] as const
export type Permiso = (typeof PERMISOS)[number]

const TODOS = [...PERMISOS] as Permiso[]

export const PERMISOS_POR_ROL: Record<Rol, Permiso[]> = {
  dueno: TODOS,
  administracion: TODOS,
  mostrador: [
    "tablero.ver",
    "inventario.ver",
    "precios.ver",
    "mostrador.vender",
    "caja.operar",
    "ventas.ver",
    "presupuestos.ver",
    "presupuestos.editar",
    "servicio.ver",
    "servicio.editar",
    "clientes.ver",
    "clientes.editar",
    "cuentas.cobrar",
    "entregas.ver",
  ],
  deposito: [
    "tablero.ver",
    "inventario.ver",
    "inventario.editar",
    "stock.ajustar",
    "stock.transferir",
    "conteo.realizar",
    "precios.ver",
    "compras.ver",
    "compras.recibir",
    "entregas.ver",
    "entregas.editar",
  ],
  tecnico: ["tablero.ver", "inventario.ver", "precios.ver", "servicio.ver", "servicio.editar", "clientes.ver"],
  compras: [
    "tablero.ver",
    "inventario.ver",
    "inventario.editar",
    "costos.ver",
    "precios.ver",
    "precios.editar",
    "compras.ver",
    "compras.editar",
    "compras.recibir",
    "reportes.ver",
    "importar.datos",
  ],
}

export const NOMBRE_ROL: Record<Rol, string> = {
  dueno: "Dueño",
  administracion: "Administración",
  mostrador: "Mostrador",
  deposito: "Depósito",
  tecnico: "Técnico",
  compras: "Compras",
}

export const DESCRIPCION_ROL: Record<Rol, string> = {
  dueno: "Ve y hace todo. Doble factor obligatorio.",
  administracion: "Gestión completa del negocio. Doble factor obligatorio.",
  mostrador: "Vende, cobra, presupuesta y atiende clientes.",
  deposito: "Stock, conteos, transferencias, recepción y entregas.",
  tecnico: "Órdenes de servicio técnico.",
  compras: "Proveedores, órdenes de compra, costos y precios.",
}

/** Roles que exigen doble factor (en la base: nivel aal2 en el JWT). */
export const ROLES_CON_2FA: Rol[] = ["dueno", "administracion"]

export function exige2FA(rol: Rol) {
  return ROLES_CON_2FA.includes(rol)
}

export function tienePermiso(rol: Rol, permiso: Permiso) {
  return PERMISOS_POR_ROL[rol].includes(permiso)
}

/** Permiso mínimo para ver cada módulo (navegación y guardas de ruta). */
export const PERMISO_MODULO: Record<Modulo | "tablero" | "usuarios" | "configuracion" | "auditoria" | "importar", Permiso> = {
  tablero: "tablero.ver",
  inventario: "inventario.ver",
  precios: "precios.ver",
  mostrador: "mostrador.vender",
  presupuestos: "presupuestos.ver",
  servicio: "servicio.ver",
  clientes: "clientes.ver",
  compras: "compras.ver",
  entregas: "entregas.ver",
  reportes: "reportes.ver",
  usuarios: "usuarios.gestionar",
  configuracion: "config.editar",
  auditoria: "auditoria.ver",
  importar: "importar.datos",
}

/** ¿Puede `quien` asignar el rol `rol`? Solo el dueño crea o cambia dueños. */
export function puedeAsignarRol(quien: Rol, rol: Rol) {
  if (!tienePermiso(quien, "usuarios.gestionar")) return false
  if (rol === "dueno") return quien === "dueno"
  return true
}
