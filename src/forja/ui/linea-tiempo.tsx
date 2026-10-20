"use client"

import { useContext, useEffect, useMemo } from "react"
import { Pause, Play, RotateCcw, X } from "lucide-react"
import type { EventoForja } from "@/forja/dominio/modelo"
import { VELOCIDADES, avanzar, densidadVentas } from "@/forja/dominio/repeticion"
import { cn } from "@/lib/utils"
import { hora } from "./formato"
import { ContextoEscena, useEscenaForja } from "./store"

type Tramo = { inicio: number; fin: number }

/**
 * Motor de la repetición: mueve el cursor cuadro a cuadro (lo lee el mapa) y
 * avisa a React unas 8 veces por segundo (contadores, barra, red recalculada).
 * Al alcanzar el presente, vuelve solo a "en vivo".
 */
export function useMotorRepeticion(tramo: Tramo) {
  const store = useContext(ContextoEscena)!
  const activa = useEscenaForja((s) => s.repeticion.activa)
  const reproduciendo = useEscenaForja((s) => s.repeticion.reproduciendo)
  useEffect(() => {
    if (!activa || !reproduciendo) return
    let marco = 0
    let previo = performance.now()
    let ultimoAviso = 0
    const paso = (t: number) => {
      const st = store.getState()
      const cursor = avanzar(st.reloj.t ?? tramo.inicio, document.hidden ? 0 : t - previo, st.repeticion.velocidad, tramo.fin)
      previo = t
      st.reloj.t = cursor
      if (cursor >= tramo.fin) {
        st.salirDeRepeticion()
        return
      }
      if (t - ultimoAviso > 120) {
        ultimoAviso = t
        st.setRepeticion({ cursor })
      }
      marco = requestAnimationFrame(paso)
    }
    marco = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(marco)
  }, [activa, reproduciendo, store, tramo.inicio, tramo.fin])
}

/** Barra inferior para reproducir el día: los eventos se vuelven a animar en orden, a 1×, 60×, 600× o 1200×. */
export function LineaTiempo({ eventos, tramo }: { eventos: EventoForja[]; tramo: Tramo }) {
  const store = useContext(ContextoEscena)!
  const rep = useEscenaForja((s) => s.repeticion)
  const repetir = useEscenaForja((s) => s.repetir)
  const setRepeticion = useEscenaForja((s) => s.setRepeticion)
  const salir = useEscenaForja((s) => s.salirDeRepeticion)
  const densidad = useMemo(() => densidadVentas(eventos, tramo), [eventos, tramo])
  const cursor = rep.activa ? Math.min(rep.cursor, tramo.fin) : tramo.fin
  const avance = (cursor - tramo.inicio) / (tramo.fin - tramo.inicio)
  const horas = useMemo(() => {
    const lista: number[] = []
    const h = 3_600_000
    for (let t = Math.ceil(tramo.inicio / (2 * h)) * 2 * h; t < tramo.fin; t += 2 * h) lista.push(t)
    return lista
  }, [tramo])

  const mover = (t: number) => {
    const st = store.getState()
    if (!st.repeticion.activa) {
      repetir(t)
      setRepeticion({ reproduciendo: false })
      return
    }
    st.reloj.t = t
    setRepeticion({ cursor: t })
  }
  const alternar = () => {
    if (!rep.activa) repetir(tramo.inicio)
    else setRepeticion({ reproduciendo: !rep.reproduciendo })
  }
  const etiquetaBoton = !rep.activa ? "Repetir el día" : rep.reproduciendo ? "Pausar la repetición" : "Seguir la repetición"

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 border-t border-white/10 bg-negro/85 px-3 py-2 backdrop-blur sm:gap-3"
      role="group"
      aria-label="Línea de tiempo del día"
      data-testid="linea-tiempo"
      data-modo={rep.activa ? "repeticion" : "vivo"}
    >
      <button
        type="button"
        onClick={alternar}
        className="grid size-8 shrink-0 place-items-center rounded-md border border-white/15 text-blanco hover:border-white/30 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground"
        aria-label={etiquetaBoton}
        title={etiquetaBoton}
        data-testid="repetir"
      >
        {rep.activa && rep.reproduciendo ? <Pause className="size-4" /> : rep.activa ? <Play className="size-4" /> : <RotateCcw className="size-4" />}
      </button>
      <div className="flex shrink-0 rounded-md border border-white/10 p-0.5" role="group" aria-label="Velocidad de la repetición">
        {VELOCIDADES.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={rep.velocidad === v}
            onClick={() => setRepeticion({ velocidad: v })}
            className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] sm:px-2 sm:text-[11px]", rep.velocidad === v ? "bg-white/12 text-blanco" : "text-acero hover:text-blanco")}
            data-testid={`velocidad-${v}`}
          >
            {v}×
          </button>
        ))}
      </div>
      <div className="relative h-9 min-w-0 flex-1 overflow-hidden rounded-md has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-foreground">
        {/* El pulso del día: ventas por franja; lo ya reproducido, en brasa */}
        <svg viewBox={`0 0 ${densidad.length} 1`} preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-6 w-full" aria-hidden>
          {densidad.map((d, i) => (
            <rect key={i} x={i + 0.15} width={0.7} y={1 - Math.max(0.04, d)} height={Math.max(0.04, d)} fill={(i + 0.5) / densidad.length <= avance ? "#ff6a1f" : "#3a4450"} opacity={(i + 0.5) / densidad.length <= avance ? 0.85 : 0.7} />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full" style={{ transform: `translateX(${avance * 100}%)` }} aria-hidden>
          <span className="absolute -left-px top-0 h-6 w-0.5 rounded-full bg-blanco-caliente shadow-[0_0_8px_rgb(255_244_224/0.8)]" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 max-sm:hidden" aria-hidden>
          {horas.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 font-mono text-[9px] leading-none text-acero/70" style={{ left: `${((t - tramo.inicio) / (tramo.fin - tramo.inicio)) * 100}%` }}>
              {hora(new Date(t).toISOString())}
            </span>
          ))}
        </div>
        <input
          type="range"
          min={tramo.inicio}
          max={tramo.fin}
          step={60_000}
          value={cursor}
          onChange={(e) => mover(Number(e.target.value))}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label="Hora del día"
          aria-valuetext={hora(new Date(cursor).toISOString())}
          data-testid="cursor-dia"
        />
      </div>
      <span className="min-w-12 shrink-0 whitespace-nowrap text-right font-mono text-xs text-blanco" data-testid="hora-repeticion" aria-live="off">
        {rep.activa ? hora(new Date(cursor).toISOString()) : "En vivo"}
      </span>
      {rep.activa && (
        <button type="button" onClick={salir} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] text-blanco hover:border-white/30 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground" data-testid="volver-en-vivo">
          <X className="size-3.5" aria-hidden />
          <span className="max-sm:sr-only">En vivo</span>
        </button>
      )}
    </div>
  )
}
