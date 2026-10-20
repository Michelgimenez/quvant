"use client"

import { useMemo } from "react"
import { formatoPesos } from "@/dominio/dinero"
import type { DatosNegocio, MedioPago } from "@/dominio/negocio"
import type { IdEmpresa } from "@/demo/empresas"
import type { EventoDemo } from "@/demo/simulador"
import { resumenComercio, resumenDistribuidora, resumenGrupo, resumenKiosco } from "@/demo/resumen"
import { SelloSimulacion, type Densidad } from "@/components/negocio/piezas"
import { cn } from "@/lib/utils"
import { fechaLarga, hace, horaCorta, useAhoraDemo, useDatosEmpresa, useDemo } from "../contexto"

/** El resumen vivo de una empresa: se recalcula cada segundo con el reloj de la demo. */
export function useResumen<I extends IdEmpresa>(id: I) {
  const datos = useDatosEmpresa(id)
  const acciones = useDemo((s) => s.porEmpresa[id])
  const ahora = useAhoraDemo()
  const segundo = Math.floor(ahora / 1000) * 1000
  const resumen = useMemo(() => {
    if (id === "kiosco") return resumenKiosco(datos, acciones, segundo)
    if (id === "ferreteria") return resumenComercio(datos, acciones, segundo)
    if (id === "distribuidora") return resumenDistribuidora(datos, acciones, segundo)
    return resumenGrupo(datos, acciones, segundo)
  }, [id, datos, acciones, segundo])
  return { datos, acciones, ahora: segundo, resumen } as {
    datos: DatosNegocio
    acciones: typeof acciones
    ahora: number
    resumen: I extends "kiosco" ? ReturnType<typeof resumenKiosco> : I extends "ferreteria" ? ReturnType<typeof resumenComercio> : I extends "distribuidora" ? ReturnType<typeof resumenDistribuidora> : ReturnType<typeof resumenGrupo>
  }
}

export function EncabezadoTablero({ saludo, detalle, ahora, acciones, densidad }: { saludo: string; detalle: string; ahora: number; acciones?: React.ReactNode; densidad: Densidad }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", densidad === "amplia" ? "mb-6" : densidad === "media" ? "mb-5" : "mb-4")} data-flip-id="encabezado-tablero">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="t-etiqueta text-muted-foreground">{fechaLarga(ahora)}</p>
          <SelloSimulacion />
        </div>
        <h1 className="t-titulo">{saludo}</h1>
        <p className="t-texto-sm text-muted-foreground">{detalle}</p>
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  )
}

const NOMBRE_MEDIO: Record<MedioPago, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia", qr: "QR", cuenta: "Cuenta" }

/** Lo último que pasó (simulación), con su hora y su monto. */
export function ListaEventos({ eventos, ahora, densidad = "media", max = 6, vacio = "Todavía no pasó nada" }: { eventos: EventoDemo[]; ahora: number; densidad?: Densidad; max?: number; vacio?: string }) {
  const lista = eventos.slice(0, max)
  if (!lista.length) return <p className="t-texto-sm py-4 text-muted-foreground">{vacio}</p>
  return (
    <ul className="divide-y divide-linea" aria-live="off">
      {lista.map((e) => (
        <li key={e.id} className={cn("flex items-center gap-3", densidad === "amplia" ? "py-3" : densidad === "media" ? "py-2.5" : "py-1.5")}>
          <span className="t-dato w-12 shrink-0 text-muted-foreground" title={hace(e.t, ahora)}>
            {horaCorta(e.t)}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate", densidad === "amplia" ? "t-texto" : "t-texto-sm")}>{e.detalle}</span>
            <span className="t-etiqueta block truncate text-muted-foreground">
              {e.quien}
              {e.medio ? ` · ${NOMBRE_MEDIO[e.medio]}` : ""}
            </span>
          </span>
          {e.monto > 0 && <span className={cn("shrink-0 whitespace-nowrap", densidad === "amplia" ? "t-numero" : "t-dato font-semibold")}>{formatoPesos(e.monto, { sinDecimales: true })}</span>}
        </li>
      ))}
    </ul>
  )
}

/** Barras de las ventas de hoy por hora, la hora en curso en el color de la empresa. */
export function HorasDelDia({ porHora, ahora, desde = 7, hasta = 23, alto = 72 }: { porHora: number[]; ahora: number; desde?: number; hasta?: number; alto?: number }) {
  const horaActual = new Date(ahora - 3 * 3600000).getUTCHours()
  const tramo = porHora.slice(desde, hasta)
  const max = Math.max(1, ...tramo)
  return (
    <div className="flex items-end gap-[3px]" style={{ height: alto }} aria-label="Ventas de hoy por hora" role="img">
      {tramo.map((v, i) => {
        const h = desde + i
        return (
          <span key={h} className="relative flex flex-1 flex-col items-center justify-end" style={{ height: alto }}>
            <span className={cn("w-full", h === horaActual ? "bg-[var(--serie-1)]" : h < horaActual ? "bg-gris-8" : "bg-gris-3")} style={{ height: Math.max(2, (v / max) * (alto - 16)) }} />
            {h % 3 === 0 && <span className="t-dato absolute -bottom-0.5 translate-y-full text-muted-foreground">{h}</span>}
          </span>
        )
      })}
    </div>
  )
}
