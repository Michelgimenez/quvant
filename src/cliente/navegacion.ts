import {
  BarChart3,
  Boxes,
  Blocks,
  ClipboardCheck,
  Flame,
  FileText,
  LayoutDashboard,
  PackagePlus,
  ScrollText,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Upload,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import type { Permiso } from "@/dominio/permisos"
import type { IdExtension, Modulo, Rol } from "@/dominio/tipos"

export type ItemNav = {
  href: string
  nombre: string
  icono: LucideIcon
  permiso: Permiso
  modulo?: Modulo
  /** Solo se muestra si la organización activó esta extensión. */
  extension?: IdExtension
  /** Atajo "g + letra". */
  atajo?: string
}

export const NAVEGACION: { grupo: string; items: ItemNav[] }[] = [
  {
    grupo: "Operación",
    items: [
      { href: "/app", nombre: "Tablero", icono: LayoutDashboard, permiso: "tablero.ver", atajo: "t" },
      { href: "/app/mostrador", nombre: "Mostrador", icono: ShoppingCart, permiso: "mostrador.vender", modulo: "mostrador", atajo: "m" },
      { href: "/app/presupuestos", nombre: "Presupuestos", icono: FileText, permiso: "presupuestos.ver", modulo: "presupuestos", atajo: "p" },
      { href: "/app/servicio", nombre: "Servicio técnico", icono: Wrench, permiso: "servicio.ver", modulo: "servicio", atajo: "s" },
      { href: "/app/entregas", nombre: "Entregas", icono: Truck, permiso: "entregas.ver", modulo: "entregas", atajo: "e" },
    ],
  },
  {
    grupo: "Stock y precios",
    items: [
      { href: "/app/inventario", nombre: "Inventario", icono: Boxes, permiso: "inventario.ver", modulo: "inventario", atajo: "i" },
      { href: "/app/inventario/conteos", nombre: "Conteos", icono: ClipboardCheck, permiso: "conteo.realizar", modulo: "inventario" },
      { href: "/app/precios", nombre: "Precios", icono: Tags, permiso: "precios.ver", modulo: "precios", atajo: "r" },
      { href: "/app/compras", nombre: "Compras", icono: PackagePlus, permiso: "compras.ver", modulo: "compras", atajo: "o" },
    ],
  },
  {
    grupo: "Clientes y números",
    items: [
      { href: "/app/clientes", nombre: "Clientes", icono: Users, permiso: "clientes.ver", modulo: "clientes", atajo: "c" },
      { href: "/app/reportes", nombre: "Reportes", icono: BarChart3, permiso: "reportes.ver", modulo: "reportes", atajo: "x" },
    ],
  },
  {
    grupo: "Extensiones",
    items: [
      { href: "/app/forja", nombre: "Forja", icono: Flame, permiso: "forja.ver", extension: "forja", atajo: "f" },
      { href: "/app/extensiones", nombre: "Extensiones", icono: Blocks, permiso: "extensiones.gestionar" },
    ],
  },
  {
    grupo: "Administración",
    items: [
      { href: "/app/usuarios", nombre: "Usuarios y permisos", icono: UserCog, permiso: "usuarios.gestionar", atajo: "u" },
      { href: "/app/configuracion", nombre: "Configuración", icono: Settings, permiso: "config.editar" },
      { href: "/app/importar", nombre: "Importar datos", icono: Upload, permiso: "importar.datos" },
      { href: "/app/auditoria", nombre: "Auditoría", icono: ScrollText, permiso: "auditoria.ver" },
    ],
  },
]

export const TODOS_LOS_ITEMS = NAVEGACION.flatMap((g) => g.items)

/** Un acceso se muestra si el permiso alcanza, el módulo está activo y, si es de una extensión, está activada. */
export function itemVisible(
  i: ItemNav,
  puede: (p: Permiso) => boolean,
  moduloActivo: (m: Modulo) => boolean,
  extensionActiva: (x: IdExtension) => boolean,
) {
  return puede(i.permiso) && (!i.modulo || moduloActivo(i.modulo)) && (!i.extension || extensionActiva(i.extension))
}

/** Accesos de la barra inferior en el celular, según el rol. */
export const NAV_MOVIL: Record<Rol, string[]> = {
  dueno: ["/app", "/app/mostrador", "/app/inventario", "/app/reportes"],
  administracion: ["/app", "/app/mostrador", "/app/inventario", "/app/clientes"],
  mostrador: ["/app/mostrador", "/app/presupuestos", "/app/inventario", "/app/clientes"],
  deposito: ["/app/inventario", "/app/inventario/conteos", "/app/entregas", "/app/compras"],
  tecnico: ["/app/servicio", "/app/inventario", "/app/clientes", "/app"],
  compras: ["/app/compras", "/app/inventario", "/app/precios", "/app/reportes"],
}

export function itemActivo(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app"
  if (href === "/app/inventario") return pathname === "/app/inventario" || /^\/app\/inventario\/(?!conteos)/.test(pathname)
  return pathname === href || pathname.startsWith(`${href}/`)
}
