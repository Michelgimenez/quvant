"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { Q_GEOMETRIA } from "@/components/marca/q-geometria"
import { arcoDeSalto, fasesDelSalto, puntoEnArco, trazoDeArco } from "@/components/marca/salto-geometria"
import { FORJA } from "@/config/forja"
import { CRONOGRAMA, DURACION_ACTIVACION, type PuntoMapa } from "@/forja/dominio/activacion"
import { MarcaForja } from "../marca-forja"

export type FinActivacion = "terminada" | "saltada"

/** Con movimiento reducido: la composición final quieta, un momento, y fundido. */
const DURACION_QUIETA = 1.8

/** Con arranque manual (grabación de videos), el reloj espera este evento para empezar. */
export const EVENTO_ARRANCAR_ACTIVACION = "forja:arrancar-activacion"

// El escenario: 1600 × 900 (se ve entero en cualquier pantalla), la grilla cada 40.
const ANCHO = 1600
const ALTO = 900
const PASO = 40
const COLUMNAS = Array.from({ length: ANCHO / PASO }, (_, i) => PASO / 2 + i * PASO)
const FILAS = Array.from({ length: Math.floor(ALTO / PASO) }, (_, j) => 30 + j * PASO)
/** La caja del mapa (las sucursales) y la Q, en el escenario. */
const CAJA = { x: 470, y: 90, lado: 660 }
const LADO_Q = 250
const Q = { x: ANCHO / 2 - LADO_Q / 2, y: ALTO / 2 - LADO_Q / 2 - 20 }
const k = LADO_Q / Q_GEOMETRIA.lado
const ARO = { cx: Q.x + Q_GEOMETRIA.aro.cx * k, cy: Q.y + Q_GEOMETRIA.aro.cy * k, r: ((Q_GEOMETRIA.aro.radioExterior + Q_GEOMETRIA.aro.radioInterior) / 2) * k, ancho: (Q_GEOMETRIA.aro.radioExterior - Q_GEOMETRIA.aro.radioInterior) * k }
const PUNTO = { x: Q.x + Q_GEOMETRIA.punto.x * k, y: Q.y + Q_GEOMETRIA.punto.y * k, lado: Q_GEOMETRIA.punto.lado * k }

/** Una constelación genérica, si la red no trae coordenadas. */
const GENERICA: PuntoMapa[] = [
  { x: 0.5, y: 0.55 },
  { x: 0.38, y: 0.4 },
  { x: 0.66, y: 0.42 },
  { x: 0.3, y: 0.68 },
  { x: 0.6, y: 0.74 },
  { x: 0.74, y: 0.6 },
  { x: 0.46, y: 0.26 },
  { x: 0.22, y: 0.5 },
]

/** Lleva un punto de la caja (0..1) al punto de la grilla más cercano. */
function aGrilla(p: PuntoMapa) {
  const x = CAJA.x + p.x * CAJA.lado
  const y = CAJA.y + p.y * CAJA.lado
  const cx = COLUMNAS.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a))
  const cy = FILAS.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a))
  return { x: cx, y: cy }
}

/**
 * Activación de Forja con la marca de Quvant (≤ 4,5 s, se puede saltar): la Q se traza, el punto salta y donde
 * cae se enciende la primera sucursal; desde ahí, la grilla de puntos se convierte en el mapa con las demás.
 * Todo con una línea de tiempo de GSAP (el único reloj), solo transform, opacity y trazos SVG.
 */
export function Activacion({
  onFin,
  quietaDeEntrada = false,
  arranqueManual = false,
  puntos,
}: {
  onFin: (motivo: FinActivacion) => void
  quietaDeEntrada?: boolean
  arranqueManual?: boolean
  /** Las sucursales en la caja (0..1), con la primera adelante (puntosActivacion). */
  puntos?: PuntoMapa[]
}) {
  const [quieta] = useState(() => quietaDeEntrada || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches))
  const [arrancada, setArrancada] = useState(!arranqueManual)
  useEffect(() => {
    if (arrancada) return
    const arrancar = () => setArrancada(true)
    window.addEventListener(EVENTO_ARRANCAR_ACTIVACION, arrancar)
    return () => window.removeEventListener(EVENTO_ARRANCAR_ACTIVACION, arrancar)
  }, [arrancada])

  // Los puntos se toman una sola vez: si quien la usa vuelve a pintar, la animación no se reinicia.
  const [puntosIniciales] = useState(puntos)
  // Las sucursales sobre la grilla (sin repetir un mismo punto) y, de cada una, lo lejos que está de la primera.
  const sucursales = useMemo(() => {
    const base = puntosIniciales?.length ? puntosIniciales : GENERICA
    const vistos = new Set<string>()
    const lista = base.map(aGrilla).filter((p) => {
      const clave = `${p.x}:${p.y}`
      if (vistos.has(clave)) return false
      vistos.add(clave)
      return true
    })
    const [p0] = lista
    const lejos = Math.max(1, ...lista.map((p) => Math.hypot(p.x - p0.x, p.y - p0.y)))
    return lista.map((p) => ({ ...p, orden: Math.hypot(p.x - p0.x, p.y - p0.y) / lejos }))
  }, [puntosIniciales])
  const primera = sucursales[0]
  // Los puntos de la grilla que quedan cerca de alguna sucursal: el mapa que se enciende.
  const cercanos = useMemo(() => {
    const lista: { x: number; y: number; orden: number }[] = []
    for (const x of COLUMNAS)
      for (const y of FILAS) {
        let mejor = Infinity
        for (const s of sucursales) mejor = Math.min(mejor, Math.hypot(s.x - x, s.y - y))
        if (mejor > 0 && mejor <= 72) lista.push({ x, y, orden: Math.hypot(x - primera.x, y - primera.y) / 900 })
      }
    return lista
  }, [sucursales, primera])
  const arco = useMemo(() => arcoDeSalto({ x: PUNTO.x + PUNTO.lado / 2, y: PUNTO.y + PUNTO.lado / 2 }, primera, Math.min(0.42, 120 / Math.max(1, Math.hypot(primera.x - PUNTO.x, primera.y - PUNTO.y)))), [primera])

  const capa = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const placa = useRef<HTMLDivElement>(null)
  const saltar = useRef<HTMLButtonElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const terminado = useRef(false)

  // onFin cambia en cada render de quien la usa: se guarda la última sin reiniciar el reloj
  const alFin = useRef(onFin)
  useEffect(() => {
    alFin.current = onFin
  })
  const terminar = useCallback((motivo: FinActivacion) => {
    if (terminado.current) return
    terminado.current = true
    tl.current?.kill()
    alFin.current(motivo)
  }, [])

  // Saltar: fundido corto de toda la capa y listo
  const alSaltar = useCallback(() => {
    if (terminado.current) return
    tl.current?.pause()
    if (!capa.current) return terminar("saltada")
    gsap.to(capa.current, { opacity: 0, duration: 0.22, ease: "power1.out", onComplete: () => terminar("saltada") })
  }, [terminar])

  useEffect(() => {
    saltar.current?.focus({ preventScroll: true })
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault()
        alSaltar()
      }
    }
    window.addEventListener("keydown", tecla, true)
    return () => window.removeEventListener("keydown", tecla, true)
  }, [alSaltar])

  // La línea de tiempo: un solo reloj para todo.
  useLayoutEffect(() => {
    const raiz = svg.current
    if (!raiz || !arrancada) return
    const q = (s: string) => raiz.querySelectorAll<SVGElement>(s)
    const t = gsap.timeline({ onComplete: () => terminar("terminada") })
    tl.current = t
    if (quieta) {
      // La composición final, quieta: el mapa encendido y la placa.
      gsap.set(q("[data-aro], [data-punto], [data-salto]"), { opacity: 0 })
      gsap.set(q("[data-cercano]"), { opacity: 0.55 })
      gsap.set(q("[data-sucursal], [data-enlace]"), { opacity: 1 })
      gsap.set(placa.current, { opacity: 1 })
      t.to(capa.current, { opacity: 0, duration: 0.45, ease: "power1.in" }, DURACION_QUIETA - 0.45)
      return () => {
        t.kill()
      }
    }
    const C = CRONOGRAMA
    const d = (r: { desde: number; hasta: number }) => r.hasta - r.desde
    // 1 · El aro se traza.
    t.fromTo(q("[data-aro]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: d(C.aro), ease: "power2.inOut" }, C.aro.desde)
    // 2 · El punto aparece en su lugar.
    t.fromTo(q("[data-punto]"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: d(C.punto), ease: "back.out(1.6)" }, C.punto.desde)
    // 3 · Salta en arco hasta la primera sucursal (el trazo punteado lo sigue).
    const estado = { p: 0 }
    const punto = q("[data-punto]")[0]
    const mascara = q("[data-mascara-salto]")[0]
    const origen = q("[data-origen]")[0]
    t.to(
      estado,
      {
        p: 1,
        duration: d(C.salto),
        ease: "none",
        onUpdate: () => {
          const { despegue, vuelo } = fasesDelSalto(estado.p)
          const c = puntoEnArco(arco, vuelo)
          gsap.set(punto, { x: c.x - (PUNTO.x + PUNTO.lado / 2), y: c.y - (PUNTO.y + PUNTO.lado / 2) })
          gsap.set(origen, { opacity: estado.p < 0.85 ? despegue * 0.8 : (1 - estado.p) * 5 })
          gsap.set(mascara, { strokeDashoffset: 1 - vuelo })
        },
      },
      C.salto.desde,
    )
    t.to(q("[data-punto]"), { scale: 0.42, duration: 0.18, ease: "power2.in" }, C.salto.hasta - 0.18)
    t.to(q("[data-salto]"), { opacity: 0, duration: 0.3 }, C.enciende.desde + 0.1)
    // 4 · Se enciende la primera sucursal (el halo se abre).
    t.fromTo(q("[data-sucursal='0']"), { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: d(C.enciende), ease: "power3.out" }, C.enciende.desde)
    t.fromTo(q("[data-halo]"), { opacity: 0.9, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 0, scale: 3.2, duration: 0.8, ease: "power2.out" }, C.enciende.desde)
    t.to(q("[data-punto]"), { opacity: 0, duration: 0.15 }, C.enciende.desde + 0.05)
    // 5 · La Q se retira.
    t.to(q("[data-aro]"), { opacity: 0, scale: 0.92, transformOrigin: `${ARO.cx}px ${ARO.cy}px`, duration: d(C.retiro), ease: "power2.in" }, C.retiro.desde)
    // 6 · La grilla se vuelve el mapa: los puntos cercanos se encienden en onda y aparecen las demás sucursales.
    t.to(q("[data-cercano]"), { opacity: 0.55, duration: 0.35, ease: "power1.out", stagger: { each: d(C.mapa) / Math.max(1, cercanos.length), from: 0 } }, C.mapa.desde)
    t.fromTo(q("[data-sucursal]:not([data-sucursal='0'])"), { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)", stagger: { each: (d(C.mapa) - 0.3) / Math.max(1, sucursales.length - 1) } }, C.mapa.desde + 0.1)
    t.fromTo(q("[data-enlace]"), { strokeDashoffset: 1, opacity: 0.6 }, { strokeDashoffset: 0, duration: 0.7, ease: "power2.out", stagger: 0.05 }, C.mapa.desde + 0.2)
    // 7 · La placa y la frase.
    t.fromTo(placa.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: d(C.placa), ease: "power3.out" }, C.placa.desde)
    // 8 · Fundido hacia el universo.
    t.to(capa.current, { opacity: 0, duration: d(C.salida), ease: "power1.in" }, C.salida.desde)
    t.set({}, {}, DURACION_ACTIVACION)
    return () => {
      t.kill()
    }
  }, [arrancada, quieta, arco, cercanos.length, sucursales.length, terminar])

  // Los enlaces de la primera con las más cercanas (la red), como mucho 10.
  const enlaces = sucursales
    .slice(1)
    .sort((a, b) => a.orden - b.orden)
    .slice(0, 10)
  return (
    <div ref={capa} className="fixed inset-0 z-50 overflow-hidden bg-negro text-blanco" role="dialog" aria-modal="true" aria-label="Activación de Forja" data-testid="activacion" data-modo={quieta ? "quieta" : "animada"} data-listo="true">
      <svg ref={svg} viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <mask id="mascara-salto-forja" maskUnits="userSpaceOnUse" x={0} y={0} width={ANCHO} height={ALTO}>
            <path data-mascara-salto d={trazoDeArco(arco)} fill="none" stroke="white" strokeWidth={8} pathLength={1} strokeDasharray="1 1" style={{ strokeDashoffset: 1 }} />
          </mask>
        </defs>
        {/* La grilla de puntos de la marca */}
        <g className="fill-gris-4">
          {COLUMNAS.flatMap((x) => FILAS.map((y) => <rect key={`${x}:${y}`} x={x - 1.2} y={y - 1.2} width={2.4} height={2.4} />))}
        </g>
        {/* El mapa: los puntos de la grilla cerca de las sucursales, que se encienden en onda */}
        <g className="fill-acero">
          {cercanos.map((p) => (
            <rect key={`${p.x}:${p.y}`} data-cercano x={p.x - 1.6} y={p.y - 1.6} width={3.2} height={3.2} style={{ opacity: 0 }} />
          ))}
        </g>
        <g className="stroke-gris-6" fill="none">
          {enlaces.map((s) => (
            <line key={`${s.x}:${s.y}`} data-enlace x1={primera.x} y1={primera.y} x2={s.x} y2={s.y} strokeWidth={1} pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: 1, opacity: 0 }} />
          ))}
        </g>
        {/* Las sucursales: cuadrados, como el punto */}
        <rect data-halo x={primera.x - 9} y={primera.y - 9} width={18} height={18} fill="none" className="stroke-blanco" strokeWidth={1.4} style={{ opacity: 0 }} />
        {sucursales.map((s, i) => (
          <rect key={`${s.x}:${s.y}`} data-sucursal={i} x={s.x - (i === 0 ? 7 : 4.5)} y={s.y - (i === 0 ? 7 : 4.5)} width={i === 0 ? 14 : 9} height={i === 0 ? 14 : 9} className="fill-blanco" style={{ opacity: 0 }} />
        ))}
        {/* La Q: el aro se traza y el punto salta (la versión blanca del isotipo, sin deformar) */}
        <circle data-aro cx={ARO.cx} cy={ARO.cy} r={ARO.r} fill="none" className="stroke-blanco" strokeWidth={ARO.ancho} pathLength={1} strokeDasharray="1" transform={`rotate(-90 ${ARO.cx} ${ARO.cy})`} style={{ strokeDashoffset: 1 }} />
        <g data-salto>
          <rect data-origen x={PUNTO.x + PUNTO.lado * 0.2} y={PUNTO.y + PUNTO.lado * 0.2} width={PUNTO.lado * 0.6} height={PUNTO.lado * 0.6} fill="none" className="stroke-acero" strokeWidth={1.4} style={{ opacity: 0 }} />
          <path d={trazoDeArco(arco)} fill="none" className="stroke-blanco" strokeOpacity={0.8} strokeWidth={2} strokeLinecap="round" strokeDasharray="0 9" mask="url(#mascara-salto-forja)" />
        </g>
        <rect data-punto x={PUNTO.x} y={PUNTO.y} width={PUNTO.lado} height={PUNTO.lado} className="fill-blanco" style={{ transform: "scale(0)" }} />
      </svg>
      <div ref={placa} className="pointer-events-none absolute inset-x-0 bottom-[12%] flex flex-col items-center gap-4 px-6 text-center" style={{ opacity: 0 }}>
        <MarcaForja tamano={28} className="sm:hidden" />
        <MarcaForja tamano={40} className="max-sm:hidden" />
        <p className="t-texto text-acero" data-testid="frase-forja">
          {FORJA.frase}
        </p>
      </div>
      <p className="sr-only" role="status">
        Forja activada.
      </p>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-3 p-4 sm:p-6">
        <button
          ref={saltar}
          type="button"
          onClick={alSaltar}
          className="t-texto-sm rounded-md border border-gris-4 bg-negro px-3 py-1.5 text-blanco transition-colors hover:border-gris-8 focus-visible:outline focus-visible:outline-1 focus-visible:outline-blanco"
          data-testid="saltar-activacion"
        >
          Saltar
        </button>
      </div>
    </div>
  )
}
