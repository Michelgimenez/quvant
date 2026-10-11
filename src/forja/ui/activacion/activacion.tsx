"use client"

import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Isotipo } from "@/components/marca/marca"
import { CRONOGRAMA, DURACION_ACTIVACION, tramo } from "@/forja/dominio/activacion"
import { cn } from "@/lib/utils"
import { MarcaForja } from "../marca-forja"
import { SonidoActivacion } from "./sonido"

const EscenaActivacion = lazy(() => import("./escena-activacion"))

export type FinActivacion = "terminada" | "saltada"

const sube = (x: number) => 1 - Math.pow(1 - x, 3)
/** Con movimiento reducido: la composición quieta, un momento, y fundido. */
const DURACION_QUIETA = 1.8
/** Si el 3D no llega a cargar a tiempo, la activación no bloquea: pasa a la versión quieta. */
const ESPERA_MAXIMA_3D = 8000

type Capas = { capa: HTMLDivElement | null; fondo: HTMLDivElement | null; lienzo: HTMLDivElement | null; texto: HTMLDivElement | null; brillo: HTMLDivElement | null }

/** Un cuadro de la activación en 3D: textos, brillo e iris (solo opacity y transform). */
function pintar(t: number, c: Capas) {
  if (c.texto) {
    const entra = sube(tramo(t, CRONOGRAMA.texto))
    const sale = tramo(t, { desde: CRONOGRAMA.empuje.desde + 0.15, hasta: CRONOGRAMA.brillo.desde + 0.1 })
    c.texto.style.opacity = String(entra * (1 - sale))
    c.texto.style.transform = `translateY(${(1 - entra) * 10}px)`
  }
  // El brillo llena la pantalla y se abre en un iris hacia el universo
  const llena = tramo(t, CRONOGRAMA.brillo)
  const abre = sube(tramo(t, CRONOGRAMA.iris))
  if (c.brillo) {
    c.brillo.style.opacity = String(llena * (1 - abre))
    c.brillo.style.transform = `translate(-50%, -50%) scale(${0.85 + llena * 0.15 + abre * 1.8})`
  }
  const cubierto = t >= CRONOGRAMA.iris.desde
  if (c.lienzo) c.lienzo.style.opacity = cubierto ? "0" : "1"
  if (c.fondo) c.fondo.style.opacity = cubierto ? "0" : "1"
}

/** Un cuadro de la versión quieta (movimiento reducido o sin 3D): aparece y se funde. */
function pintarQuieta(t: number, c: Capas) {
  const entra = Math.min(1, t / 0.4)
  const sale = tramo(t, { desde: DURACION_QUIETA - 0.45, hasta: DURACION_QUIETA })
  if (c.texto) {
    c.texto.style.opacity = String(entra)
    c.texto.style.transform = "none"
  }
  if (c.capa) c.capa.style.opacity = String(1 - sale)
}

/**
 * Activación de Forja: el yunque se convierte en forja (≤ 4,5 s, se puede
 * saltar). La escena 3D se descarga aparte; textos, brillo e iris son del DOM
 * y se animan solo con transform y opacity, cuadro a cuadro desde un único reloj.
 */
export function Activacion({ onFin, quietaDeEntrada = false }: { onFin: (motivo: FinActivacion) => void; quietaDeEntrada?: boolean }) {
  const [quieta, setQuieta] = useState(() => quietaDeEntrada || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches))
  const [listo3d, setListo3d] = useState(false)
  const [sonido, setSonido] = useState(false)
  const reloj = useRef(0)
  const capa = useRef<HTMLDivElement>(null)
  const fondo = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLDivElement>(null)
  const texto = useRef<HTMLDivElement>(null)
  const brillo = useRef<HTMLDivElement>(null)
  const saltar = useRef<HTMLButtonElement>(null)
  const audio = useRef<SonidoActivacion | null>(null)
  const conSonido = useRef(false)
  const terminado = useRef(false)

  // onFin cambia en cada render de quien la usa: se guarda la última sin reiniciar el reloj
  const alFin = useRef(onFin)
  useEffect(() => {
    alFin.current = onFin
  })
  const terminar = useCallback((motivo: FinActivacion) => {
    if (terminado.current) return
    terminado.current = true
    audio.current?.cerrar()
    alFin.current(motivo)
  }, [])

  // Saltar: fundido corto de toda la capa y listo
  const alSaltar = useCallback(() => {
    if (terminado.current) return
    const el = capa.current
    if (!el) return terminar("saltada")
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-out", fill: "forwards" }).finished.then(
      () => terminar("saltada"),
      () => terminar("saltada"),
    )
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

  // Sin 3D a tiempo (red lenta, sin WebGL): versión quieta
  useEffect(() => {
    if (quieta || listo3d) return
    const id = window.setTimeout(() => setQuieta(true), ESPERA_MAXIMA_3D)
    return () => window.clearTimeout(id)
  }, [quieta, listo3d])

  // Reloj único: avanza cuadro a cuadro (como mucho 50 ms por cuadro: con la pestaña oculta, se pausa)
  useEffect(() => {
    if (!quieta && !listo3d) return
    const duracion = quieta ? DURACION_QUIETA : DURACION_ACTIVACION
    reloj.current = 0
    let marco = 0
    let previo = performance.now()
    const paso = (ahora: number) => {
      reloj.current = Math.min(duracion, reloj.current + Math.min(50, ahora - previo) / 1000)
      previo = ahora
      const capas = { capa: capa.current, fondo: fondo.current, lienzo: lienzo.current, texto: texto.current, brillo: brillo.current }
      if (quieta) pintarQuieta(reloj.current, capas)
      else pintar(reloj.current, capas)
      if (reloj.current >= duracion) return terminar("terminada")
      marco = requestAnimationFrame(paso)
    }
    marco = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(marco)
  }, [quieta, listo3d, terminar])

  const alternarSonido = () => {
    const prender = !sonido
    setSonido(prender)
    conSonido.current = prender
    if (prender && !audio.current) audio.current = new SonidoActivacion()
  }

  return (
    <div ref={capa} className="fixed inset-0 z-50 overflow-hidden text-niebla" role="dialog" aria-modal="true" aria-label="Activación de Forja" data-testid="activacion" data-modo={quieta ? "quieta" : "3d"} data-listo={listo3d || quieta}>
      <div ref={fondo} className="absolute inset-0 bg-hierro" aria-hidden />
      {!quieta && (
        <div ref={lienzo} className="absolute inset-0">
          <FalloEscena onFallo={() => setQuieta(true)}>
            <Suspense fallback={null}>
              <EscenaActivacion
                reloj={reloj}
                reducir={false}
                onListo={() => setListo3d(true)}
                onGolpe={() => conSonido.current && audio.current?.golpe()}
                onChispas={() => conSonido.current && audio.current?.chisporroteo()}
              />
            </Suspense>
          </FalloEscena>
        </div>
      )}
      {!quieta && !listo3d && (
        <div className="absolute inset-0 grid place-items-center" role="status" aria-label="Cargando la activación">
          <MarcaForja tamano={26} className="animate-pulse opacity-60" />
        </div>
      )}
      {/* El brillo de la brasa: llena la pantalla y se abre (solo opacity y transform) */}
      <div
        ref={brillo}
        className="pointer-events-none absolute left-1/2 top-1/2 size-[260vmax] rounded-full opacity-0 will-change-transform"
        style={{ transform: "translate(-50%, -50%)", background: "radial-gradient(circle, #fff4e0 0%, #ffb224 6%, #ff6a1f 14%, rgb(194 65 12 / 0.9) 24%, #0e1116 46%)" }}
        aria-hidden
      />
      <div ref={texto} className={cn("pointer-events-none absolute inset-x-0 flex flex-col items-center gap-3 px-6 text-center opacity-0", quieta ? "inset-y-0 justify-center" : "bottom-[16%]")}>
        <div className="flex items-center gap-4">
          {/* La única estrella de 4 puntas: la del isotipo, al final, junto al nombre */}
          <Isotipo tono="negativo" className="h-7 text-niebla sm:h-9" titulo={null} />
          <MarcaForja tamano={28} className="sm:hidden" />
          <MarcaForja tamano={40} className="max-sm:hidden" />
        </div>
        <p className="font-heading text-lg text-niebla/85 sm:text-xl">Lo firme y lo vivo, trabajando juntos.</p>
      </div>
      <p className="sr-only" role="status">
        Forja activada: yunque más forja. Lo firme y lo vivo, trabajando juntos.
      </p>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4 sm:p-6">
        {quieta ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={alternarSonido}
            aria-pressed={sonido}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-hierro/60 px-3 py-1.5 text-xs text-acero backdrop-blur hover:text-niebla focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple"
            data-testid="sonido-activacion"
          >
            {sonido ? <Volume2 className="size-3.5" aria-hidden /> : <VolumeX className="size-3.5" aria-hidden />}
            {sonido ? "Sonido" : "Sin sonido"}
          </button>
        )}
        <button
          ref={saltar}
          type="button"
          onClick={alSaltar}
          className="rounded-md border border-white/15 bg-hierro/60 px-3 py-1.5 text-xs text-niebla backdrop-blur hover:border-white/30 focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple"
          data-testid="saltar-activacion"
        >
          Saltar
        </button>
      </div>
    </div>
  )
}

/** Sin WebGL (o si la escena falla): la versión quieta, sin trabar la entrada a Forja. */
class FalloEscena extends Component<{ children: React.ReactNode; onFallo: () => void }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() {
    return { fallo: true }
  }
  componentDidCatch() {
    this.props.onFallo()
  }
  render() {
    return this.state.fallo ? null : this.props.children
  }
}
