"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, EyeOff, Maximize, Pause, Play, RotateCcw } from "lucide-react"
import { useReducedMotion } from "motion/react"
import { Isotipo } from "@/components/marca/quvant"
import { cn } from "@/lib/utils"

/**
 * Motor de presentaciones cinematográficas (inversores y demo comercial).
 *
 * - Escenario fijo de 1920×1080 escalado a la ventana (bandas en hierro).
 * - Cada escena ocupa de 100 a 150 vh de scroll; la escena activa se elige
 *   por la posición del scroll. Al cambiar, la saliente y la entrante se
 *   superponen en una transición de opacidad de 0,75 s (dentro de 0,6–0,9 s).
 * - Teclado: P reproduce/pausa · H oculta controles y cursor · R reinicia ·
 *   1/2/3 velocidad 0,75×/1×/1,25× · ← → AvPág RePág Espacio · F pantalla completa.
 * - Enlace directo a una escena con #N (p. ej. /inversores#5); la URL sigue a la escena activa.
 * - Solo se anima transform, opacity y trazos SVG. Sin barras de scroll.
 * - Precarga imágenes, fuentes y datos antes de empezar.
 */

export type PropsEscena = { activa: boolean }

export type DefinicionEscena = {
  id: string
  titulo: string
  /** Largo de scroll en vh (100 a 150). */
  largo?: number
  /** Segundos que dura en reproducción automática (a 1×). */
  duracion: number
  Componente: React.ComponentType<PropsEscena>
}

type ContextoEscena = { activa: boolean; velocidad: number; reducir: boolean; escala: number; reinicio: number }
const Contexto = createContext<ContextoEscena>({ activa: false, velocidad: 1, reducir: false, escala: 1, reinicio: 0 })

/** Estado de la escena para sus animaciones (activa, velocidad, reducir movimiento, escala del escenario). */
export function useEscena() {
  return useContext(Contexto)
}

const VELOCIDADES = [0.75, 1, 1.25] as const
const TRANSICION_MS = 750

function cargarImagen(src: string) {
  return new Promise<void>((ok) => {
    const img = new Image()
    img.onload = () => {
      img.decode?.().catch(() => {}).finally(() => ok())
    }
    img.onerror = () => ok()
    img.src = src
  })
}

export function Presentacion({
  escenas,
  recursos = [],
  preparar,
  nombre,
  pie,
}: {
  escenas: DefinicionEscena[]
  recursos?: string[]
  preparar?: () => Promise<void>
  nombre: string
  /** Texto chico en la barra de controles (p. ej. "Confidencial"). */
  pie?: string
}) {
  const reducir = useReducedMotion() ?? false
  const [listo, setListo] = useState(false)
  const [avance, setAvance] = useState(0)
  const [activa, setActiva] = useState(0)
  const [saliente, setSaliente] = useState<number | null>(null)
  const [velocidad, setVelocidad] = useState<number>(1)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [oculto, setOculto] = useState(false)
  const [reinicio, setReinicio] = useState(0)
  const [escala, setEscala] = useState(1)
  const [alto, setAlto] = useState(800)
  const [ancho, setAncho] = useState(1280)
  const animandoScroll = useRef<number | null>(null)
  const activaRef = useRef(0)

  const largos = useMemo(() => escenas.map((e) => Math.min(150, Math.max(100, e.largo ?? 120))), [escenas])
  const inicios = useMemo(() => largos.map((_, i) => largos.slice(0, i).reduce((a, b) => a + b, 0)), [largos])
  const totalVh = largos.reduce((a, b) => a + b, 0)

  // Precarga completa
  useEffect(() => {
    let vivo = true
    const tareas: Promise<unknown>[] = [...recursos.map(cargarImagen), document.fonts?.ready ?? Promise.resolve(), preparar?.() ?? Promise.resolve()]
    let hechas = 0
    tareas.forEach((t) =>
      t.finally(() => {
        hechas++
        if (vivo) setAvance(hechas / tareas.length)
      }),
    )
    Promise.allSettled(tareas).then(() => vivo && setTimeout(() => setListo(true), 250))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sin barras de scroll mientras dura la presentación
  useEffect(() => {
    const html = document.documentElement
    html.classList.add("sin-scrollbar", "presentando")
    document.body.classList.add("sin-scrollbar")
    return () => {
      html.classList.remove("sin-scrollbar", "presentando")
      document.body.classList.remove("sin-scrollbar")
    }
  }, [])

  // Escala del escenario
  useEffect(() => {
    const medir = () => {
      setEscala(Math.min(window.innerWidth / 1920, window.innerHeight / 1080))
      setAlto(window.innerHeight)
      setAncho(window.innerWidth)
    }
    medir()
    window.addEventListener("resize", medir)
    return () => window.removeEventListener("resize", medir)
  }, [])

  const cambiarA = useCallback(
    (i: number) => {
      if (i === activaRef.current) return
      const anterior = activaRef.current
      activaRef.current = i
      setSaliente(anterior)
      setActiva(i)
      window.setTimeout(() => setSaliente((s) => (s === anterior ? null : s)), TRANSICION_MS / velocidad + 50)
    },
    [velocidad],
  )

  // Escena activa según el scroll
  useEffect(() => {
    if (!listo) return
    let marco = 0
    const alScroll = () => {
      cancelAnimationFrame(marco)
      marco = requestAnimationFrame(() => {
        const vh = window.innerHeight / 100
        const y = window.scrollY + window.innerHeight * 0.4
        let i = 0
        for (let k = 0; k < inicios.length; k++) if (y >= inicios[k] * vh) i = k
        cambiarA(i)
      })
    }
    window.addEventListener("scroll", alScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", alScroll)
      cancelAnimationFrame(marco)
    }
  }, [listo, inicios, cambiarA])

  const irA = useCallback(
    (i: number) => {
      const destino = Math.max(0, Math.min(escenas.length - 1, i))
      const vh = window.innerHeight / 100
      const desde = window.scrollY
      const hasta = inicios[destino] * vh + 2
      if (animandoScroll.current) cancelAnimationFrame(animandoScroll.current)
      if (reducir) {
        window.scrollTo(0, hasta)
        return
      }
      const dur = 900 / velocidad
      const t0 = performance.now()
      const paso = (t: number) => {
        const p = Math.min(1, (t - t0) / dur)
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
        window.scrollTo(0, desde + (hasta - desde) * e)
        if (p < 1) animandoScroll.current = requestAnimationFrame(paso)
        else animandoScroll.current = null
      }
      animandoScroll.current = requestAnimationFrame(paso)
    },
    [escenas.length, inicios, reducir, velocidad],
  )

  // Reproducción automática
  useEffect(() => {
    if (!reproduciendo || !listo) return
    if (activa >= escenas.length - 1) {
      const t = window.setTimeout(() => setReproduciendo(false), (escenas[activa].duracion * 1000) / velocidad)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => irA(activa + 1), (escenas[activa].duracion * 1000) / velocidad)
    return () => window.clearTimeout(t)
  }, [reproduciendo, listo, activa, velocidad, escenas, irA, reinicio])

  // Enlace directo (#N) y URL que sigue a la escena activa
  useEffect(() => {
    if (!listo) return
    const desdeHash = () => {
      const n = Number(window.location.hash.slice(1))
      if (Number.isInteger(n) && n >= 1 && n <= escenas.length) irA(n - 1)
    }
    desdeHash()
    window.addEventListener("hashchange", desdeHash)
    return () => window.removeEventListener("hashchange", desdeHash)
  }, [listo, escenas.length, irA])

  useEffect(() => {
    if (!listo) return
    const hash = `#${activa + 1}`
    if (window.location.hash !== hash) window.history.replaceState(window.history.state, "", hash)
  }, [listo, activa])

  const reiniciar = useCallback(() => {
    if (animandoScroll.current) cancelAnimationFrame(animandoScroll.current)
    animandoScroll.current = null
    window.scrollTo(0, 0)
    activaRef.current = 0
    setActiva(0)
    setSaliente(null)
    setReinicio((r) => r + 1)
  }, [])

  // Teclado
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === "p") setReproduciendo((r) => !r)
      else if (k === "h") setOculto((o) => !o)
      else if (k === "r") reiniciar()
      else if (k === "1" || k === "2" || k === "3") setVelocidad(VELOCIDADES[Number(k) - 1])
      else if (k === "f") void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())
      else if (["arrowright", "arrowdown", "pagedown", " "].includes(k)) {
        e.preventDefault()
        irA(activaRef.current + 1)
      } else if (["arrowleft", "arrowup", "pageup"].includes(k)) {
        e.preventDefault()
        irA(activaRef.current - 1)
      } else if (k === "home") irA(0)
      else if (k === "end") irA(escenas.length - 1)
      else return
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [irA, reiniciar, escenas.length])

  const montada = (i: number) => i === activa || i === saliente || i === activa + 1 || i === activa - 1

  return (
    <div className={cn("presentacion dark text-blanco", oculto && "cursor-none")} aria-label={nombre}>
      <div aria-hidden style={{ height: `${totalVh}vh` }} />
      <div className="fixed inset-0 overflow-hidden bg-negro" style={{ height: alto }}>
        <div
          className="absolute left-1/2 top-1/2 overflow-hidden bg-negro"
          style={{ width: 1920, height: 1080, transform: `translate(-50%, -50%) scale(${escala})`, transformOrigin: "center" }}
          role="region"
          aria-roledescription="presentación"
          aria-label={`${nombre} · escena ${activa + 1} de ${escenas.length}: ${escenas[activa]?.titulo}`}
        >
          {!listo ? (
            <Precarga avance={avance} />
          ) : (
            escenas.map((E, i) =>
              montada(i) ? (
                <div
                  key={`${E.id}:${reinicio}`}
                  className="absolute inset-0"
                  style={{
                    opacity: i === activa ? 1 : 0,
                    transition: `opacity ${reducir ? 1 : TRANSICION_MS / velocidad}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                    zIndex: i === activa ? 2 : 1,
                    pointerEvents: i === activa ? "auto" : "none",
                  }}
                  aria-hidden={i !== activa}
                  data-escena={E.id}
                >
                  <Contexto.Provider value={{ activa: i === activa, velocidad, reducir, escala, reinicio }}>
                    <E.Componente activa={i === activa} />
                  </Contexto.Provider>
                </div>
              ) : null,
            )
          )}
        </div>

        {listo && !oculto && alto > ancho && (
          <p className="pointer-events-none fixed inset-x-0 bottom-20 z-50 text-center font-mono text-xs text-acero">Girá el teléfono para verla más grande</p>
        )}
        {listo && !oculto && (
          <Controles
            activa={activa}
            total={escenas.length}
            titulo={escenas[activa]?.titulo ?? ""}
            reproduciendo={reproduciendo}
            velocidad={velocidad}
            pie={pie}
            onAnterior={() => irA(activa - 1)}
            onSiguiente={() => irA(activa + 1)}
            onReproducir={() => setReproduciendo((r) => !r)}
            onReiniciar={reiniciar}
            onVelocidad={setVelocidad}
            onOcultar={() => setOculto(true)}
            onIr={irA}
          />
        )}
      </div>
    </div>
  )
}

function Precarga({ avance }: { avance: number }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-8" role="status" aria-live="polite">
      <Isotipo className="h-24" version="principal" />
      <div className="h-1 w-96 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-full origin-left bg-foreground transition-transform duration-300" style={{ transform: `scaleX(${avance})` }} />
      </div>
      <p className="font-mono text-lg tracking-widest text-acero">PREPARANDO · {Math.round(avance * 100)} %</p>
    </div>
  )
}

function Controles(p: {
  activa: number
  total: number
  titulo: string
  reproduciendo: boolean
  velocidad: number
  pie?: string
  onAnterior: () => void
  onSiguiente: () => void
  onReproducir: () => void
  onReiniciar: () => void
  onVelocidad: (v: number) => void
  onOcultar: () => void
  onIr: (i: number) => void
}) {
  const boton = "inline-flex size-9 items-center justify-center rounded-lg text-blanco/80 hover:bg-white/10 hover:text-blanco"
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-hidden rounded-xl border border-white/10 bg-negro/90 px-2 py-1.5 shadow-2xl">
        <button type="button" className={boton} onClick={p.onAnterior} aria-label="Escena anterior">
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" className={boton} onClick={p.onReproducir} aria-label={p.reproduciendo ? "Pausar (P)" : "Reproducir (P)"} data-testid="presentacion-play">
          {p.reproduciendo ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button type="button" className={boton} onClick={p.onSiguiente} aria-label="Escena siguiente">
          <ChevronRight className="size-4" />
        </button>
        <span className="mx-2 hidden min-w-0 items-center gap-2 font-mono text-xs text-acero sm:flex" data-testid="presentacion-escena">
          <span className="text-blanco">
            {String(p.activa + 1).padStart(2, "0")} / {String(p.total).padStart(2, "0")}
          </span>
          <span className="max-w-48 truncate">{p.titulo}</span>
        </span>
        <div className="mx-1 hidden gap-1 md:flex" aria-label="Ir a escena">
          {Array.from({ length: p.total }, (_, i) => (
            <button key={i} type="button" onClick={() => p.onIr(i)} aria-label={`Escena ${i + 1}`} className="flex h-6 w-3 items-center justify-center">
              <span className={cn("h-1.5 w-3 rounded-full transition-transform", i === p.activa ? "bg-alerta" : "scale-x-50 bg-white/25")} />
            </button>
          ))}
        </div>
        <div className="mx-1 flex rounded-md border border-white/10 p-0.5" role="group" aria-label="Velocidad">
          {VELOCIDADES.map((v, i) => (
            <button key={v} type="button" onClick={() => p.onVelocidad(v)} aria-pressed={p.velocidad === v} title={`Tecla ${i + 1}`} className={cn("rounded px-1.5 py-0.5 font-mono text-[11px]", p.velocidad === v ? "bg-white/15 text-blanco" : "text-acero hover:text-blanco")}>
              {String(v).replace(".", ",")}×
            </button>
          ))}
        </div>
        <button type="button" className={boton} onClick={p.onReiniciar} aria-label="Reiniciar (R)">
          <RotateCcw className="size-4" />
        </button>
        <button type="button" className={boton} onClick={p.onOcultar} aria-label="Ocultar controles (H)">
          <EyeOff className="size-4" />
        </button>
        <button type="button" className={boton} onClick={() => void document.documentElement.requestFullscreen?.()} aria-label="Pantalla completa (F)">
          <Maximize className="size-4" />
        </button>
        {p.pie && <span className="ml-1 hidden font-mono text-[10px] uppercase tracking-wider text-acero lg:inline">{p.pie}</span>}
      </div>
    </div>
  )
}
