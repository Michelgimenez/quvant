/**
 * Etapas para pasar de demo a producción. Fuente única para la presentación
 * de inversores, la demo comercial ("cómo empezamos") y docs/ROADMAP.md.
 */
export const ETAPAS = [
  {
    id: "auditoria",
    nombre: "Arquitectura y seguridad auditadas",
    detalle: "Revisión externa de arquitectura, RLS, secretos, backups con restauración probada y pruebas de penetración. Conexión real a Supabase en un entorno de staging.",
    estado: "siguiente" as const,
  },
  {
    id: "arca",
    nombre: "Facturación electrónica con ARCA",
    detalle: "Certificado, WSFE, facturas A y B, notas de crédito y contingencia sin conexión.",
    estado: "planificada" as const,
  },
  {
    id: "migraciones",
    nombre: "Migraciones",
    detalle: "Conectores para los sistemas más usados del rubro, sobre el importador de Excel/CSV que ya existe.",
    estado: "planificada" as const,
  },
  {
    id: "deposito",
    nombre: "App de depósito",
    detalle: "Picking, recepción y conteos con lector, pensada para el celular del depósito.",
    estado: "planificada" as const,
  },
  {
    id: "integraciones",
    nombre: "Integraciones",
    detalle: "Mercado Pago, Mercado Libre y WhatsApp Business conectados de verdad (hoy emulados detrás de interfaces).",
    estado: "planificada" as const,
  },
]

/** Cómo empieza un negocio con Yunque (demo comercial). */
export const IMPLEMENTACION = [
  { paso: "Relevamiento", detalle: "Vemos cómo trabajan hoy: sistema, precios, stock y sucursales." },
  { paso: "Migración", detalle: "Traemos productos, precios, clientes y saldos desde su sistema o planillas." },
  { paso: "Piloto en una sucursal", detalle: "Mostrador y stock funcionando en paralelo, con acompañamiento." },
  { paso: "Puesta en marcha", detalle: "Todas las sucursales y módulos, con capacitación al equipo." },
]
