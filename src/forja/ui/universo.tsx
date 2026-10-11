"use client"

import { useContext, useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { ArrowLeft, MonitorPlay, X } from "lucide-react"
import { Sello } from "@/components/base/sellos"
import type { Id } from "@/dominio/tipos"
import { PARADAS_CALOR, colorCalor } from "@/forja/dominio/calor"
import { hastaCursor, tramoDelDia } from "@/forja/dominio/repeticion"
import type { FuenteForja } from "@/forja/datos/fuente"
import { cn } from "@/lib/utils"
import { Activacion, type FinActivacion } from "./activacion/activacion"
import { hora } from "./formato"
import { LineaTiempo, useMotorRepeticion } from "./linea-tiempo"
import { MarcaForja } from "./marca-forja"
import { UniversoRed, type ControlRed } from "./red/universo-red"
import { SalaControl } from "./sala-control"
import { ContextoEscena, crearStoreEscena, useEscenaForja, type VistaRed } from "./store"
import type { ModoCamara } from "./taller/camara"
import { NivelTaller, precargarTaller3D } from "./taller/nivel-taller"
import { Leyenda } from "./taller/panel-zona"

/**
 * El universo del taller: la misma escena para la app y para las demos
 * públicas. Recibe los datos ya armados (FuenteForja) y maneja la escena.
 */
/** Si llega `activacion`, primero se ve la animación y después las sucursales se encienden una por una. */
export type ActivacionUniverso = { alTerminar: (motivo: FinActivacion) => void }

export function Universo({ fuente, alEntrar, activacion = null }: { fuente: FuenteForja; alEntrar?: (id: Id) => void; activacion?: ActivacionUniverso | null }) {
  const [store] = useState(crearStoreEscena)
  return (
    <ContextoEscena.Provider value={store}>
      <Escena fuente={fuente} alEntrar={alEntrar} activacion={activacion} />
    </ContextoEscena.Provider>
  )
}

const reducirMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
const cuadros = (n: number) => new Promise<void>((ok) => (n <= 0 ? ok() : requestAnimationFrame(() => void cuadros(n - 1).then(ok))))

function Escena({ fuente, alEntrar, activacion }: { fuente: FuenteForja; alEntrar?: (id: Id) => void; activacion: ActivacionUniverso | null }) {
  const store = useContext(ContextoEscena)!
  const [entrada, setEntrada] = useState<"normal" | "esperando" | "encender">(activacion ? "esperando" : "normal")
  const control = useRef<ControlRed | null>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const escenario = useRef<HTMLDivElement>(null)
  const iris = useRef<HTMLDivElement>(null)
  const avisarListo = useRef<(() => void) | null>(null)
  const [camara, setCamara] = useState<ModoCamara>("quieta")
  const nivel = useEscenaForja((s) => s.nivel)
  const sucursalId = useEscenaForja((s) => s.sucursalId)
  const transicion = useEscenaForja((s) => s.transicion)
  const sala = useEscenaForja((s) => s.sala)
  const setSala = useEscenaForja((s) => s.setSala)

  // ───── Repetición del día: la red y los eventos tal como estaban a la hora del cursor ─────
  const tramo = useMemo(() => tramoDelDia(fuente.eventos, new Date()), [fuente.eventos])
  useMotorRepeticion(tramo)
  const repeticion = useEscenaForja((s) => s.repeticion)
  const cursor = repeticion.activa ? repeticion.cursor : null
  const red = useMemo(() => (cursor === null ? fuente.red : fuente.redEn(new Date(cursor))), [cursor, fuente])
  const eventos = useMemo(() => (cursor === null ? fuente.eventos : hastaCursor(fuente.eventos, cursor)), [cursor, fuente.eventos])

  const nodoActual = nivel === "taller" ? (red.nodos.find((n) => n.id === sucursalId) ?? null) : null
  const enTransito = red.transferencias.filter((t) => t.estado === "en_transito").length
  const ventasHoy = red.nodos.reduce((a, n) => a + n.ventasHoy, 0)

  // ───── Sala de control: pantalla completa y pantalla siempre encendida ─────
  useEffect(() => {
    if (!sala) return
    const el = raiz.current
    let completa = false
    let candado: { release: () => Promise<void> } | null = null
    el?.requestFullscreen?.()
      .then(() => (completa = true))
      .catch(() => {
        /* sin permiso o sin soporte: la sala ocupa el área de Forja */
      })
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock
      ?.request("screen")
      .then((c) => (candado = c))
      .catch(() => {})
    // Esc sale de la pantalla completa (el navegador) y con eso, de la sala
    const alSalirDePantallaCompleta = () => {
      if (completa && !document.fullscreenElement) setSala(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) setSala(false)
    }
    document.addEventListener("fullscreenchange", alSalirDePantallaCompleta)
    window.addEventListener("keydown", tecla)
    return () => {
      document.removeEventListener("fullscreenchange", alSalirDePantallaCompleta)
      window.removeEventListener("keydown", tecla)
      void candado?.release().catch(() => {})
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [sala, setSala])

  // ───── Iris: el brillo del nodo crece hasta cubrir la escena y se funde ─────
  function ubicarIris(pos: { x: number; y: number }, color: string) {
    const el = iris.current
    const caja = escenario.current?.getBoundingClientRect()
    if (!el || !caja) return null
    // Radio para que la parte opaca del degradado (48 %) cubra la esquina más lejana
    const lejos = Math.max(Math.hypot(pos.x, pos.y), Math.hypot(caja.width - pos.x, pos.y), Math.hypot(pos.x, caja.height - pos.y), Math.hypot(caja.width - pos.x, caja.height - pos.y))
    const d = (lejos / 0.48) * 2
    Object.assign(el.style, { width: `${d}px`, height: `${d}px`, left: `${pos.x - d / 2}px`, top: `${pos.y - d / 2}px`, background: `radial-gradient(circle, #fff4e0 0%, ${color} 6%, rgb(194 65 12 / 0.5) 18%, #0e1116 48%)` })
    return el
  }
  const centro = () => {
    const c = escenario.current?.getBoundingClientRect()
    return { x: (c?.width ?? 0) / 2, y: (c?.height ?? 0) / 2 }
  }
  const animar = (el: HTMLElement, desde: gsap.TweenVars, hasta: gsap.TweenVars) => new Promise<void>((ok) => void gsap.fromTo(el, desde, { ...hasta, overwrite: true, onComplete: ok }))

  async function entrar(id: Id) {
    const st = store.getState()
    const nodo = red.nodos.find((n) => n.id === id)
    if (st.transicion || st.nivel !== "red" || st.sala || !nodo) return
    alEntrar?.(id)
    const reducir = reducirMovimiento()
    // El taller muestra el presente: la repetición termina al entrar
    st.salirDeRepeticion()
    st.setTransicion("entrando")
    st.resaltar(null)
    st.elegirTransferencia(null)
    void precargarTaller3D()
    // 1. El mapa vuela hacia el nodo, acercando e inclinando
    if (!reducir && st.vista === "mapa" && nodo.lat !== null) await control.current?.volarA(id, 1500)
    // 2. El brillo del nodo crece hasta cubrir la escena
    const el = ubicarIris(control.current?.posicion(id) ?? centro(), colorCalor(nodo.calor))
    if (el) await animar(el, { scale: 0.02, opacity: 0 }, { scale: 1, opacity: 1, duration: reducir ? 0.15 : 0.55, ease: "power2.in" })
    // 3. Debajo se monta el taller con la cámara arriba; cuando dibuja, el brillo se funde y la cámara baja
    const listo = new Promise<void>((ok) => {
      avisarListo.current = ok
      window.setTimeout(ok, 12_000)
    })
    setCamara("arriba")
    st.entrarSucursal(id)
    await listo
    avisarListo.current = null
    setCamara("quieta")
    if (el) await animar(el, { opacity: 1 }, { opacity: 0, duration: reducir ? 0.2 : 0.8, ease: "power1.out" })
    st.setTransicion(null)
  }

  async function volver() {
    const st = store.getState()
    if (st.transicion || st.nivel !== "taller" || !st.sucursalId) return
    const id = st.sucursalId
    const nodo = red.nodos.find((n) => n.id === id)
    const reducir = reducirMovimiento()
    st.setTransicion("saliendo")
    st.elegirZona(null)
    // La cámara del taller sube mientras el brillo cubre; después, el camino inverso en el mapa
    setCamara("saliendo")
    const el = ubicarIris(centro(), colorCalor(nodo?.calor ?? 1))
    if (el) await animar(el, { scale: 1, opacity: 0 }, { opacity: 1, duration: reducir ? 0.15 : 0.6, ease: "power2.in" })
    st.volverARed()
    setCamara("quieta")
    await cuadros(2)
    const pos = control.current?.posicion(id) ?? centro()
    if (el) {
      ubicarIris(pos, colorCalor(nodo?.calor ?? 1))
      void animar(el, { scale: 1, opacity: 1 }, { scale: 0.02, opacity: 0, duration: reducir ? 0.15 : 0.7, ease: "power2.out" })
    }
    if (st.vista === "mapa") await control.current?.encuadrar(reducir ? 0 : 1500)
    st.setTransicion(null)
  }

  // Esc: primero cierra el panel; después vuelve a la red
  useEffect(() => {
    if (nivel !== "taller") return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return
      const st = store.getState()
      if (st.zona) st.elegirZona(null)
      else void volver()
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  })

  return (
    <div ref={raiz} className="relative flex h-full flex-col bg-hierro text-niebla" data-nivel={nivel} data-sala={sala || undefined}>
      <header className="relative z-30 flex flex-wrap items-center gap-3 border-b border-white/10 bg-hierro/80 px-4 py-2.5 backdrop-blur">
        <MarcaForja tamano={sala ? 30 : 22} />
        <div className="flex items-center gap-2">
          {fuente.propuesta && <Sello texto="PROPUESTA" titulo="Propuesta comercial: no es un cliente activo" />}
          {red.org.esDemo && !fuente.propuesta && <Sello />}
          {fuente.simulacion && <Sello texto="SIMULACIÓN" titulo="Eventos generados para la demostración" />}
          {repeticion.activa && <Sello texto="REPETICIÓN" titulo="La red tal como estaba a esa hora del día" />}
        </div>
        {sala ? (
          <>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-acero">Sala de control</span>
            <div className="ml-auto flex items-center gap-4">
              <Reloj />
              <button type="button" onClick={() => setSala(false)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-acero hover:border-white/25 hover:text-niebla focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple" data-testid="salir-sala">
                <X className="size-3.5" aria-hidden /> Salir
              </button>
            </div>
          </>
        ) : nodoActual ? (
          <nav className="flex min-w-0 items-center gap-2 text-sm" aria-label="Ubicación en Forja">
            <button type="button" onClick={() => void volver()} disabled={transicion !== null} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-acero hover:border-white/25 hover:text-niebla focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple disabled:opacity-50" aria-label="Volver a la red">
              <ArrowLeft className="size-3.5" aria-hidden /> Red
            </button>
            <span className="text-acero" aria-hidden>
              /
            </span>
            <span className="truncate font-heading font-bold" aria-current="page">
              {nodoActual.nombre}
            </span>
            {nodoActual.demo && <span className="rounded-[3px] border border-dashed border-chispa/80 px-1 font-mono text-[9px] font-bold text-chispa">DEMO</span>}
          </nav>
        ) : (
          <span className="hidden font-mono text-[11px] text-acero md:inline">
            {red.nodos.length} {red.nodos.length === 1 ? "sucursal" : "sucursales"} · {enTransito} en tránsito · <span data-testid="ventas-hoy-total">{ventasHoy}</span> ventas hoy
          </span>
        )}
        {!sala && (
          <div className="ml-auto flex items-center gap-3">
            {nodoActual ? (
              <Leyenda className="mt-0 hidden lg:flex" />
            ) : (
              <>
                <SelectorVista />
                <button
                  type="button"
                  onClick={() => setSala(true)}
                  className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-acero hover:border-white/25 hover:text-niebla focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple md:inline-flex"
                  data-testid="abrir-sala"
                >
                  <MonitorPlay className="size-3.5" aria-hidden /> Sala de control
                </button>
              </>
            )}
          </div>
        )}
      </header>
      {/* data-linea: la atribución del mapa sube por encima de la línea de tiempo */}
      <div ref={escenario} className="relative flex-1 overflow-clip" data-linea={(nivel === "red" && !sala) || undefined}>
        {/* isolate: las capas de deck.gl no se cuelan sobre el taller */}
        <div className="absolute inset-0 isolate" inert={nivel !== "red"}>
          <UniversoRed red={red} eventos={eventos} controlRef={control} onEntrar={(id) => void entrar(id)} activa={nivel === "red"} entrada={entrada} />
        </div>
        {nivel === "red" && !sala && transicion === null && (
          <>
            <LeyendaCalor />
            <LineaTiempo eventos={fuente.eventos} tramo={tramo} />
          </>
        )}
        {sala && <SalaControl red={red} eventos={eventos} control={control} />}
        {nodoActual && <NivelTaller fuente={fuente} nodo={nodoActual} modo={camara} onListo={() => avisarListo.current?.()} />}
        <div ref={iris} className="pointer-events-none absolute left-0 top-0 z-20 rounded-full opacity-0 will-change-transform" aria-hidden data-testid="forja-iris" />
        {entrada === "esperando" && activacion && (
          <Activacion
            onFin={(motivo) => {
              setEntrada("encender")
              activacion.alTerminar(motivo)
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Hora actual para la sala de control (se actualiza cada 15 s). */
function Reloj() {
  const [ahora, setAhora] = useState(() => new Date().toISOString())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date().toISOString()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  return <span className="font-mono text-2xl text-niebla">{hora(ahora)}</span>
}

function SelectorVista() {
  const vista = useEscenaForja((s) => s.vista)
  const setVista = useEscenaForja((s) => s.setVista)
  const opciones: [VistaRed, string][] = [
    ["mapa", "Mapa"],
    ["constelacion", "Constelación"],
  ]
  return (
    <div className="flex rounded-lg border border-white/10 p-0.5" role="group" aria-label="Vista de la red">
      {opciones.map(([v, nombre]) => (
        <button
          key={v}
          type="button"
          aria-pressed={vista === v}
          onClick={() => setVista(v)}
          className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple", vista === v ? "bg-white/12 text-niebla" : "text-acero hover:text-niebla")}
          data-testid={`vista-${v}`}
        >
          {nombre}
        </button>
      ))}
    </div>
  )
}

/** Escala de calor: de frío a blanco caliente (relativa al promedio de cada sucursal). */
function LeyendaCalor() {
  const pasos = 24
  const max = PARADAS_CALOR[PARADAS_CALOR.length - 1].calor
  const degradado = Array.from({ length: pasos + 1 }, (_, i) => colorCalor((i / pasos) * max)).join(", ")
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 hidden items-center gap-2 rounded-md bg-hierro/70 px-2 py-1 backdrop-blur md:flex" aria-label="Escala de calor: de frío a blanco caliente">
      <span className="font-mono text-[10px] uppercase tracking-widest text-acero">frío</span>
      <span className="h-1.5 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${degradado})` }} aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-widest text-acero">pico</span>
    </div>
  )
}
