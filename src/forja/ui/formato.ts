/** Hora en Argentina, 24 h ("15:42"). */
export function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" })
}

/** Tiempo transcurrido corto: "5 h", "3 d 4 h". */
export function duracionHoras(horas: number) {
  if (horas < 24) return `${horas} h`
  const d = Math.floor(horas / 24)
  const h = horas % 24
  return h ? `${d} d ${h} h` : `${d} d`
}
