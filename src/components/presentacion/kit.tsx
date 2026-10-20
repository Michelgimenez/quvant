"use client"

import { useLayoutEffect, useRef } from "react"
import gsap from "gsap"
import { Firma } from "@/components/marca/quvant"
import { cn } from "@/lib/utils"
import { useEscena } from "./motor"

/** La curva de entrada de las presentaciones: calma, sin rebote. */
export const CURVA = "power3.out"

/**
 * Una entrada con GSAP (el único reloj de animación): cuando `activo` pasa a true, el elemento va de `desde` a su
 * lugar; cuando vuelve a false, queda en `desde`. Con movimiento reducido, aparece sin moverse.
 */
export function useEntrada<T extends Element>(desde: gsap.TweenVars, { activo = true, demora = 0, duracion = 0.7, ease = CURVA }: { activo?: boolean; demora?: number; duracion?: number; ease?: string } = {}) {
  const ref = useRef<T>(null)
  const { velocidad, reducir } = useEscena()
  const clave = JSON.stringify(desde)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const origen = JSON.parse(clave) as gsap.TweenVars
    if (!activo) {
      gsap.set(el, origen)
      return
    }
    const destino: gsap.TweenVars = {}
    for (const k of Object.keys(origen)) destino[k] = k === "opacity" || k === "scale" || k === "scaleX" || k === "scaleY" ? 1 : 0
    if (reducir) {
      gsap.set(el, destino)
      return
    }
    const t = gsap.fromTo(el, origen, { ...destino, duration: duracion / velocidad, delay: demora / velocidad, ease })
    return () => {
      t.kill()
    }
  }, [activo, clave, demora, duracion, ease, velocidad, reducir])
  return ref
}

/** Fondo y marco de una escena de 1920×1080: negro, con la grilla de puntos de la marca. */
export function Lienzo({
  numero,
  etiqueta,
  children,
  className,
  sinMarca = false,
  marca,
}: {
  numero?: string
  etiqueta?: string
  children: React.ReactNode
  className?: string
  sinMarca?: boolean
  /** Reemplaza el logo de Quvant arriba a la derecha (p. ej. marca del cliente + sello). */
  marca?: React.ReactNode
}) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-negro", className)}>
      <div className="grilla-puntos pointer-events-none absolute inset-0" style={{ "--grilla-paso": "40px" } as React.CSSProperties} aria-hidden />
      {(numero || etiqueta) && (
        <div className="absolute left-[140px] top-[80px] font-sans text-[20px] font-medium uppercase tracking-[0.2em] text-acero">
          {numero && <span className="text-blanco">{numero}</span>}
          {numero && etiqueta && " · "}
          {etiqueta}
        </div>
      )}
      {!sinMarca && <div className="absolute right-[140px] top-[74px] text-blanco/70">{marca ?? <Firma alto={34} version="principal" />}</div>}
      <div className="absolute inset-0 px-[140px] pb-[110px] pt-[170px]">{children}</div>
    </div>
  )
}

/** Entra con opacidad y desplazamiento cuando la escena se activa (GSAP). */
export function Aparecer({
  demora = 0,
  y = 28,
  x = 0,
  escala,
  className,
  children,
  duracion = 0.7,
}: {
  demora?: number
  y?: number
  x?: number
  escala?: number
  className?: string
  children: React.ReactNode
  duracion?: number
}) {
  const { activa } = useEscena()
  const ref = useEntrada<HTMLDivElement>({ opacity: 0, x, y, scale: escala ?? 1 }, { activo: activa, demora, duracion })
  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  )
}

/** Trazo SVG que se dibuja al activarse la escena (GSAP sobre stroke-dashoffset). */
export function TrazoAnimado({ d, demora = 0, duracion = 1.2, className, ...resto }: { d: string; demora?: number; duracion?: number; className?: string } & React.SVGProps<SVGPathElement>) {
  const { activa } = useEscena()
  const ref = useEntrada<SVGPathElement>({ strokeDashoffset: 1, opacity: 0 }, { activo: activa, demora, duracion, ease: "power2.inOut" })
  return <path ref={ref} d={d} className={className} pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: 1, opacity: 0 }} {...resto} />
}

export function Titulo({ children, className }: { children: React.ReactNode; className?: string }) {
  // El interlineado va al final: un tamaño de texto en className no lo pisa.
  return <h2 className={cn("text-balance font-sans text-[84px] font-bold tracking-[-0.03em] text-blanco", className, "leading-[1.05]")}>{children}</h2>
}

export function Bajada({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("max-w-[1200px] font-sans text-[32px] leading-snug text-acero", className)}>{children}</p>
}

/** Marco sobrio para mostrar pantallas dentro del escenario: tres cuadrados y la ruta. */
export function Pantalla({ children, className, url = "quvant" }: { children: React.ReactNode; className?: string; url?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[6px] border border-gris-3 bg-superficie-1", className)}>
      <div className="flex items-center gap-3 border-b border-gris-3 px-4 py-3" aria-hidden>
        <span className="flex gap-1.5">
          <span className="size-[8px] bg-gris-5" />
          <span className="size-[8px] bg-gris-5" />
          <span className="size-[8px] bg-gris-5" />
        </span>
        <span className="font-sans text-[13px] uppercase tracking-[0.2em] text-gris-7">{url}</span>
      </div>
      <div className="sin-scrollbar relative overflow-hidden">{children}</div>
    </div>
  )
}
