/**
 * Configuración de una demo comercial para un prospecto (`/demo/[slug]`).
 *
 * Para sumar un prospecto: copiar `_plantilla.ts`, completar los datos,
 * poner sus logos en `public/clientes/<slug>/` y agregarlo en `index.ts`.
 * Lo que no se sepa todavía va como `[COMPLETAR: …]`: se ve resaltado en la demo.
 */
export type ClienteDemo = {
  slug: string
  nombre: string
  /** Una línea: qué hace el negocio. */
  rubro: string
  /** Color de acento de su marca (hex). Se usa como en la app: barra, botones, detalles. */
  color: string
  /** Logo para fondos claros. */
  logo: string
  /** Logo para fondos oscuros. */
  logoNegativo: string
  /** Isotipo (opcional, para la pantalla del celular). */
  isotipo?: string
  /** Sus categorías reales de productos. */
  categorias: string[]
  /** De dónde salen las categorías (o qué falta para confirmarlas). */
  fuenteCategorias: string
  /** Problemas detectados en el relevamiento. */
  problemas: { area: string; detalle: string }[]
  /** Sucursales o puntos de venta, si se conocen. */
  sucursales: string[]
  /** Plazo estimado de implementación (escena "Cómo empezamos"). */
  plazo: string
  /** Quién presenta la demo (vendedor de Yunque). */
  contacto: { nombre: string; email: string; telefono: string }
  /** Demo pública de Forja (`/demo/<slug>/forja`), si la tiene. */
  forja?: ForjaCliente
}

/** Una sucursal de la demo de Forja: los nombres viven acá (el snapshot solo guarda el código). */
export type SucursalForjaCliente = {
  /** Código de la sucursal en el seed (CC, NO, DM) o uno nuevo. */
  codigo: string
  nombre: string
  direccion: string
  lat: number
  lng: number
  tipo: "sucursal" | "deposito"
  /** Ficticia: se marca DEMO. */
  demo: boolean
  puestos?: number
  ventasDia?: number
}

export type ForjaCliente = {
  sucursales: SucursalForjaCliente[]
  /** Lo que falta saber, visible en la demo como [COMPLETAR]. */
  pendiente: string
  /** Orígenes que pueden embeber la demo en un iframe (CSP frame-ancestors, solo en esa ruta). */
  embebibleEn: string[]
  /** Snapshot generado desde el seed con `npm run snapshot-forja` (sin nombres: los pone esta configuración). */
  snapshot: () => Promise<unknown>
}
