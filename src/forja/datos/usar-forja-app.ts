"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { eventosDelDia, redForja, tallerForja } from "@/forja/dominio/modelo"
import { operacionSimulada } from "@/forja/dominio/simulacion-operaciones"
import { SimuladorForja, mundoDesdeEstado } from "@/forja/dominio/simulador"
import type { Id } from "@/dominio/tipos"

/**
 * Forja dentro de la app: el modelo sale del estado de Yunque (la réplica
 * local que mantiene el motor de sincronización). Dueño y administración ven
 * todas las sucursales; el resto, si tiene el permiso, solo las asignadas.
 */
export function useRedForjaApp() {
  const { usuario } = useApp()
  const { e, v } = useDatos()
  // El calor depende de la hora: se recalcula cada 15 s aunque no haya cambios
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  const permitidas = usuario.rol === "dueno" || usuario.rol === "administracion" ? null : usuario.sucursalIds
  const clave = `${v}:${ahora}:${permitidas?.join(",") ?? "*"}`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const red = useMemo(() => redForja(e, new Date(), permitidas), [clave])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const eventos = useMemo(() => eventosDelDia(e, new Date(), permitidas), [clave])
  return { red, eventos, permitidas }
}

export function useTallerForjaApp(sucursalId: Id | null) {
  const { e, v } = useDatos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (sucursalId ? tallerForja(e, sucursalId, new Date()) : null), [v, sucursalId])
}

/**
 * Simulador de eventos para organizaciones DEMO: propone una venta, un
 * despacho, una recepción o un avance de servicio cada pocos segundos y lo
 * inyecta en el servidor demo como si viniera de otro puesto; el motor lo trae
 * al sincronizar. Solo corre con la pestaña visible.
 */
export function useSimulacionForja(habilitada: boolean) {
  const { motor, servidor } = useApp()
  const activa = habilitada && Boolean(servidor) && motor.estado.org.esDemo
  const [eventos, setEventos] = useState(0)
  const contador = useRef(0)

  useEffect(() => {
    if (!activa || !servidor) return
    const sim = new SimuladorForja(`forja:${Date.now()}`)
    let temporizador = 0
    let vivo = true
    const paso = async () => {
      if (!vivo) return
      if (document.visibilityState === "visible") {
        const ahora = new Date()
        const intencion = sim.siguiente(mundoDesdeEstado(motor.estado, ahora), ahora)
        const r = intencion ? operacionSimulada(motor.estado, intencion, ahora, () => motor.uuid(), ++contador.current) : null
        if (r) {
          try {
            const resp = await servidor.inyectar(r.op, r.autor)
            if (resp?.resultado.ok) {
              await motor.sincronizar()
              if (vivo) setEventos((n) => n + 1)
            }
          } catch {
            /* sin red simulada: se reintenta en el próximo paso */
          }
        }
      }
      if (vivo) temporizador = window.setTimeout(paso, sim.pausa())
    }
    temporizador = window.setTimeout(paso, 1200)
    return () => {
      vivo = false
      window.clearTimeout(temporizador)
    }
  }, [activa, motor, servidor])

  return { activa, eventos }
}
