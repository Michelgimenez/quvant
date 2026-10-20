"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Firma } from "@/components/marca/quvant"
import type { IdEmpresa, ModuloDemo } from "@/demo/empresas"
import { ESPERA_CAMBIO, PASOS_RECORRIDO, inicioDePasos } from "@/demo/recorrido"
import { cn } from "@/lib/utils"

/** El panel del recorrido guiado (los pasos y sus tiempos, en src/demo/recorrido.ts). */
export function Recorrido({
  empresaActual,
  onCambiarEmpresa,
  onModulo,
  onSalir,
  filmando = false,
}: {
  empresaActual: IdEmpresa
  onCambiarEmpresa: (id: IdEmpresa) => void
  onModulo: (m: ModuloDemo) => void
  onSalir: () => void
  filmando?: boolean
}) {
  const [paso, setPaso] = useState(0)
  const [pausado, setPausado] = useState(false)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const barra = useRef<HTMLSpanElement>(null)
  const empresaInicial = useRef(empresaActual)
  const callbacks = useRef({ onCambiarEmpresa, onModulo, onSalir })
  useEffect(() => {
    callbacks.current = { onCambiarEmpresa, onModulo, onSalir }
  })

  useEffect(() => {
    const tiempos = inicioDePasos(PASOS_RECORRIDO, empresaInicial.current)
    const linea = gsap.timeline({ onComplete: () => !filmando && callbacks.current.onSalir() })
    PASOS_RECORRIDO.forEach((p, i) => {
      const { inicio, cambia, contenido } = tiempos[i]
      linea.addLabel(`paso-${i}`, inicio)
      linea.add(() => setPaso(i), inicio)
      if (cambia && p.empresa) linea.add(() => callbacks.current.onCambiarEmpresa(p.empresa!), inicio)
      if (p.modulo) linea.add(() => callbacks.current.onModulo(p.modulo!), contenido)
      for (const a of p.acciones ?? []) linea.add(() => (document.querySelector(`[data-testid="${a.testid}"]`) as HTMLElement | null)?.click(), contenido + a.en)
      // La barrita de avance del paso (scaleX: solo transform).
      linea.fromTo(barra.current, { scaleX: 0 }, { scaleX: 1, duration: p.duracion + (cambia ? ESPERA_CAMBIO : 0), ease: "none", immediateRender: false }, inicio)
    })
    tl.current = linea
    return () => {
      linea.kill()
    }
  }, [filmando])

  const ir = useCallback((i: number) => {
    const linea = tl.current
    if (!linea) return
    const destino = Math.max(0, Math.min(PASOS_RECORRIDO.length - 1, i))
    const p = PASOS_RECORRIDO[destino]
    setPaso(destino)
    if (p.empresa) callbacks.current.onCambiarEmpresa(p.empresa)
    if (p.modulo) setTimeout(() => callbacks.current.onModulo(p.modulo!), p.empresa ? ESPERA_CAMBIO * 1000 : 0)
    linea.seek(`paso-${destino}`, true)
  }, [])

  useEffect(() => {
    if (filmando) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault()
        setPausado((v) => {
          if (v) tl.current?.play()
          else tl.current?.pause()
          return !v
        })
      } else if (e.key === "ArrowRight") ir(paso + 1)
      else if (e.key === "ArrowLeft") ir(paso - 1)
      else if (e.key === "Escape") callbacks.current.onSalir()
    }
    window.addEventListener("keydown", alTeclear)
    return () => window.removeEventListener("keydown", alTeclear)
  }, [ir, paso, filmando])

  const actual = PASOS_RECORRIDO[paso]
  const esFinal = actual.empresa === null
  return (
    <>
      {esFinal && (
        <div className="dark pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-negro/95" data-recorrido-final>
          <Firma alto={64} version="principal" bajada />
        </div>
      )}
      <div className="dark fixed bottom-6 left-[264px] z-[75] w-[500px] border border-gris-4 bg-negro/95 text-blanco shadow-2xl" role="region" aria-label="Recorrido guiado" aria-live="polite" data-recorrido>
        <span className="block h-[2px] w-full bg-gris-3">
          <span ref={barra} className="block h-full w-full origin-left bg-blanco" style={{ transform: "scaleX(0)" }} />
        </span>
        <div className="space-y-3 p-4">
          <p className="t-etiqueta flex items-center justify-between text-acero">
            <span>Recorrido guiado · {paso + 1} / {PASOS_RECORRIDO.length}</span>
            {!filmando && <span className="text-gris-7">Espacio · ← → · Esc</span>}
          </p>
          <p className="t-titulo-sm text-blanco">{actual.texto}</p>
          {!filmando && (
            <div className="flex items-center gap-1">
              <Button size="icon-sm" variant="ghost" onClick={() => ir(paso - 1)} aria-label="Paso anterior">
                <ChevronLeft />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  if (pausado) tl.current?.play()
                  else tl.current?.pause()
                  setPausado(!pausado)
                }}
                aria-label={pausado ? "Seguir" : "Pausar"}
              >
                {pausado ? <Play /> : <Pause />}
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => ir(paso + 1)} aria-label="Paso siguiente">
                <ChevronRight />
              </Button>
              <span className="flex flex-1 justify-center gap-1" aria-hidden>
                {PASOS_RECORRIDO.map((_, i) => (
                  <span key={i} className={cn("size-[5px]", i === paso ? "bg-blanco" : i < paso ? "bg-gris-7" : "bg-gris-4")} />
                ))}
              </span>
              <Button size="sm" variant="ghost" onClick={() => callbacks.current.onSalir()}>
                <X /> Salir
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
