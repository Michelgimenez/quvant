"use client"

import { useCallback, useState } from "react"
import gsap from "gsap"
import { FORMATO_DE, type IdVideo } from "@/demo/peliculas"
import { DemoQuvant } from "./demo-quvant"

/** Cómo entra la demo en cada formato: se dibuja a un tamaño de pantalla real y se escala al cuadro. */
const MEDIDAS = {
  // 1600 × 900 agrandado a 1920 × 1080: la interfaz se lee mejor que a tamaño de escritorio.
  horizontal: { ancho: 1920, alto: 1080, app: { ancho: 1600, alto: 900, escala: 1.2, arriba: 0 } },
  // Vertical: la app ocupa el centro; arriba quedan libres 250 px y abajo 420 px (zonas seguras de Instagram y WhatsApp).
  vertical: { ancho: 1080, alto: 1920, app: { ancho: 1440, alto: 1200, escala: 0.75, arriba: 260 } },
} as const

/**
 * El escenario de un video: la demo real, escalada al cuadro, y la capa de las pantallas y los subtítulos.
 * Con `filmando` (?film=1) expone window.__ready, window.__duration y window.__seek(t): el reloj global de GSAP
 * se pausa y lo mueve quien filma, siempre hacia adelante (corren los callbacks y lo que se crea en el camino).
 */
export function VideoQuvant({ video, filmando }: { video: IdVideo; filmando: boolean }) {
  const m = MEDIDAS[FORMATO_DE[video]]
  // La capa de las pantallas y los subtítulos (una ref con estado: la película la necesita para su portal).
  const [capa, setCapa] = useState<HTMLDivElement | null>(null)
  // Se pausa antes de que exista cualquier línea de tiempo (los efectos de los hijos corren antes que los del padre).
  useState(() => {
    if (filmando && typeof window !== "undefined") gsap.globalTimeline.pause()
  })
  const alListo = useCallback(
    (tl: gsap.core.Timeline) => {
      const w = window as unknown as { __ready?: boolean; __duration?: number; __seek?: (t: number) => void; __gsap?: typeof gsap }
      w.__duration = tl.duration()
      w.__gsap = gsap
      if (!filmando) return
      w.__seek = (t: number) => {
        gsap.globalTimeline.pause()
        gsap.globalTimeline.totalTime(tl.startTime() + t)
      }
      void document.fonts.ready.then(() => (w.__ready = true))
    },
    [filmando],
  )
  return (
    <div className="dark fixed left-0 top-0 overflow-hidden bg-negro text-blanco" style={{ width: m.ancho, height: m.alto }} data-video={video}>
      {/* Al filmar, nada se mueve fuera del reloj de GSAP: las animaciones y transiciones de CSS quedan quietas. */}
      {filmando && <style>{`*,*::before,*::after{animation-play-state:paused!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important}`}</style>}
      <div className="grilla-puntos absolute inset-0" style={{ "--grilla-paso": "40px" } as React.CSSProperties} aria-hidden />
      <div className="absolute left-0 origin-top-left" style={{ top: m.app.arriba, width: m.app.ancho, height: m.app.alto, transform: `scale(${m.app.escala})` }}>
        <DemoQuvant empresaInicial="kiosco" filmando={filmando} pelicula={video} capaVideo={capa} alListo={alListo} />
      </div>
      <div ref={setCapa} className="pointer-events-none absolute inset-0 z-50" data-capas-video />
    </div>
  )
}
