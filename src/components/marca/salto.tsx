"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import gsap from "gsap"
import { arcoDeSalto, fasesDelSalto, largoRecorrido, puntoEnArco, trazoDeArco } from "./salto-geometria"

/**
 * El salto como recompensa (EXTENSIÓN DEL PROMPT, reemplaza a la chispa de Quvant).
 * Un salto breve del punto cuadrado cuando algo cierra justo: caja sin diferencias, conteo que coincide,
 * cola sin conexión sincronizada, presupuesto que pasa a venta, aprobación completa. Nunca como decoración.
 *
 *   lanzarSalto({ desde: botonRef.current, mensaje: "Caja cerrada" })
 */
type Momento = { id: number; x: number; y: number; mensaje?: string }
type Opciones = { x?: number; y?: number; desde?: Element | null; mensaje?: string }

const oyentes = new Set<(m: Momento) => void>()
let siguiente = 1

export function lanzarSalto(opciones: Opciones = {}) {
  if (typeof window === "undefined") return
  let { x, y } = opciones
  if (opciones.desde) {
    const r = opciones.desde.getBoundingClientRect()
    // Despega del borde de arriba del elemento, un poco a la izquierda del centro: cae adelante.
    x = r.left + r.width / 2 - 36
    y = r.top + 2
  }
  const momento: Momento = {
    id: siguiente++,
    // Cerca del borde derecho, el salto arranca un poco antes: el mensaje tiene que entrar en la pantalla.
    x: Math.min(x ?? window.innerWidth / 2 - 36, window.innerWidth - 380),
    y: y ?? Math.min(220, window.innerHeight / 3),
    mensaje: opciones.mensaje,
  }
  oyentes.forEach((o) => o(momento))
}

// Medidas del salto en px de pantalla: 72 px hacia adelante, 30 de alto, punto de 9 px.
const DISTANCIA = 72
const LADO = 9
const ARCO = arcoDeSalto({ x: 12, y: 44 }, { x: 12 + DISTANCIA, y: 44 }, 0.42)
const TRAZO = trazoDeArco(ARCO)

function UnSalto({ momento, alTerminar }: { momento: Momento; alTerminar: () => void }) {
  const raiz = useRef<HTMLDivElement>(null)
  const fin = useRef(alTerminar)
  useEffect(() => {
    fin.current = alTerminar
  })

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const aro = el.querySelector<SVGCircleElement>("[data-origen]")!
    const trazo = el.querySelector<SVGPathElement>("[data-mascara]")!
    const punto = el.querySelector<SVGRectElement>("[data-punto]")!
    const mensaje = el.querySelector<HTMLElement>("[data-mensaje]")
    const estado = { p: 0 }
    const dibujar = () => {
      const { despegue, vuelo } = fasesDelSalto(estado.p)
      aro.style.opacity = String(despegue)
      aro.style.transform = `translate(${ARCO.desde.x}px, ${ARCO.desde.y}px) scale(${0.4 + 0.6 * despegue})`
      trazo.style.strokeDashoffset = String(1 - largoRecorrido(ARCO, vuelo))
      const c = puntoEnArco(ARCO, vuelo)
      punto.style.transform = `translate(${c.x - LADO / 2}px, ${c.y - LADO / 2}px)`
      punto.style.opacity = estado.p > 0.15 ? "1" : "0"
    }
    dibujar()
    const tl = gsap.timeline({ onComplete: () => fin.current() })
    tl.to(estado, { p: 1, duration: 0.72, ease: "none", onUpdate: dibujar })
    if (mensaje) tl.fromTo(mensaje, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.24, ease: "power2.out" }, 0.58)
    tl.to(el, { opacity: 0, duration: 0.4, ease: "power1.in" }, 1.5)
    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div
      ref={raiz}
      className="absolute"
      style={{ left: momento.x - 12, top: momento.y - 44 }}
      data-testid="momento-salto"
    >
      <svg width={DISTANCIA + 24} height={56} className="overflow-visible">
        <mask id={`salto-${momento.id}`} maskUnits="userSpaceOnUse">
          <path data-mascara d={TRAZO} fill="none" stroke="white" strokeWidth={6} pathLength={1} strokeDasharray="1 1" style={{ strokeDashoffset: 1 }} />
        </mask>
        <circle data-origen r={4} className="fill-none stroke-texto-2" strokeWidth={1.5} style={{ opacity: 0 }} />
        <path
          d={TRAZO}
          fill="none"
          className="stroke-foreground"
          strokeOpacity={0.7}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeDasharray="0 5"
          mask={`url(#salto-${momento.id})`}
        />
        <rect data-punto width={LADO} height={LADO} className="fill-foreground" style={{ opacity: 0 }} />
      </svg>
      {momento.mensaje && (
        <div
          data-mensaje
          className="t-etiqueta absolute whitespace-nowrap border border-linea bg-popover px-2.5 py-1.5 text-foreground"
          style={{ left: 12 + DISTANCIA - 4, top: 56, opacity: 0 }}
        >
          {momento.mensaje}
        </div>
      )}
    </div>
  )
}

export function CapaSaltos() {
  const [momentos, setMomentos] = useState<Momento[]>([])
  const [anuncio, setAnuncio] = useState("")
  // <body> recién en el cliente (en el servidor y al hidratar no hay portal).
  const cuerpo = useSyncExternalStore(
    () => () => {},
    () => document.body,
    () => null,
  )

  useEffect(() => {
    const oyente = (m: Momento) => {
      setMomentos((prev) => [...prev, m])
      if (m.mensaje) setAnuncio(m.mensaje)
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
      {cuerpo &&
        createPortal(
          // En un portal a <body>: con position: fixed dentro de algo achicado (transform), las coordenadas no coincidirían.
          <div className="pointer-events-none fixed inset-0 z-[200]" aria-hidden>
            {momentos.map((m) => (
              <UnSalto key={m.id} momento={m} alTerminar={() => setMomentos((prev) => prev.filter((p) => p.id !== m.id))} />
            ))}
          </div>,
          cuerpo,
        )}
    </>
  )
}
