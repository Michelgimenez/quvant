"use client"

import { useEffect, useId, useRef } from "react"
import gsap from "gsap"
import { cn } from "@/lib/utils"
import { Q_GEOMETRIA as G } from "./q-geometria"

/**
 * La Q se arma (manual: el aro se traza, la cola aparece y el punto salta a su lugar). Nunca rotación,
 * estiramiento ni 3D. Como solo existe el PNG (aro y cola son un solo trazado), no se vectoriza: se anima
 * con máscaras sobre el archivo original. El aro se revela con un trazo SVG, la cola con un rectángulo que
 * crece desde la unión y el punto es un recorte del mismo PNG que salta en arco.
 *
 * `progreso` (0 a 1) lo dibuja quieto en ese instante (filmación, cuadros de la lámina). Sin `progreso`,
 * se reproduce solo al montarse.
 */
const CROMADA = "/marca/quvant-q-cromada-1024.png"
const { cx, cy, radioExterior: rE, radioInterior: rI } = G.aro
const P = G.punto
// La unión de la cola con el aro: a 45°, abajo a la derecha (la cola siempre apunta ahí).
const UNION = { x: cx + rE * Math.SQRT1_2, y: cy + rE * Math.SQRT1_2 }
// El punto despega desde la punta de la cola y cae en su lugar.
const SALTO = { dx: -(P.x - UNION.x) * 0.7, dy: -(P.y - UNION.y) * 0.7, altura: P.lado * 1.4 }

type Estado = { aro: number; cola: number; punto: number }

function aplicar(raiz: SVGSVGElement, e: Estado) {
  const aro = raiz.querySelector<SVGCircleElement>("[data-aro]")
  const cola = raiz.querySelector<SVGRectElement>("[data-cola]")
  const punto = raiz.querySelector<SVGGElement>("[data-punto]")
  if (aro) aro.style.strokeDashoffset = String(1 - e.aro)
  if (cola) cola.style.transform = `translate(${UNION.x}px, ${UNION.y}px) rotate(45deg) scaleX(${Math.max(0.0001, e.cola)})`
  if (punto) {
    const u = 1 - e.punto
    const x = SALTO.dx * u
    const y = SALTO.dy * u - Math.sin(Math.PI * e.punto) * SALTO.altura
    punto.style.transform = `translate(${x}px, ${y}px)`
    punto.style.opacity = e.punto > 0 ? "1" : "0"
  }
}

/** Instantes de cada parte dentro del progreso total. */
export function estadoDeLaQ(progreso: number): Estado {
  const tramo = (a: number, b: number) => Math.min(1, Math.max(0, (progreso - a) / (b - a)))
  const suave = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
  return { aro: suave(tramo(0, 0.58)), cola: suave(tramo(0.5, 0.7)), punto: suave(tramo(0.66, 1)) }
}

export function IsotipoAnimado({
  lado = 160,
  progreso,
  duracion = 1.6,
  demora = 0.1,
  className,
  alTerminar,
}: {
  lado?: number
  progreso?: number
  duracion?: number
  demora?: number
  className?: string
  alTerminar?: () => void
}) {
  const id = useId()
  const raiz = useRef<SVGSVGElement>(null)
  const terminar = useRef(alTerminar)
  useEffect(() => {
    terminar.current = alTerminar
  })

  // Controlado: se dibuja el instante pedido.
  useEffect(() => {
    if (progreso === undefined || !raiz.current) return
    aplicar(raiz.current, estadoDeLaQ(progreso))
  }, [progreso])

  // Libre: un tween de 0 a 1 con GSAP (el único reloj de animación).
  useEffect(() => {
    if (progreso !== undefined || !raiz.current) return
    const svg = raiz.current
    const estado = { p: 0 }
    aplicar(svg, estadoDeLaQ(0))
    const tween = gsap.to(estado, {
      p: 1,
      duration: duracion,
      delay: demora,
      ease: "none",
      onUpdate: () => aplicar(svg, estadoDeLaQ(estado.p)),
      onComplete: () => terminar.current?.(),
    })
    return () => {
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se arma una vez al montarse
  }, [])

  const m = (n: string) => `${id}-${n}`
  return (
    <svg
      ref={raiz}
      viewBox={`0 0 ${G.lado} ${G.lado}`}
      width={lado}
      height={lado}
      role="img"
      aria-label="Quvant"
      className={cn("block overflow-visible", className)}
    >
      <defs>
        {/* El aro: un trazo circular por el medio de su banda, que se dibuja desde la unión con la cola */}
        <mask id={m("aro")} maskUnits="userSpaceOnUse" x="0" y="0" width={G.lado} height={G.lado}>
          <circle
            data-aro
            cx={cx}
            cy={cy}
            r={(rE + rI) / 2}
            fill="none"
            stroke="white"
            strokeWidth={rE - rI + 16}
            pathLength={1}
            strokeDasharray="1 1"
            style={{ strokeDashoffset: 1 }}
            transform={`rotate(45 ${cx} ${cy})`}
          />
        </mask>
        {/* La cola: lo que está fuera del aro, revelado por un rectángulo que crece desde la unión */}
        <mask id={m("cola")} maskUnits="userSpaceOnUse" x="0" y="0" width={G.lado} height={G.lado}>
          <rect data-cola x={0} y={-P.lado * 1.4} width={(P.x - UNION.x) * 1.6} height={P.lado * 2.8} fill="white" style={{ transform: "scaleX(0)" }} />
          <circle cx={cx} cy={cy} r={rE + 3} fill="black" />
        </mask>
        <clipPath id={m("sin-punto")}>
          <path d={`M0 0H${G.lado}V${P.y - 1}H${P.x - 1}V${G.lado}H0Z`} />
        </clipPath>
        <clipPath id={m("punto")}>
          <rect x={P.x} y={P.y} width={P.lado} height={P.lado} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${m("sin-punto")})`}>
        <image href={CROMADA} width={G.lado} height={G.lado} mask={`url(#${m("aro")})`} />
        <image href={CROMADA} width={G.lado} height={G.lado} mask={`url(#${m("cola")})`} />
      </g>
      <g data-punto style={{ opacity: 0 }}>
        <image href={CROMADA} width={G.lado} height={G.lado} clipPath={`url(#${m("punto")})`} />
      </g>
    </svg>
  )
}
