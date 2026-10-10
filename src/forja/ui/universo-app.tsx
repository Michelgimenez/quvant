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
        inventario: (sucursalId, filtro) => {
          const p = new URLSearchParams({ sucursal: sucursalId })
          if (filtro?.rack) p.set("ubicacion", filtro.rack)
          if (filtro?.producto) p.set("producto", filtro.producto)
          if (filtro?.stock) p.set("stock", filtro.stock)
          return `/app/inventario?${p}`
        },
        servicio: (ordenId) => (ordenId ? `/app/servicio?id=${ordenId}` : "/app/servicio"),
        presupuestos: () => "/app/presupuestos",
        entregas: () => "/app/entregas",
        mostrador: () => "/app/mostrador",
      },
    }),
    [red, eventos, sim.activa, motor],
  )
  return <Universo fuente={fuente} />
}
