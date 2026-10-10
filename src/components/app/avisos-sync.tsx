"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { useApp } from "@/cliente/app-contexto"
import { lanzarChispa } from "@/components/marca/momento-chispa"

const TEXTO_AVISO: Record<string, string> = {
  stock_negativo: "Stock negativo",
  precio_distinto: "Precio distinto de lista",
  limite_excedido: "Límite de crédito excedido",
  caja_cerrada: "Venta sin caja abierta",
  conflicto: "Conflicto resuelto",
  presupuesto_vencido: "Presupuesto vencido",
  sobrante: "Recepción con sobrante",
}

/**
 * Escucha al motor y avisa: chispa cuando se sincroniza una cola hecha sin
 * conexión, error claro cuando el servidor rechaza algo, advertencias para revisar.
 */
export function AvisosSincronizacion() {
  const { motor } = useApp()
  useEffect(
    () =>
      motor.suscribir((ev) => {
        if (ev.tipo === "conexion" && ev.estado === "sin_conexion") {
          toast.warning("Sin conexión. Podés seguir trabajando: todo queda guardado en este equipo.", { id: "conexion", duration: 5000 })
        }
        if (ev.tipo !== "sincronizado") return
        if (ev.sinConexion > 0) {
          const indicador = document.getElementById("indicador-conexion")
          const que = ev.ventasSinConexion
            ? `${ev.ventasSinConexion} ${ev.ventasSinConexion === 1 ? "venta" : "ventas"}`
            : `${ev.sinConexion} cambio${ev.sinConexion === 1 ? "" : "s"}`
          lanzarChispa({ desde: indicador, mensaje: `Cola sincronizada · ${que}` })
          toast.success(`Volvió la conexión: se sincronizaron ${que} hechas sin conexión.`, { id: "conexion" })
        }
        for (const r of ev.rechazadas) {
          toast.error("El servidor no aceptó un cambio", { description: r.error, duration: 12000 })
        }
        const avisos = ev.avisos.flatMap((a) => a.avisos)
        if (avisos.length) {
          const tipos = [...new Set(avisos.map((a) => a.split(":")[0]))].map((t) => TEXTO_AVISO[t] ?? t)
          toast.warning(`Para revisar: ${tipos.join(", ")}`, { description: avisos.slice(0, 3).map((a) => a.split(": ").slice(1).join(": ")).join(" · "), duration: 9000 })
        }
        if (ev.recibidas > 0 && ev.enviadas === 0) {
          toast.info(`${ev.recibidas} cambio${ev.recibidas === 1 ? "" : "s"} desde otros puestos`, { duration: 3000 })
        }
      }),
    [motor],
  )
  return null
}
