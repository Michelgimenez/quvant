import { formatoPesos } from "./dinero"
import type { EstadoPresupuesto, Presupuesto } from "./tipos"

export const NOMBRE_ESTADO_PRESUPUESTO: Record<EstadoPresupuesto, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  vencido: "Vencido",
  convertido: "Convertido en venta",
}

export const ABIERTOS: EstadoPresupuesto[] = ["borrador", "enviado", "aceptado"]

/** Estado que se muestra: un presupuesto abierto con fecha pasada se ve como vencido. */
export function estadoVisible(p: Presupuesto, ahoraISO: string): EstadoPresupuesto {
  if (ABIERTOS.includes(p.estado) && p.vencimiento < ahoraISO) return "vencido"
  return p.estado
}

export function mensajePresupuesto(p: Presupuesto, negocio: string) {
  const nombre = p.clienteNombre.split(" ")[0]
  const numero = p.numero ? `#${p.numero}` : p.numeroLocal
  return `Hola ${nombre}. Te paso el presupuesto ${numero} de ${negocio} por ${formatoPesos(p.total)} (${p.items.length} ítem${p.items.length === 1 ? "" : "s"}). Vale hasta el ${new Date(p.vencimiento).toLocaleDateString("es-AR")}. Cualquier duda, respondé este mensaje.`
}
