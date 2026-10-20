"use client"

import { useEffect, useState } from "react"
import { formatoPesosCorto } from "@/dominio/dinero"
import { NOMBRE_ESTADO_SERVICIO } from "@/dominio/servicio"
import type { EstadoServicio } from "@/dominio/tipos"
import { colorCalor, nombreCalor } from "@/forja/dominio/calor"
import type { NodoForja } from "@/forja/dominio/modelo"

/** Tarjeta al pasar el cursor (o con el foco) por un nodo: el día de la sucursal en números. */
export function TarjetaNodo({ nodo, elemento: buscarElemento, contenedor: buscarContenedor }: { nodo: NodoForja; elemento: () => HTMLElement | null; contenedor: () => HTMLElement | null }) {
  const [pos, setPos] = useState<{ x: number; y: number; ancho: number; alto: number } | null>(null)
  useEffect(() => {
    let marco = 0
    const seguir = () => {
      const elemento = buscarElemento()
      const contenedor = buscarContenedor()
      if (elemento && contenedor) {
        const r = elemento.getBoundingClientRect()
        const c = contenedor.getBoundingClientRect()
        setPos({ x: r.left - c.left, y: r.top - c.top, ancho: c.width, alto: c.height })
      }
      marco = requestAnimationFrame(seguir)
    }
    seguir()
    return () => cancelAnimationFrame(marco)
  }, [buscarElemento, buscarContenedor])
  if (!pos) return null
  const ordenes = Object.entries(nodo.ordenes) as [EstadoServicio, number][]
  const { ancho, alto } = pos
  const izquierda = pos.x + 36 + 280 > ancho ? pos.x - 36 - 280 : pos.x + 36
  // La tarjeta mide unos 270 px: nunca se corta abajo
  const arriba = Math.min(Math.max(12, pos.y - 70), Math.max(12, alto - 290))
  return (
    <div className="pointer-events-none absolute z-20 w-[280px] rounded-xl border border-white/10 bg-negro/92 p-4 shadow-2xl backdrop-blur" style={{ left: izquierda, top: arriba }} role="tooltip" data-testid="tarjeta-nodo">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: colorCalor(nodo.calor) }} aria-hidden />
        <p className="font-heading font-extrabold">{nodo.nombre}</p>
        {nodo.demo && <span className="rounded-[3px] border border-dashed border-alerta/80 px-1 font-mono text-[9px] font-bold text-alerta">DEMO</span>}
      </div>
      <p className="mt-0.5 font-mono text-[11px] text-acero">
        {nombreCalor(nodo.calor)} · {nodo.ventasUltimaHora} ventas en la última hora
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 font-mono text-[11px]">
        <div>
          <dt className="text-acero">Ventas de hoy</dt>
          <dd className="text-[13px] text-blanco">
            {nodo.ventasHoy} · {formatoPesosCorto(nodo.importeHoy)}
          </dd>
        </div>
        <div>
          <dt className="text-acero">Presupuestos abiertos</dt>
          <dd className="text-[13px] text-blanco">{nodo.presupuestosAbiertos}</dd>
        </div>
        <div>
          <dt className="text-acero">Stock crítico</dt>
          <dd className="text-[13px] text-blanco">
            {nodo.stockCritico} <span className="text-acero">· {nodo.sinStock} sin stock</span>
          </dd>
        </div>
        <div>
          <dt className="text-acero">Sin sincronizar</dt>
          <dd className="text-[13px] text-blanco">{nodo.colaSinConexion}</dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-white/10 pt-2.5">
        <p className="font-mono text-[11px] text-acero">Servicio técnico</p>
        {ordenes.length ? (
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-blanco">
            {ordenes.map(([estado, n]) => (
              <li key={estado}>
                <span className="font-mono">{n}</span> {NOMBRE_ESTADO_SERVICIO[estado].toLowerCase()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[12px] text-acero">Sin equipos en el taller</p>
        )}
      </div>
    </div>
  )
}
