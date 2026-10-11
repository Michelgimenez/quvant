"use client"

import { useEffect, useRef } from "react"
import { colorCalor, nombreCalor } from "@/forja/dominio/calor"
import type { NodoForja } from "@/forja/dominio/modelo"
import { cn } from "@/lib/utils"

/**
 * Nodo-forja en el DOM: núcleo con el color del calor, anillo de stock crítico
 * (porción ámbar), pulso por cada venta, nombre y sello DEMO. Es un botón:
 * se recorre con Tab, se resalta con el foco (contorno --temple) y Enter entra.
 */
export function NodoRed({
  indice,
  nodo,
  radio,
  ultimaVenta,
  resaltado,
  refElemento,
  onResaltar,
  onEntrar,
}: {
  /** Orden en la red: marca el turno en el encendido escalonado. */
  indice: number
  nodo: NodoForja
  radio: number
  ultimaVenta: string | undefined
  resaltado: boolean
  refElemento: (el: HTMLElement | null) => void
  onResaltar: (si: boolean) => void
  onEntrar: () => void
}) {
  const pulso = useRef<HTMLSpanElement>(null)
  const color = colorCalor(nodo.calor)
  const criticos = nodo.stockCritico + nodo.sinStock
  const porcion = nodo.productosConMinimo ? criticos / nodo.productosConMinimo : 0
  const anillo = radio + 7
  const circ = 2 * Math.PI * anillo

  // Pulso por venta nueva (solo transform y opacity); la del montaje no cuenta
  const primera = useRef(ultimaVenta)
  useEffect(() => {
    if (ultimaVenta === primera.current) return
    if (!ultimaVenta || !pulso.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    pulso.current.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0.9 },
        { transform: "translate(-50%, -50%) scale(2.6)", opacity: 0 },
      ],
      { duration: 1300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    )
  }, [ultimaVenta])

  const descripcion = `${nodo.nombre}${nodo.demo ? " (sucursal de demostración)" : ""}: calor ${nombreCalor(nodo.calor)}, ${nodo.ventasHoy} ventas hoy, ${criticos} productos en stock crítico o sin stock.`

  return (
    <li ref={refElemento} className="absolute left-0 top-0 will-change-transform" style={{ transform: "translate3d(-200px, -200px, 0)", ["--i" as string]: indice }} data-testid="nodo-forja" data-nodo={nodo.codigo}>
      <button
        type="button"
        className={cn("pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none", resaltado && "ring-1 ring-temple ring-offset-2 ring-offset-transparent")}
        style={{ width: anillo * 2 + 6, height: anillo * 2 + 6 }}
        aria-label={descripcion}
        onMouseEnter={() => onResaltar(true)}
        onMouseLeave={() => onResaltar(false)}
        onFocus={() => onResaltar(true)}
        onBlur={() => onResaltar(false)}
        onClick={onEntrar}
      >
        <svg viewBox={`0 0 ${anillo * 2 + 6} ${anillo * 2 + 6}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <circle cx={anillo + 3} cy={anillo + 3} r={anillo} fill="none" stroke="rgb(238 241 244 / 0.16)" strokeWidth={1} />
          {porcion > 0 && (
            <circle
              cx={anillo + 3}
              cy={anillo + 3}
              r={anillo}
              fill="none"
              stroke="var(--chispa)"
              strokeWidth={2}
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(2, porcion * circ)} ${circ}`}
              transform={`rotate(-90 ${anillo + 3} ${anillo + 3})`}
            />
          )}
          <circle cx={anillo + 3} cy={anillo + 3} r={radio * 0.55} fill={color} />
          <circle cx={anillo + 3} cy={anillo + 3} r={radio * 0.55} fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth={0.75} />
        </svg>
        <span ref={pulso} className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border opacity-0" style={{ width: radio * 1.4, height: radio * 1.4, borderColor: color }} aria-hidden />
      </button>
      <span className="pointer-events-none absolute left-0 top-0 flex -translate-x-1/2 flex-col items-center whitespace-nowrap" style={{ transform: `translate(-50%, ${anillo + 10}px)` }} aria-hidden>
        {/* Nombres largos en dos renglones: que no se corten contra el borde */}
        <span className="w-max max-w-[9rem] whitespace-normal text-balance text-center font-heading text-[13px] font-bold leading-tight tracking-tight text-niebla [text-shadow:0_1px_8px_rgb(0_0_0/0.9)]">{nodo.nombre}</span>
        <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-acero">
          {nodo.codigo}
          {nodo.tipo === "deposito" && <span>· depósito</span>}
          {nodo.demo && <span className="rounded-[3px] border border-dashed border-chispa/80 px-1 text-[9px] font-bold text-chispa">DEMO</span>}
        </span>
      </span>
    </li>
  )
}
