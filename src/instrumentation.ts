import type { Instrumentation } from "next"

/** Errores del servidor (render, rutas, acciones) → monitoreo. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, contexto) => {
  const { registrarEnServidor, sanear } = await import("@/lib/monitoreo")
  const e = error as Error & { digest?: string }
  await registrarEnServidor(
    sanear({
      mensaje: e.message,
      pila: e.stack,
      origen: "servidor",
      ruta: request.path,
      digest: e.digest,
      extra: { tipo: contexto.routeType },
    }),
  )
}
