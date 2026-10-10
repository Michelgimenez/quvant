"use client"

import { useMemo } from "react"
import { useApp } from "@/cliente/app-contexto"
import type { FuenteForja } from "@/forja/datos/fuente"
import { useRedForjaApp, useSimulacionForja } from "@/forja/datos/usar-forja-app"
import { tallerForja } from "@/forja/dominio/modelo"
import { Universo } from "./universo"

/** Forja dentro de la app: datos de Yunque, simulador si la empresa es demo y enlaces a los módulos. */
export function UniversoForjaApp({ simulacion }: { activacion: boolean; simulacion: boolean }) {
  const { motor } = useApp()
  const { red, eventos } = useRedForjaApp()
  const sim = useSimulacionForja(simulacion)
  const fuente = useMemo<FuenteForja>(
    () => ({
      red,
      eventos,
      taller: (id) => (red.nodos.some((n) => n.id === id) ? tallerForja(motor.estado, id, new Date()) : null),
      simulacion: sim.activa,
      propuesta: false,
      enlaces: {
        inventario: (_sucursalId, filtro) => `/app/inventario${filtro?.producto ? `?producto=${filtro.producto}` : filtro?.rack ? `?q=${encodeURIComponent(filtro.rack)}` : ""}`,
        servicio: (ordenId) => `/app/servicio?orden=${ordenId}`,
        entregas: () => "/app/entregas",
        mostrador: () => "/app/mostrador",
      },
    }),
    [red, eventos, sim.activa, motor],
  )
  return <Universo fuente={fuente} />
}
