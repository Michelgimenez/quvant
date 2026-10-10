import { formatoPesos } from "./dinero"
import type { Centavos, EstadoServicio } from "./tipos"

export const NOMBRE_ESTADO_SERVICIO: Record<EstadoServicio, string> = {
  ingresado: "Ingresado",
  diagnostico: "En diagnóstico",
  esperando_aprobacion: "Esperando aprobación",
  en_reparacion: "En reparación",
  listo: "Listo para retirar",
  entregado: "Entregado",
  sin_reparacion: "Sin reparación",
}

/** Transiciones permitidas en el taller. */
export const TRANSICIONES_SERVICIO: Record<EstadoServicio, EstadoServicio[]> = {
  ingresado: ["diagnostico"],
  diagnostico: ["esperando_aprobacion", "en_reparacion", "sin_reparacion"],
  esperando_aprobacion: ["en_reparacion", "sin_reparacion"],
  en_reparacion: ["listo"],
  listo: ["entregado"],
  entregado: [],
  sin_reparacion: ["entregado"],
}

export function puedeTransicionar(desde: EstadoServicio, hacia: EstadoServicio) {
  return TRANSICIONES_SERVICIO[desde].includes(hacia)
}

/** Estados que disparan un aviso al cliente. */
export const ESTADOS_CON_AVISO: EstadoServicio[] = ["esperando_aprobacion", "listo", "sin_reparacion"]

/** Arma el mensaje de WhatsApp para el cliente. Corto, claro, sin vueltas. */
export function mensajeAvisoServicio(
  estado: EstadoServicio,
  cliente: string,
  equipo: string,
  numero: number | string,
  presupuesto: Centavos | null,
  sucursal: string,
) {
  const nombre = cliente.split(" ")[0]
  switch (estado) {
    case "esperando_aprobacion":
      return `Hola ${nombre}. Tu ${equipo} (orden ${numero}) ya tiene presupuesto: ${presupuesto ? formatoPesos(presupuesto) : "a confirmar"}. ¿Lo aprobamos? Respondé SÍ o NO.`
    case "listo":
      return `Hola ${nombre}. Tu ${equipo} (orden ${numero}) está listo para retirar en ${sucursal}. Te esperamos de lunes a viernes de 8 a 19 y sábados de 8 a 13.`
    case "sin_reparacion":
      return `Hola ${nombre}. Tu ${equipo} (orden ${numero}) quedó sin reparar. Podés retirarlo en ${sucursal}.`
    default:
      return `Hola ${nombre}. Novedades de tu ${equipo} (orden ${numero}): ${NOMBRE_ESTADO_SERVICIO[estado].toLowerCase()}.`
  }
}

/** Enlace de WhatsApp (en la demo nunca se abre: el envío está emulado). */
export function enlaceWhatsApp(numero: string, mensaje: string) {
  const digitos = numero.replace(/\D/g, "")
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`
}
