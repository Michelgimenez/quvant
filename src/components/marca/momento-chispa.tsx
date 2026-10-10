"use client"

import { useEffect, useState } from "react"
import { TRAZO_CHISPA } from "./trazos"

/**
 * Momentos chispa: la recompensa visual de Yunque.
 * Se lanzan solo en logros concretos (cola sincronizada, presupuesto convertido
 * en venta, cierre de caja, conteo sin diferencias). Duran ~1 s y desaparecen.
 *
 *   lanzarChispa({ desde: botonRef.current, mensaje: "Cola sincronizada" })
 */
type Momento = { id: number; x: number; y: number; mensaje?: string }
type Opciones = { x?: number; y?: number; desde?: Element | null; mensaje?: string }

const oyentes = new Set<(m: Momento) => void>()
let siguiente = 1

export function lanzarChispa(opciones: Opciones = {}) {
  if (typeof window === "undefined") return
  let { x, y } = opciones
  if (opciones.desde) {
    const r = opciones.desde.getBoundingClientRect()
    x = r.left + r.width / 2
    y = r.top + r.height / 2
  }
  const momento: Momento = {
    id: siguiente++,
    x: x ?? window.innerWidth / 2,
    y: y ?? Math.min(220, window.innerHeight / 3),
    mensaje: opciones.mensaje,
  }
  oyentes.forEach((o) => o(momento))
}

const RAYOS = [0, 60, 120, 180, 240, 300]

export function CapaChispas() {
  const [momentos, setMomentos] = useState<Momento[]>([])
  const [anuncio, setAnuncio] = useState("")

  useEffect(() => {
    const oyente = (m: Momento) => {
      setMomentos((prev) => [...prev, m])
      if (m.mensaje) setAnuncio(m.mensaje)
      window.setTimeout(() => setMomentos((prev) => prev.filter((p) => p.id !== m.id)), 1400)
    }
    oyentes.add(oyente)
    return () => {
      oyentes.delete(oyente)
    }
  }, [])

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {anuncio}
      </div>
      <div className="pointer-events-none fixed inset-0 z-[200]" aria-hidden>
        {momentos.map((m) => (
          <div
            key={m.id}
            className="absolute"
            style={{ left: m.x, top: m.y, transform: "translate(-50%, -50%)" }}
            data-testid="momento-chispa"
          >
            <svg viewBox="-30 -30 60 60" className="size-16 overflow-visible">
              {RAYOS.map((a) => (
                <line
                  key={a}
                  x1="0"
                  y1="-14"
                  x2="0"
                  y2="-24"
                  stroke="var(--chispa)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  pathLength={1}
                  className="chispa-rayo"
                  transform={`rotate(${a})`}
                />
              ))}
              <g className="animate-chispa" style={{ transformOrigin: "0 0" }}>
                <path d={TRAZO_CHISPA} fill="var(--chispa)" transform="translate(-72 -11) " />
              </g>
            </svg>
            {m.mensaje && (
              <div className="chispa-mensaje absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full border border-chispa/40 bg-hierro/90 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-chispa shadow-lg">
                {m.mensaje}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
