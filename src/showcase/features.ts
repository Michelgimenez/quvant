/**
 * Registro de funcionalidades de Quvant: la única fuente de verdad sobre qué
 * existe. Lo usan el sitio, la presentación para inversores y la demo comercial.
 *
 * Estados (definición honesta, ver docs/ROADMAP.md):
 * - `disponible`: construido y funcionando de punta a punta en la app (hoy con
 *   los datos de la empresa demo). Listo para usar en un piloto, sujeto a la
 *   auditoría de arquitectura y seguridad previa a producción.
 * - `demo`: se puede ver y usar, pero una parte está emulada (una integración
 *   externa, facturación, cobro o un servicio que todavía no está conectado).
 * - `próximamente`: está en la hoja de ruta; no está construido.
 *
 * Regla (CLAUDE.md): al terminar o cambiar una funcionalidad, actualizar este
 * archivo, las escenas afectadas y docs/ROADMAP.md.
 */
export type EstadoFeature = "disponible" | "demo" | "próximamente"

export type Escena =
  | "stock"
  | "ventas"
  | "precios"
  | "servicio"
  | "multinegocio"
  | "seguridad"
  | "integraciones"
  | "plataforma"
  | "forja"

export type Feature = {
  id: string
  nombre: string
  frase: string
  estado: EstadoFeature
  escena: Escena
  /** Aclaración honesta cuando el estado necesita contexto. */
  nota?: string
}

export const FEATURES: Feature[] = [
  // Stock
  { id: "inventario-multisucursal", nombre: "Inventario multisucursal", frase: "El stock de cada sucursal, en tiempo real y en un solo lugar.", estado: "disponible", escena: "stock" },
  { id: "escaneo-camara", nombre: "Escaneo con la cámara", frase: "El celular lee el código de barras y busca el producto.", estado: "disponible", escena: "stock", nota: "Usa la cámara del navegador; en equipos sin soporte se carga el código a mano." },
  { id: "conteos", nombre: "Conteos de inventario", frase: "Contar, comparar y ajustar sin planillas.", estado: "disponible", escena: "stock" },
  { id: "transferencias", nombre: "Transferencias entre sucursales", frase: "Mover mercadería entre sucursales con registro.", estado: "disponible", escena: "stock" },
  { id: "compras", nombre: "Compras y proveedores", frase: "Órdenes de compra sugeridas por stock mínimo y recepción con ingreso de stock.", estado: "disponible", escena: "stock" },
  { id: "importador", nombre: "Importador de Excel y CSV", frase: "Traé tu catálogo con mapeo de columnas y validación.", estado: "disponible", escena: "plataforma" },

  // Ventas
  { id: "mostrador", nombre: "Mostrador", frase: "Vender rápido, con teclado o con lector.", estado: "disponible", escena: "ventas" },
  { id: "mostrador-sin-conexion", nombre: "Mostrador sin conexión", frase: "Si se corta internet, se sigue vendiendo. Cuando vuelve, se sincroniza solo.", estado: "disponible", escena: "ventas", nota: "Sincroniza contra el servidor de la demo; la conexión con el servidor de producción está preparada y pendiente de prueba en un entorno real." },
  { id: "presupuestos", nombre: "Presupuestos", frase: "Presupuestos prolijos que pasan a venta con un clic.", estado: "disponible", escena: "ventas" },
  { id: "clientes-cuentas", nombre: "Clientes y cuentas corrientes", frase: "Saldo, límite y movimientos de cada cliente.", estado: "disponible", escena: "ventas" },
  { id: "entregas", nombre: "Entregas", frase: "Hoja de ruta del día y estado de cada entrega.", estado: "disponible", escena: "ventas" },
  { id: "caja", nombre: "Caja diaria", frase: "Apertura, movimientos y cierre de caja por mostrador.", estado: "disponible", escena: "ventas" },
  { id: "cobro-mercadopago", nombre: "Cobro con Mercado Pago", frase: "QR de cobro desde el mostrador.", estado: "demo", escena: "integraciones", nota: "Emulado: no se conecta con Mercado Pago." },
  { id: "factura-arca", nombre: "Factura electrónica ARCA", frase: "Facturas A y B autorizadas por ARCA.", estado: "próximamente", escena: "integraciones", nota: "La demo emula el CAE. La conexión real con ARCA está en la hoja de ruta." },

  // Precios
  { id: "listas-precios", nombre: "Listas de precios", frase: "Mayorista, minorista y las que necesites.", estado: "disponible", escena: "precios" },
  { id: "aumento-masivo", nombre: "Aumento masivo con vista previa", frase: "Actualizá miles de precios en minutos y mirá el impacto antes de aplicar.", estado: "disponible", escena: "precios" },

  // Servicio técnico
  { id: "servicio-tecnico", nombre: "Servicio técnico", frase: "Órdenes de reparación con estados, técnico asignado y presupuesto.", estado: "disponible", escena: "servicio" },
  { id: "avisos-whatsapp", nombre: "Avisos por WhatsApp", frase: "El cliente se entera cuando su equipo está listo.", estado: "demo", escena: "servicio", nota: "Emulado: arma el mensaje y el enlace, no envía por la API de WhatsApp." },

  // Multinegocio
  { id: "tablero-multinegocio", nombre: "Tablero multinegocio", frase: "Todos tus negocios y sucursales en una pantalla.", estado: "disponible", escena: "multinegocio" },
  { id: "reportes", nombre: "Reportes", frase: "Ventas, márgenes, stock valorizado y cuentas corrientes.", estado: "disponible", escena: "multinegocio" },
  { id: "co-branding", nombre: "Tu marca adentro", frase: "Tu logo y tu color en el sistema.", estado: "disponible", escena: "multinegocio" },
  { id: "modulos-por-org", nombre: "Módulos a medida", frase: "Activá solo lo que tu negocio usa.", estado: "disponible", escena: "plataforma" },

  // Seguridad
  { id: "roles-permisos", nombre: "Roles y permisos", frase: "Cada persona ve y hace solo lo que le corresponde.", estado: "disponible", escena: "seguridad" },
  { id: "auditoria", nombre: "Registro de auditoría", frase: "Quién hizo qué y cuándo, en cada acción.", estado: "disponible", escena: "seguridad" },
  { id: "doble-factor", nombre: "Doble factor para dueños y administración", frase: "Un código del celular además de la contraseña.", estado: "demo", escena: "seguridad", nota: "En la demo el autenticador está emulado; en producción usa el MFA de Supabase y la base exige nivel aal2." },
  { id: "aislamiento-orgs", nombre: "Aislamiento entre empresas", frase: "Los datos de cada empresa quedan separados en la base.", estado: "disponible", escena: "seguridad", nota: "Políticas RLS probadas con tests automáticos sobre Postgres." },
  { id: "copias-exportacion", nombre: "Copias y exportación", frase: "Tus datos siempre exportables.", estado: "demo", escena: "seguridad", nota: "La exportación funciona. Las copias diarias dependen del plan de base de datos de producción; la restauración probada está pendiente." },
  { id: "estado-sistema", nombre: "Página de estado", frase: "El estado del sistema, a la vista.", estado: "disponible", escena: "plataforma" },

  // Integraciones y lo que viene
  { id: "mercadolibre", nombre: "Mercado Libre", frase: "Stock y precios sincronizados con tus publicaciones.", estado: "próximamente", escena: "integraciones" },
  { id: "app-deposito", nombre: "App de depósito", frase: "Picking y recepción desde el celular, con lector.", estado: "próximamente", escena: "stock", nota: "Hoy el depósito usa la app web adaptada al celular." },
  { id: "migraciones", nombre: "Migración asistida", frase: "Traemos los datos de tu sistema anterior.", estado: "próximamente", escena: "plataforma", nota: "El importador de Excel/CSV existe; los conectores por sistema de origen no." },
  { id: "forja", nombre: "Forja: el taller conectado", frase: "Todas las sucursales en vivo: ventas, stock, transferencias y reparaciones.", estado: "demo", escena: "forja", nota: "Se puede probar en la demo (con la empresa de demostración y su simulador): la red de sucursales, cada sucursal por dentro, la repetición del día, la sala de control y el recorrido de una pieza. Falta conectarla a una base real con clientes." },
]

export function featuresPorEstado(estado: EstadoFeature) {
  return FEATURES.filter((f) => f.estado === estado)
}

export function feature(id: string) {
  const f = FEATURES.find((x) => x.id === id)
  if (!f) throw new Error(`Feature desconocida: ${id}`)
  return f
}

export const ETIQUETA_ESTADO: Record<EstadoFeature, string> = {
  disponible: "Disponible",
  demo: "En demo",
  "próximamente": "Próximamente",
}
