"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/** Toma genérica de Forja (empresa de demostración, sin datos de ningún prospecto). */
export const VIDEO_FORJA = { mp4: "/demo/forja.mp4", poster: "/demo/forja-poster.jpg" }

/**
 * Video de Forja. En el sitio corre en bucle y sin sonido; en una escena de la
 * presentación arranca cuando la escena se activa. Con movimiento reducido no
 * arranca solo: queda el póster con los controles.
 */
export function VideoForja({ className, activo, reinicio = 0, etiqueta }: { className?: string; activo?: boolean; reinicio?: number; etiqueta: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const [reducir] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  const enEscena = activo !== undefined

  useEffect(() => {
    const v = video.current
    if (!v || reducir) return
    if (!enEscena || activo) {
      if (enEscena) v.currentTime = 0
      void v.play().catch(() => {})
    } else v.pause()
  }, [activo, reinicio, enEscena, reducir])

  return (
    <video
      ref={video}
      className={cn("aspect-video w-full rounded-2xl border border-white/10 bg-hierro object-cover", className)}
      src={VIDEO_FORJA.mp4}
      poster={VIDEO_FORJA.poster}
      muted
      loop={!enEscena}
      playsInline
      preload={enEscena ? "auto" : "metadata"}
      controls={reducir}
      aria-label={etiqueta}
      data-testid="video-forja"
    />
  )
}
