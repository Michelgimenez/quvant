"use client"

import { motion, useReducedMotion } from "motion/react"
import { useId } from "react"
import { cn } from "@/lib/utils"
import { ISOTIPO_VIEWBOX, TRAZO_CHISPA, TRAZO_YUNQUE } from "./trazos"

/**
 * "El yunque se arma con un golpe de luz y salta la chispa."
 * El trazo del isotipo se divide en tres piezas con clipPath (base, cintura y
 * cara con cuerno). Solo se anima transform, opacity y trazos SVG.
 *
 * Línea de tiempo (a velocidad 1):
 *   0,00 s  base sube
 *   0,25 s  cintura
 *   0,50 s  cara cae y golpea (0,85 s)
 *   0,85 s  golpe de luz recorre la cara
 *   1,05 s  salta la chispa + rayos
 */
export function YunqueArmado({
  className,
  activo = true,
  velocidad = 1,
  colorYunque = "var(--niebla)",
  colorChispa = "var(--chispa)",
  onFin,
}: {
  className?: string
  activo?: boolean
  velocidad?: number
  colorYunque?: string
  colorChispa?: string
  onFin?: () => void
}) {
  const reducir = useReducedMotion()
  const id = useId().replace(/:/g, "")
  const t = (s: number) => (reducir ? 0 : s / velocidad)
  const estado = activo ? "armado" : "inicial"

  const pieza = (desde: number, demora: number, dur = 0.42) => ({
    initial: { opacity: 0, y: desde },
    animate: estado === "armado" ? { opacity: 1, y: 0 } : { opacity: 0, y: desde },
    transition: { duration: t(dur), delay: t(demora), ease: [0.2, 0.9, 0.25, 1] as const },
  })

  const rayos = [
    [72, -3, 72, -9],
    [84, 11, 91, 11],
    [60, 11, 53, 11],
    [80, 3, 85, -2],
    [64, 3, 59, -2],
    [80, 19, 85, 24],
  ]

  return (
    <svg viewBox="-8 -14 116 104" className={cn("overflow-visible", className)} role="img" aria-label="Yunque">
      <defs>
        <clipPath id={`${id}-cara`}>
          <rect x="0" y="20" width="100" height="31.5" />
        </clipPath>
        <clipPath id={`${id}-cintura`}>
          <rect x="0" y="51" width="100" height="18.5" />
        </clipPath>
        <clipPath id={`${id}-base`}>
          <rect x="0" y="69" width="100" height="20" />
        </clipPath>
        <clipPath id={`${id}-silueta`}>
          <path d={TRAZO_YUNQUE} />
        </clipPath>
        <linearGradient id={`${id}-luz`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.g {...pieza(26, 0)} clipPath={`url(#${id}-base)`}>
        <path d={TRAZO_YUNQUE} fill={colorYunque} />
      </motion.g>
      <motion.g {...pieza(18, 0.25)} clipPath={`url(#${id}-cintura)`}>
        <path d={TRAZO_YUNQUE} fill={colorYunque} />
      </motion.g>
      <motion.g {...pieza(-30, 0.5, 0.35)} clipPath={`url(#${id}-cara)`}>
        <path d={TRAZO_YUNQUE} fill={colorYunque} />
      </motion.g>

      {/* Golpe de luz: una franja que cruza la silueta */}
      {!reducir && (
        <g clipPath={`url(#${id}-silueta)`}>
          <motion.rect
            x="-30"
            y="20"
            width="30"
            height="70"
            fill={`url(#${id}-luz)`}
            initial={{ x: 0, opacity: 0 }}
            animate={estado === "armado" ? { x: [0, 135], opacity: [0, 1, 0] } : { x: 0, opacity: 0 }}
            transition={{ duration: t(0.5), delay: t(0.85), ease: "easeOut" }}
          />
        </g>
      )}

      {/* Rayos de la chispa (trazos SVG) */}
      {!reducir &&
        rayos.map(([x1, y1, x2, y2], i) => (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={colorChispa}
            strokeWidth="1.6"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              estado === "armado" ? { pathLength: [0, 1, 1], opacity: [0, 1, 0] } : { pathLength: 0, opacity: 0 }
            }
            transition={{ duration: t(0.55), delay: t(1.05 + i * 0.02), ease: "easeOut" }}
          />
        ))}

      <motion.path
        d={TRAZO_CHISPA}
        fill={colorChispa}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={{ opacity: 0, scale: 0.2, rotate: -60 }}
        animate={
          estado === "armado"
            ? { opacity: 1, scale: [0.2, 1.35, 1], rotate: [-60, 10, 0] }
            : { opacity: 0, scale: 0.2, rotate: -60 }
        }
        transition={{ duration: t(0.55), delay: t(1.05), ease: [0.2, 0.9, 0.25, 1] }}
        onAnimationComplete={() => {
          if (estado === "armado") onFin?.()
        }}
      />
    </svg>
  )
}

/** Isotipo estático con el mismo viewBox que YunqueArmado (para reemplazarlo sin saltos). */
export function YunqueQuieto({
  className,
  colorYunque = "var(--niebla)",
  colorChispa = "var(--chispa)",
}: {
  className?: string
  colorYunque?: string
  colorChispa?: string
}) {
  return (
    <svg viewBox="-8 -14 116 104" className={cn("overflow-visible", className)} role="img" aria-label="Yunque">
      <path d={TRAZO_YUNQUE} fill={colorYunque} />
      <path d={TRAZO_CHISPA} fill={colorChispa} />
    </svg>
  )
}

export { ISOTIPO_VIEWBOX }
