/**
 * Las cuatro empresas de la demo: el mismo Quvant en cuatro negocios de escalas distintas.
 * TODAS SON FICTICIAS y llevan el sello DEMO. Los nombres son propuestas: Michel los puede cambiar acá.
 * Se buscaron antes de usarlos (20/10/2026): no aparece ninguna marca conocida con estos nombres
 * (ver docs/REPORTE.md, tanda 3).
 *
 * Los módulos copian la forma de `Organizacion.modulos` (un Record de booleanos), así los mismos componentes
 * los entienden. La terminología cambia por negocio: "Caja" y "Fiado" en el kiosco, "Preventa" y "Reparto" en
 * la distribuidora, "Sucursales" y "Aprobaciones" en el grupo.
 */

export type IdEmpresa = "kiosco" | "ferreteria" | "distribuidora" | "grupo"
export const EMPRESAS_ORDEN: readonly IdEmpresa[] = ["kiosco", "ferreteria", "distribuidora", "grupo"]

export type Escala = "kiosco" | "comercio" | "distribuidora" | "empresa"

/** Módulos que se encienden por empresa (forma de Organizacion.modulos). */
export const MODULOS_DEMO = [
  "tablero",
  "mostrador",
  "caja",
  "fiado",
  "presupuestos",
  "servicio",
  "inventario",
  "transferencias",
  "precios",
  "compras",
  "proveedores",
  "clientes",
  "preventa",
  "reparto",
  "cobranzas",
  "sucursales",
  "comparacion",
  "aprobaciones",
  "permisos",
  "auditoria",
  "integraciones",
  "reportes",
  "forja",
] as const
export type ModuloDemo = (typeof MODULOS_DEMO)[number]

export type IconoDemo =
  | "inicio"
  | "caja"
  | "fiado"
  | "productos"
  | "precios"
  | "proveedores"
  | "mostrador"
  | "presupuestos"
  | "servicio"
  | "stock"
  | "transferencias"
  | "compras"
  | "clientes"
  | "reportes"
  | "preventa"
  | "reparto"
  | "cobranzas"
  | "sucursales"
  | "comparacion"
  | "aprobaciones"
  | "permisos"
  | "auditoria"
  | "integraciones"
  | "forja"

export type ItemNavDemo = { modulo: ModuloDemo; nombre: string; icono: IconoDemo }

export type ConfigEmpresa = {
  id: IdEmpresa
  nombre: string
  /** Para la barra de la demo y el selector. */
  nombreCorto: string
  rubro: string
  escala: Escala
  /** Lo que se lee en la tarjeta del selector: "1 caja", "40 sucursales". */
  escalaTexto: string
  /** El tamaño completo, para la descripción. */
  tamano: string
  /** Color de la empresa: solo en su logo, el indicador activo y la serie principal de sus gráficos. */
  color: string
  semilla: string
  /** Quién atiende (nombres ficticios). */
  responsable: { nombre: string; rol: string }
  modulos: Record<ModuloDemo, boolean>
  extensiones: { forja: { activa: boolean } }
  navegacion: { grupo: string; items: ItemNavDemo[] }[]
  densidad: "amplia" | "media" | "densa"
  cantidades: { productos: number; clientes: number; sucursales: number; usuarios: number; preventistas?: number }
  /** El subtítulo del recorrido guiado. */
  presentacion: string
}

function modulos(encendidos: ModuloDemo[]): Record<ModuloDemo, boolean> {
  return Object.fromEntries(MODULOS_DEMO.map((m) => [m, encendidos.includes(m)])) as Record<ModuloDemo, boolean>
}

/**
 * Fecha ancla de la demo: un viernes a la tarde. Todas las fechas (90 días de ventas, deudas, vencimientos)
 * se calculan desde acá. La demo arranca a esta hora y avanza con el reloj real; al filmar, con el cuadro.
 */
export const ANCLA_DEMO = { dia: "2026-10-16", hora: 17, minuto: 30 } as const
export const ANCLA_DEMO_ISO = `${ANCLA_DEMO.dia}T${String(ANCLA_DEMO.hora).padStart(2, "0")}:${String(ANCLA_DEMO.minuto).padStart(2, "0")}:00-03:00`

export const EMPRESAS: Record<IdEmpresa, ConfigEmpresa> = {
  kiosco: {
    id: "kiosco",
    nombre: "Kiosco La Esquina",
    nombreCorto: "La Esquina",
    rubro: "Kiosco y almacén de barrio",
    escala: "kiosco",
    escalaTexto: "1 caja",
    tamano: "1 caja · 1 persona · unos 330 productos",
    color: "#E4572E",
    semilla: "quvant-demo-kiosco-v1",
    responsable: { nombre: "Marta Ibáñez", rol: "Dueña" },
    modulos: modulos(["tablero", "mostrador", "caja", "fiado", "inventario", "precios", "proveedores", "clientes"]),
    extensiones: { forja: { activa: false } },
    navegacion: [
      {
        grupo: "Hoy",
        items: [
          { modulo: "tablero", nombre: "Inicio", icono: "inicio" },
          { modulo: "mostrador", nombre: "Vender", icono: "mostrador" },
          { modulo: "caja", nombre: "Caja", icono: "caja" },
          { modulo: "fiado", nombre: "Fiado", icono: "fiado" },
        ],
      },
      {
        grupo: "El negocio",
        items: [
          { modulo: "inventario", nombre: "Productos", icono: "productos" },
          { modulo: "precios", nombre: "Precios", icono: "precios" },
          { modulo: "proveedores", nombre: "Proveedores", icono: "proveedores" },
        ],
      },
    ],
    densidad: "amplia",
    cantidades: { productos: 327, clientes: 46, sucursales: 1, usuarios: 1 },
    presentacion: "Este es un kiosco: una caja, una persona. Lo que importa entra en una pantalla y se lee de lejos.",
  },
  ferreteria: {
    id: "ferreteria",
    nombre: "Ferretería Industrial Demo",
    nombreCorto: "Ferretería Industrial",
    rubro: "Ferretería industrial y maquinaria",
    escala: "comercio",
    escalaTexto: "3 sucursales",
    tamano: "2 negocios · 3 sucursales · unos 300 productos",
    color: "#12A594",
    semilla: "ferreteria-industrial-demo-v1",
    responsable: { nombre: "Martín Olivera", rol: "Dueño" },
    modulos: modulos(["tablero", "mostrador", "caja", "presupuestos", "servicio", "inventario", "transferencias", "precios", "compras", "clientes", "reportes", "forja"]),
    extensiones: { forja: { activa: false } },
    navegacion: [
      {
        grupo: "Operación",
        items: [
          { modulo: "tablero", nombre: "Tablero", icono: "inicio" },
          { modulo: "mostrador", nombre: "Mostrador", icono: "mostrador" },
          { modulo: "presupuestos", nombre: "Presupuestos", icono: "presupuestos" },
          { modulo: "servicio", nombre: "Servicio técnico", icono: "servicio" },
        ],
      },
      {
        grupo: "Stock y precios",
        items: [
          { modulo: "inventario", nombre: "Inventario", icono: "stock" },
          { modulo: "transferencias", nombre: "Transferencias", icono: "transferencias" },
          { modulo: "precios", nombre: "Precios", icono: "precios" },
          { modulo: "compras", nombre: "Compras", icono: "compras" },
        ],
      },
      {
        grupo: "Clientes y números",
        items: [
          { modulo: "clientes", nombre: "Clientes", icono: "clientes" },
          { modulo: "reportes", nombre: "Reportes", icono: "reportes" },
        ],
      },
    ],
    densidad: "media",
    cantidades: { productos: 290, clientes: 120, sucursales: 3, usuarios: 9 },
    presentacion: "Una ferretería industrial con dos negocios y tres sucursales: stock por sucursal, presupuestos que pasan a venta y servicio técnico.",
  },
  distribuidora: {
    id: "distribuidora",
    nombre: "Distribuidora Ruta Clara",
    nombreCorto: "Ruta Clara",
    rubro: "Distribuidora mayorista de almacén",
    escala: "distribuidora",
    escalaTexto: "12 preventistas",
    tamano: "1 depósito · 12 preventistas · 400 clientes · unos 1.800 productos",
    color: "#3A7BEA",
    semilla: "quvant-demo-distribuidora-v1",
    responsable: { nombre: "Sergio Funes", rol: "Gerente comercial" },
    modulos: modulos(["tablero", "preventa", "reparto", "cobranzas", "clientes", "precios", "inventario", "compras", "reportes", "forja"]),
    extensiones: { forja: { activa: true } },
    navegacion: [
      {
        grupo: "La calle",
        items: [
          { modulo: "tablero", nombre: "Tablero", icono: "inicio" },
          { modulo: "preventa", nombre: "Preventa", icono: "preventa" },
          { modulo: "reparto", nombre: "Reparto", icono: "reparto" },
          { modulo: "cobranzas", nombre: "Cobranzas", icono: "cobranzas" },
        ],
      },
      {
        grupo: "Comercial",
        items: [
          { modulo: "clientes", nombre: "Cuentas corrientes", icono: "clientes" },
          { modulo: "precios", nombre: "Listas de precios", icono: "precios" },
        ],
      },
      {
        grupo: "Depósito",
        items: [
          { modulo: "inventario", nombre: "Stock", icono: "stock" },
          { modulo: "compras", nombre: "Compras", icono: "compras" },
          { modulo: "reportes", nombre: "Reportes", icono: "reportes" },
          { modulo: "forja", nombre: "Forja", icono: "forja" },
        ],
      },
    ],
    densidad: "media",
    cantidades: { productos: 1800, clientes: 400, sucursales: 1, usuarios: 18, preventistas: 12 },
    presentacion: "Una distribuidora: un depósito, doce preventistas en la calle y cuatrocientos clientes con su lista de precios y su cuenta corriente.",
  },
  grupo: {
    id: "grupo",
    nombre: "Grupo Cordal",
    nombreCorto: "Grupo Cordal",
    rubro: "Cadena de hogar y construcción",
    escala: "empresa",
    escalaTexto: "40 sucursales",
    tamano: "40 sucursales en 6 provincias · unos 300 usuarios · unos 25.000 productos",
    color: "#B04A8C",
    semilla: "quvant-demo-grupo-v1",
    responsable: { nombre: "Laura Cáceres", rol: "Dirección de operaciones" },
    modulos: modulos(["tablero", "sucursales", "comparacion", "aprobaciones", "compras", "inventario", "precios", "permisos", "auditoria", "integraciones", "reportes", "forja"]),
    extensiones: { forja: { activa: true } },
    navegacion: [
      {
        grupo: "Control",
        items: [
          { modulo: "tablero", nombre: "Consolidado", icono: "inicio" },
          { modulo: "sucursales", nombre: "Sucursales", icono: "sucursales" },
          { modulo: "comparacion", nombre: "Comparación", icono: "comparacion" },
          { modulo: "aprobaciones", nombre: "Aprobaciones", icono: "aprobaciones" },
        ],
      },
      {
        grupo: "Abastecimiento",
        items: [
          { modulo: "compras", nombre: "Compras", icono: "compras" },
          { modulo: "inventario", nombre: "Stock", icono: "stock" },
          { modulo: "precios", nombre: "Precios", icono: "precios" },
        ],
      },
      {
        grupo: "Gobierno",
        items: [
          { modulo: "permisos", nombre: "Permisos", icono: "permisos" },
          { modulo: "auditoria", nombre: "Auditoría", icono: "auditoria" },
          { modulo: "integraciones", nombre: "Integraciones", icono: "integraciones" },
          { modulo: "reportes", nombre: "Reportes", icono: "reportes" },
          { modulo: "forja", nombre: "Forja", icono: "forja" },
        ],
      },
    ],
    densidad: "densa",
    cantidades: { productos: 25000, clientes: 2400, sucursales: 40, usuarios: 312 },
    presentacion: "Un grupo con cuarenta sucursales en seis provincias: el consolidado, la comparación entre sucursales, las aprobaciones por niveles y la auditoría.",
  },
}

export function esIdEmpresa(x: unknown): x is IdEmpresa {
  return typeof x === "string" && (EMPRESAS_ORDEN as readonly string[]).includes(x)
}
