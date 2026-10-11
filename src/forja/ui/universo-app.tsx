"use client"

import { useEffect, useMemo, useState } from "react"
import { useApp } from "@/cliente/app-contexto"
import type { FuenteForja } from "@/forja/datos/fuente"
import { PREFERENCIA_ACTIVACION, debeMostrarActivacion } from "@/forja/dominio/activacion"
import { useRedForjaApp, useSimulacionForja } from "@/forja/datos/usar-forja-app"
import { redForja, tallerForja } from "@/forja/dominio/modelo"
import { historiaMaquina, piezaDesdeTexto, recorridoProducto } from "@/forja/dominio/pieza"
import { Universo, type ActivacionUniverso } from "./universo"

/** Forja dentro de la app: datos de Yunque, simulador si la empresa es demo y enlaces a los módulos. */
export function UniversoForjaApp({ activacion, simulacion, pieza }: { activacion: boolean; simulacion: boolean; pieza: string | null }) {
  const { motor, usuario, ejecutar } = useApp()
  // La primera vez que la persona entra (o cuando la pide desde Extensiones)
  const [conActivacion] = useState<ActivacionUniverso | null>(() =>
    debeMostrarActivacion(activacion, usuario.preferencias)
      ? {
          alTerminar: () => {
            if (!usuario.preferencias[PREFERENCIA_ACTIVACION]) void ejecutar("usuario.preferencia", { clave: PREFERENCIA_ACTIVACION, valor: new Date().toISOString() }, null)
            // Sin ?activacion=1 en la dirección: recargar no la repite
            const url = new URL(window.location.href)
            if (url.searchParams.has("activacion")) {
              url.searchParams.delete("activacion")
              window.history.replaceState(window.history.state, "", url)
            }
          },
        }
      : null,
  )
  const { red, eventos, permitidas } = useRedForjaApp()
  const sim = useSimulacionForja(simulacion)
  const fuente = useMemo<FuenteForja>(
    () => ({
      red,
      redEn: (t) => redForja(motor.estado, t, permitidas),
      eventos,
      taller: (id) => (red.nodos.some((n) => n.id === id) ? tallerForja(motor.estado, id, new Date()) : null),
      pieza: (p) => {
        if (p.tipo === "producto") {
          const recorrido = recorridoProducto(motor.estado, p.id, new Date(), permitidas)
          return recorrido ? { tipo: "producto", recorrido } : null
        }
        const historia = historiaMaquina(motor.estado, p.id, permitidas)
        return historia ? { tipo: "maquina", historia } : null
      },
      simulacion: sim.activa,
      propuesta: false,
      enlaces: {
        inventario: (sucursalId, filtro) => {
          const p = new URLSearchParams(sucursalId ? { sucursal: sucursalId } : {})
          if (filtro?.rack) p.set("ubicacion", filtro.rack)
          if (filtro?.producto) p.set("producto", filtro.producto)
          if (filtro?.stock) p.set("stock", filtro.stock)
          return `/app/inventario${p.size ? `?${p}` : ""}`
        },
        servicio: (ordenId) => (ordenId ? `/app/servicio?id=${ordenId}` : "/app/servicio"),
        presupuestos: () => "/app/presupuestos",
        entregas: () => "/app/entregas",
        mostrador: () => "/app/mostrador",
      },
    }),
    [red, eventos, sim.activa, motor, permitidas],
  )
  // ?pieza=producto:… o maquina:… (el buscador ⌘K): se abre el nivel 3 y se limpia la dirección
  const piezaPedida = useMemo(() => piezaDesdeTexto(pieza), [pieza])
  useEffect(() => {
    if (!pieza) return
    const url = new URL(window.location.href)
    url.searchParams.delete("pieza")
    window.history.replaceState(window.history.state, "", url)
  }, [pieza])
  return <Universo fuente={fuente} activacion={conActivacion} pieza={piezaPedida} />
}
