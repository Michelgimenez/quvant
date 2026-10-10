/**
 * Fechas de la demo en hora de Argentina (UTC−3, sin horario de verano).
 * Se guardan en ISO UTC; se generan y muestran en hora local argentina.
 */
export const OFFSET_ART_HORAS = 3
const DIA_MS = 86_400_000

export type DiaART = { y: number; m: number; d: number }

export function diaART(fecha: Date): DiaART {
  const local = new Date(fecha.getTime() - OFFSET_ART_HORAS * 3_600_000)
  return { y: local.getUTCFullYear(), m: local.getUTCMonth(), d: local.getUTCDate() }
}

/** Fecha (Date UTC) para una hora local argentina de un día dado. */
export function enART(dia: DiaART, hora = 0, minuto = 0) {
  return new Date(Date.UTC(dia.y, dia.m, dia.d, hora + OFFSET_ART_HORAS, minuto))
}

export function sumarDias(dia: DiaART, n: number): DiaART {
  const t = new Date(Date.UTC(dia.y, dia.m, dia.d) + n * DIA_MS)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }
}

/** 0 = domingo … 6 = sábado */
export function diaSemana(dia: DiaART) {
  return new Date(Date.UTC(dia.y, dia.m, dia.d)).getUTCDay()
}

export function claveDia(dia: DiaART) {
  return `${dia.y}-${String(dia.m + 1).padStart(2, "0")}-${String(dia.d).padStart(2, "0")}`
}

/** Días calendario entre dos fechas ISO (en hora argentina). */
export function diasEntre(desdeISO: string, hastaISO: string) {
  const a = diaART(new Date(desdeISO))
  const b = diaART(new Date(hastaISO))
  return Math.round((Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d)) / DIA_MS)
}

export function inicioDiaART(fecha: Date) {
  return enART(diaART(fecha))
}
