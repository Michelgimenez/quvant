"use client"

import { useContext, useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ArrowLeft } from "lucide-react"
import { Sello } from "@/components/base/sellos"
import type { Id } from "@/dominio/tipos"
import { PARADAS_CALOR, colorCalor } from "@/forja/dominio/calor"
import type { FuenteForja } from "@/forja/datos/fuente"
import { cn } from "@/lib/utils"
import { MarcaForja } from "./marca-forja"
import { UniversoRed, type ControlRed } from "./red/universo-red"
import { ContextoEscena, crearStoreEscena, useEscenaForja, type VistaRed } from "./store"
import type { ModoCamara } from "./taller/camara"
import { NivelTaller, precargarTaller3D } from "./taller/nivel-taller"
import { Leyenda } from "./taller/panel-zona"

/**
 * El universo del taller: la misma escena para la app y para las demos
 * públicas. Recibe los datos ya armados (FuenteForja) y maneja la escena.
 */
export function Universo({ fuente, alEntrar }: { fuente: FuenteForja; alEntrar?: (id: Id) => void }) {
  const [store] = useState(crearStoreEscena)
  return (
    <ContextoEscena.Provider value={store}>
      <Escena fuente={fuente} alEntrar={alEntrar} />
    </ContextoEscena.Provider>
  )
}

const reducirMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
const cuadros = (n: number) => new Promise<void>((ok) => (n <= 0 ? ok() : requestAnimationFrame(() => void cuadros(n - 1).then(ok))))

function Escena({ fuente, alEntrar }: { fuente: FuenteForja; alEntrar?: (id: Id) => void }) {
  const store = useContext(ContextoEscena)!
  const control = useRef<ControlRed | null>(null)
  const escenario = useRef<HTMLDivElement>(null)
  const iris = useRef<HTMLDivElement>(null)
  const avisarListo = useRef<(() => void) | null>(null)
  const [camara, setCamara] = useState<ModoCamara>("quieta")
  const nivel = useEscenaForja((s) => s.nivel)
  const sucursalId = useEscenaForja((s) => s.sucursalId)
  const transicion = useEscenaForja((s) => s.transicion)
  const { red } = fuente
  const nodoActual = nivel === "taller" ? (red.nodos.find((n) => n.id === sucursalId) ?? null) : null
  const enTransito = red.transferencias.filter((t) => t.estado === "en_transito").length
  const ventasHoy = red.nodos.reduce((a, n) => a + n.ventasHoy, 0)

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
    if (st.transicion || st.nivel !== "red" || !nodo) return
    alEntrar?.(id)
    const reducir = reducirMovimiento()
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
    <div className="relative flex h-full flex-col bg-hierro text-niebla" data-nivel={nivel}>
      <header className="relative z-30 flex flex-wrap items-center gap-3 border-b border-white/10 bg-hierro/80 px-4 py-2.5 backdrop-blur">
        <MarcaForja tamano={22} />
        <div className="flex items-center gap-2">
          {fuente.propuesta && <Sello texto="PROPUESTA" titulo="Propuesta comercial: no es un cliente activo" />}
          {red.org.esDemo && !fuente.propuesta && <Sello />}
          {fuente.simulacion && <Sello texto="SIMULACIÓN" titulo="Eventos generados para la demostración" />}
        </div>
        {nodoActual ? (
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
        <div className="ml-auto flex items-center gap-3">
          {nodoActual ? (
            <Leyenda className="mt-0 hidden lg:flex" />
          ) : (
            <>
              <LeyendaCalor />
              <SelectorVista />
            </>
          )}
        </div>
      </header>
      <div ref={escenario} className="relative flex-1 overflow-clip">
        {/* isolate: las capas de deck.gl no se cuelan sobre el taller */}
        <div className="absolute inset-0 isolate" inert={nivel !== "red"}>
          <UniversoRed red={red} eventos={fuente.eventos} controlRef={control} onEntrar={(id) => void entrar(id)} activa={nivel === "red"} />
        </div>
        {nodoActual && <NivelTaller fuente={fuente} nodo={nodoActual} modo={camara} onListo={() => avisarListo.current?.()} />}
        <div ref={iris} className="pointer-events-none absolute left-0 top-0 z-20 rounded-full opacity-0 will-change-transform" aria-hidden data-testid="forja-iris" />
      </div>
    </div>
  )
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
    <div className="hidden items-center gap-2 lg:flex" aria-label="Escala de calor: de frío a blanco caliente">
      <span className="font-mono text-[10px] uppercase tracking-widest text-acero">frío</span>
      <span className="h-1.5 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${degradado})` }} aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-widest text-acero">pico</span>
    </div>
  )
}
