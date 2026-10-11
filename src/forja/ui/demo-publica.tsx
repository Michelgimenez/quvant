"use client"

import { useEffect, useMemo, useState } from "react"
import type { FuenteForja } from "@/forja/datos/fuente"
import { MundoDemo, type NombresDemo, type SnapshotForja } from "@/forja/datos/mundo-demo"
import { eventosDelDia, redForja, tallerForja } from "@/forja/dominio/modelo"
import { historiaMaquina, recorridoProducto } from "@/forja/dominio/pieza"
import { EVENTO_ARRANCAR_ACTIVACION } from "./activacion/activacion"
import { Universo, type ActivacionUniverso, type MarcaUniverso } from "./universo"

declare global {
  interface Window {
    /** Guion de los videos (solo con ?grabar): eventos a pedido, siempre iguales. */
    __forjaGuion?: { arrancar: () => void; vender: (codigo: string, puesto?: number) => boolean; quiebre: (codigo: string, puesto?: number) => boolean; despachar: (desde: string, hacia: string) => boolean }
  }
}

/**
 * Demo pública de Forja: sin sesión ni base. Un snapshot del seed en memoria,
 * el simulador corriendo en el navegador (sello SIMULACIÓN) y la activación al
 * entrar. Con `?grabar`, el simulador se detiene y los eventos los pide el
 * script de los videos (scripts/grabar-forja.mjs).
 */
export function DemoPublicaForja({
  snapshot,
  nombres,
  propuesta,
  marca = null,
  aviso = null,
}: {
  snapshot: SnapshotForja
  nombres?: NombresDemo
  propuesta: boolean
  marca?: MarcaUniverso | null
  aviso?: React.ReactNode
}) {
  const [mundo] = useState(() => new MundoDemo(snapshot, nombres))
  const [grabando] = useState(() => new URLSearchParams(window.location.search).has("grabar"))
  // Grabando, la activación espera la señal del guion (así la toma empieza en el primer cuadro)
  const [activacion] = useState<ActivacionUniverso>(() => ({ alTerminar: () => {}, arranqueManual: grabando }))
  const [version, setVersion] = useState(0)

  // El calor depende de la hora: se recalcula cada 15 s aunque no pase nada
  useEffect(() => {
    const id = window.setInterval(() => setVersion((v) => v + 1), 15_000)
    return () => window.clearInterval(id)
  }, [])

  // Simulador: un evento cada pocos segundos, solo con la pestaña visible
  useEffect(() => {
    if (grabando) return
    let vivo = true
    let temporizador = 0
    const paso = () => {
      if (!vivo) return
      if (document.visibilityState === "visible" && mundo.paso()) setVersion((v) => v + 1)
      temporizador = window.setTimeout(paso, mundo.pausa())
    }
    temporizador = window.setTimeout(paso, 1500)
    return () => {
      vivo = false
      window.clearTimeout(temporizador)
    }
  }, [mundo, grabando])

  // Guion de grabación (el taller 3D se baja antes, para que la transición no espere la descarga)
  useEffect(() => {
    if (!grabando) return
    void import("./taller/taller-3d")
    const conCambio = (ok: boolean) => {
      setVersion((v) => v + 1)
      return ok
    }
    window.__forjaGuion = {
      arrancar: () => window.dispatchEvent(new Event(EVENTO_ARRANCAR_ACTIVACION)),
      vender: (codigo, puesto) => conCambio(mundo.vender(codigo, puesto)),
      quiebre: (codigo, puesto) => conCambio(mundo.quiebre(codigo, puesto)),
      despachar: (desde, hacia) => conCambio(mundo.despachar(desde, hacia)),
    }
    return () => {
      delete window.__forjaGuion
    }
  }, [mundo, grabando])

  const fuente = useMemo<FuenteForja>(() => {
    const ahora = mundo.ahora()
    return {
      red: redForja(mundo.estado, ahora),
      redEn: (t) => redForja(mundo.estado, t),
      eventos: eventosDelDia(mundo.estado, ahora),
      taller: (id) => (mundo.estado.sucursales.some((s) => s.id === id) ? tallerForja(mundo.estado, id, mundo.ahora()) : null),
      pieza: (p) => {
        if (p.tipo === "producto") {
          const recorrido = recorridoProducto(mundo.estado, p.id, mundo.ahora())
          return recorrido ? { tipo: "producto", recorrido } : null
        }
        const historia = historiaMaquina(mundo.estado, p.id)
        return historia ? { tipo: "maquina", historia } : null
      },
      simulacion: true,
      propuesta,
      enlaces: null,
      desfase: mundo.desfase,
    }
    // version: cada evento simulado o paso del reloj
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, mundo, propuesta])

  return <Universo fuente={fuente} activacion={activacion} marca={marca} aviso={aviso} />
}
