/**
 * La placa de Forja (tanda 9). El nombre se queda (está en el manual); la frase reemplaza a "Lo firme y lo vivo,
 * trabajando juntos", que era de Yunque. BORRADOR: la propone Claude Code y la confirma Michel (docs/REPORTE.md).
 */
export const FORJA = {
  nombre: "Forja",
  firma: "by Quvant",
  frase: "Todo el negocio, en vivo.",
  /** Mientras sea true, la frase es una propuesta. */
  fraseBorrador: true,
  /** Otras dos propuestas, por si Michel prefiere otra. */
  alternativas: ["Cada sucursal, en tiempo real.", "El día entero, de un vistazo."],
} as const
