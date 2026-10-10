/**
 * Monitoreo de errores. Sin proveedor externo configurado: se registra en la
 * consola del servidor como JSON estructurado (lo recoge cualquier plataforma
 * de logs). Con MONITOREO_WEBHOOK definido, además se reenvía por POST.
 * Conectar Sentry u otro servicio = implementar `enviarExterno`.
 */
export type ReporteError = {
  mensaje: string
  pila?: string
  origen: "cliente" | "servidor"
  ruta?: string
  digest?: string
  momento: string
  extra?: Record<string, string | number | boolean | null>
}

/** Recorta y limpia lo que se registra (sin datos de formularios ni tokens). */
export function sanear(r: Partial<ReporteError>): ReporteError {
  const corto = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : undefined)
  return {
    mensaje: corto(r.mensaje, 500) ?? "Error sin mensaje",
    pila: corto(r.pila, 4000),
    origen: r.origen === "servidor" ? "servidor" : "cliente",
    ruta: corto(r.ruta, 200)?.replace(/[?#].*$/, ""),
    digest: corto(r.digest, 100),
    momento: new Date().toISOString(),
  }
}

const recientes: number[] = []

export async function registrarEnServidor(r: ReporteError) {
  recientes.push(Date.now())
  while (recientes.length && recientes[0] < Date.now() - 3_600_000) recientes.shift()
  console.error(JSON.stringify({ nivel: "error", servicio: "yunque", ...r }))
  const webhook = process.env.MONITOREO_WEBHOOK
  if (webhook) {
    try {
      await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(r), signal: AbortSignal.timeout(2000) })
    } catch {
      /* el monitoreo nunca rompe la app */
    }
  }
}

/** Errores registrados en la última hora (para la página de estado; sin detalles). */
export function erroresUltimaHora() {
  while (recientes.length && recientes[0] < Date.now() - 3_600_000) recientes.shift()
  return recientes.length
}

/** Desde el navegador: reporta sin bloquear (sendBeacon si está disponible). */
export function reportarError(error: unknown, extra?: { digest?: string }) {
  if (typeof window === "undefined") return
  const e = error instanceof Error ? error : new Error(String(error))
  const cuerpo = JSON.stringify({ mensaje: e.message, pila: e.stack, ruta: location.pathname, digest: extra?.digest })
  try {
    if (navigator.sendBeacon?.("/api/errores", new Blob([cuerpo], { type: "application/json" }))) return
    void fetch("/api/errores", { method: "POST", body: cuerpo, headers: { "content-type": "application/json" }, keepalive: true })
  } catch {
    /* sin red: nada */
  }
}
