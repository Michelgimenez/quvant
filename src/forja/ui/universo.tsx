"use client"

import { Suspense, lazy, useContext, useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { ArrowLeft, Box, MonitorPlay, Square, X } from "lucide-react"
import { Sello } from "@/components/base/sellos"
import type { Id } from "@/dominio/tipos"
import { PARADAS_CALOR, colorCalor } from "@/forja/dominio/calor"
import type { Pieza } from "@/forja/dominio/pieza"
import { hastaCursor, tramoDelDia } from "@/forja/dominio/repeticion"
import type { FuenteForja } from "@/forja/datos/fuente"
import { cn } from "@/lib/utils"
import { Activacion, type FinActivacion } from "./activacion/activacion"
import { hora } from "./formato"
import { LineaTiempo, useMotorRepeticion } from "./linea-tiempo"
import { MarcaForja } from "./marca-forja"
import { PanelPieza } from "./pieza/panel-pieza"
import { vistaDePieza } from "./pieza/vista"
import { AnunciosVivos } from "./anuncios"
import { useModo2D } from "./modo-2d"
import type { ControlRed } from "./red/universo-red"
import { UniversoRed2D } from "./red/universo-red-2d"
import { SalaControl } from "./sala-control"
import { ContextoEscena, crearStoreEscena, useEscenaForja, type VistaRed } from "./store"
import type { ModoCamara } from "./taller/camara"
import { NivelTaller, precargarTaller3D } from "./taller/nivel-taller"
import { Leyenda } from "./taller/panel-zona"

/**
 * El universo del taller: la misma escena para la app y para las demos
 * públicas. Recibe los datos ya armados (FuenteForja) y maneja la escena.
 */
/** El mapa 3D (MapLibre y deck.gl) se descarga solo si se usa: en la versión 2D no viaja. */
const UniversoRed = lazy(() => import("./red/universo-red").then((m) => ({ default: m.UniversoRed })))

/** Si llega `activacion`, primero se ve la animación y después las sucursales se encienden una por una. */
export type ActivacionUniverso = { alTerminar: (motivo: FinActivacion) => void; arranqueManual?: boolean }

/** Co-branding de una demo para un prospecto (logo para fondo oscuro) y un aviso visible. */
export type MarcaUniverso = { logo: string; nombre: string }

export function Universo({
  fuente,
  alEntrar,
  activacion = null,
  pieza = null,
  marca = null,
  aviso = null,
}: {
  fuente: FuenteForja
  alEntrar?: (id: Id) => void
  activacion?: ActivacionUniverso | null
  /** Abre el nivel 3 con esta pieza (desde el buscador o un enlace). */
  pieza?: Pieza | null
  marca?: MarcaUniverso | null
  aviso?: React.ReactNode
}) {
  const [store] = useState(crearStoreEscena)
  return (
    <ContextoEscena.Provider value={store}>
      <Escena fuente={fuente} alEntrar={alEntrar} activacion={activacion} piezaPedida={pieza} marca={marca} aviso={aviso} />
    </ContextoEscena.Provider>
  )
}

const reducirMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
/** La hora de la escena: la real, o la de la demo (snapshot) si hay desfase. */
const ahoraCon = (desfase: number) => new Date(Date.now() + desfase)
const cuadros = (n: number) => new Promise<void>((ok) => (n <= 0 ? ok() : requestAnimationFrame(() => void cuadros(n - 1).then(ok))))

function Escena({
  fuente,
  alEntrar,
  activacion,
  piezaPedida,
  marca,
  aviso,
}: {
  fuente: FuenteForja
  alEntrar?: (id: Id) => void
  activacion: ActivacionUniverso | null
  piezaPedida: Pieza | null
  marca: MarcaUniverso | null
  aviso: React.ReactNode
}) {
  const store = useContext(ContextoEscena)!
  const [entrada, setEntrada] = useState<"normal" | "esperando" | "encender">(activacion ? "esperando" : "normal")
  // Versión 2D: movimiento reducido o equipo modesto (o elegida a mano)
  const modo2D = useModo2D()
  // Si el navegador pierde el contexto WebGL del mapa, se sigue en 2D sin trabar nada
  const [sinWebGL, setSinWebGL] = useState(false)
  const es2D = modo2D.activo || sinWebGL
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
  const pieza = useEscenaForja((s) => s.pieza)
  const verPieza = useEscenaForja((s) => s.verPieza)

  // ───── Repetición del día: la red y los eventos tal como estaban a la hora del cursor ─────
  // Demos públicas: la escena vive en la hora de su snapshot
  const desfase = fuente.desfase ?? 0
  const setDesfase = useEscenaForja((s) => s.setDesfase)
  useEffect(() => setDesfase(desfase), [desfase, setDesfase])
  const tramo = useMemo(() => tramoDelDia(fuente.eventos, ahoraCon(desfase)), [fuente.eventos, desfase])
  useMotorRepeticion(tramo)
  const repeticion = useEscenaForja((s) => s.repeticion)
  const cursor = repeticion.activa ? repeticion.cursor : null
  const red = useMemo(() => (cursor === null ? fuente.red : fuente.redEn(new Date(cursor))), [cursor, fuente])
  const eventos = useMemo(() => (cursor === null ? fuente.eventos : hastaCursor(fuente.eventos, cursor)), [cursor, fuente.eventos])

  const nodoActual = nivel === "taller" ? (red.nodos.find((n) => n.id === sucursalId) ?? null) : null
  // Nivel 3: los datos de la pieza y cómo se marca el mapa
  const datosPieza = useMemo(() => (nivel === "pieza" && pieza ? fuente.pieza(pieza) : null), [nivel, pieza, fuente])
  const vistaPieza = useMemo(() => (datosPieza ? vistaDePieza(datosPieza) : null), [datosPieza])
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
    if (st.transicion || st.nivel === "taller" || st.sala || !nodo) return
    if (st.nivel === "pieza") st.verPieza(null)
    alEntrar?.(id)
    // En 2D no hay vuelo ni descenso de cámara: el mismo camino corto que con movimiento reducido
    const reducir = reducirMovimiento() || es2D
    // El taller muestra el presente: la repetición termina al entrar
    st.salirDeRepeticion()
    st.setTransicion("entrando")
    st.resaltar(null)
    st.elegirTransferencia(null)
    if (!es2D) void precargarTaller3D()
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
    const reducir = reducirMovimiento() || es2D
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

  /** Nivel 3 desde cualquier lado: si se está en un taller, primero se vuelve a la red. */
  async function irAPieza(p: Pieza) {
    if (store.getState().nivel === "taller") await volver()
    store.getState().verPieza(p)
  }

  // Desde el buscador o un enlace (?pieza=producto:… o maquina:…)
  const clavePedida = piezaPedida ? `${piezaPedida.tipo}:${piezaPedida.id}` : null
  useEffect(() => {
    if (!piezaPedida) return
    const id = requestAnimationFrame(() => void irAPieza(piezaPedida))
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePedida])

  // Nivel 3: la red se encuadra en el espacio que deja libre el panel; al salir, vuelve el encuadre normal
  useEffect(() => {
    if (nivel !== "pieza") return
    const mapa = control.current
    const caja = escenario.current?.getBoundingClientRect()
    const duracion = reducirMovimiento() ? 0 : 900
    if (caja && store.getState().vista === "mapa") {
      const margen = caja.width >= 768 ? { top: 90, bottom: 110, left: 90, right: 440 } : { top: 50, bottom: Math.round(caja.height * 0.52) + 30, left: 60, right: 60 }
      void mapa?.encuadrar(duracion, margen)
    }
    return () => {
      if (store.getState().nivel === "red" && store.getState().vista === "mapa") void mapa?.encuadrar(duracion)
    }
  }, [nivel, store])

  // Esc: primero cierra el panel; después vuelve a la red
  useEffect(() => {
    if (nivel === "red") return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return
      const st = store.getState()
      if (st.nivel === "pieza") st.verPieza(null)
      else if (st.zona) st.elegirZona(null)
      else void volver()
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  })

  return (
    <div ref={raiz} className="relative flex h-full flex-col bg-negro text-blanco" data-nivel={nivel} data-sala={sala || undefined}>
      <header className="relative z-30 flex flex-wrap items-center gap-3 border-b border-white/10 bg-negro/80 px-4 py-2.5 backdrop-blur">
        {marca && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={marca.logo} alt={marca.nombre} className={sala ? "h-8 w-auto" : "h-6 w-auto"} data-testid="marca-cliente" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-acero">con</span>
          </>
        )}
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
              <Reloj desfase={desfase} />
              <button type="button" onClick={() => setSala(false)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-acero hover:border-white/25 hover:text-blanco focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground" data-testid="salir-sala">
                <X className="size-3.5" aria-hidden /> Salir
              </button>
            </div>
          </>
        ) : nivel === "pieza" && pieza ? (
          <nav className="flex min-w-0 items-center gap-2 text-sm" aria-label="Ubicación en Forja">
            <button type="button" onClick={() => verPieza(null)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-acero hover:border-white/25 hover:text-blanco focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground" aria-label="Volver a la red">
              <ArrowLeft className="size-3.5" aria-hidden /> Red
            </button>
            <span className="text-acero" aria-hidden>
              /
            </span>
            <span className="truncate font-heading font-bold" aria-current="page">
              {pieza.tipo === "producto" ? "Recorrido de una pieza" : "Historia de una máquina"}
            </span>
          </nav>
        ) : nodoActual ? (
          <nav className="flex min-w-0 items-center gap-2 text-sm" aria-label="Ubicación en Forja">
            <button type="button" onClick={() => void volver()} disabled={transicion !== null} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-acero hover:border-white/25 hover:text-blanco focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground disabled:opacity-50" aria-label="Volver a la red">
              <ArrowLeft className="size-3.5" aria-hidden /> Red
            </button>
            <span className="text-acero" aria-hidden>
              /
            </span>
            <span className="truncate font-heading font-bold" aria-current="page">
              {nodoActual.nombre}
            </span>
            {nodoActual.demo && <span className="rounded-[3px] border border-dashed border-alerta/80 px-1 font-mono text-[9px] font-bold text-alerta">DEMO</span>}
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
            ) : nivel === "pieza" ? null : (
              <>
                <SelectorVista />
                <button
                  type="button"
                  onClick={modo2D.alternar}
                  aria-pressed={es2D}
                  title={modo2D.motivo && !modo2D.elegido ? `Versión 2D automática: ${modo2D.motivo}` : es2D ? "Pasar a la versión 3D" : "Pasar a la versión 2D (más liviana)"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-acero hover:border-white/25 hover:text-blanco focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground"
                  data-testid="alternar-2d"
                >
                  {es2D ? <Square className="size-3.5" aria-hidden /> : <Box className="size-3.5" aria-hidden />}
                  {es2D ? "2D" : "3D"}
                </button>
                <button
                  type="button"
                  onClick={() => setSala(true)}
                  className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-acero hover:border-white/25 hover:text-blanco focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground md:inline-flex"
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
        <div className="absolute inset-0 isolate" inert={nivel === "taller"}>
          {es2D ? (
            <UniversoRed2D red={red} eventos={eventos} controlRef={control} onEntrar={(id) => void entrar(id)} entrada={entrada} pieza={vistaPieza} />
          ) : (
            <Suspense fallback={null}>
              <UniversoRed red={red} eventos={eventos} controlRef={control} onEntrar={(id) => void entrar(id)} activa={nivel !== "taller"} entrada={entrada} pieza={vistaPieza} onPerdida={() => setSinWebGL(true)} />
            </Suspense>
          )}
        </div>
        {sinWebGL && nivel === "red" && (
          <p className="absolute bottom-[4.5rem] right-3 z-10 rounded-md border border-white/10 bg-negro/90 px-2.5 py-1.5 text-xs text-acero" role="status" data-testid="aviso-contexto">
            Se perdió la aceleración gráfica: seguimos en la versión 2D.
          </p>
        )}
        {aviso && nivel === "red" && !sala && (
          <div className="absolute right-3 top-3 z-10 max-w-sm rounded-md border border-white/10 bg-negro/80 px-2.5 py-1.5 text-[11px] text-acero backdrop-blur" data-testid="aviso-demo">
            {aviso}
          </div>
        )}
        {nivel === "red" && !sala && transicion === null && (
          <>
            <LeyendaCalor />
            <LineaTiempo eventos={fuente.eventos} tramo={tramo} />
          </>
        )}
        {sala && <SalaControl red={red} eventos={eventos} control={control} />}
        {nodoActual && <NivelTaller fuente={fuente} nodo={nodoActual} modo={camara} modo2D={es2D} onListo={() => avisarListo.current?.()} onPieza={(p) => void irAPieza(p)} />}
        {nivel === "pieza" && datosPieza && <PanelPieza datos={datosPieza} red={red} enlaces={fuente.enlaces} onCerrar={() => verPieza(null)} />}
        {nivel === "pieza" && !datosPieza && (
          <div className="absolute right-4 top-4 z-20 max-w-sm rounded-xl border border-white/10 bg-negro/95 p-4 text-sm text-acero" role="status" data-testid="panel-pieza-vacio">
            No hay datos de esa pieza en las sucursales que podés ver.
            <button type="button" onClick={() => verPieza(null)} className="ml-2 text-blanco underline-offset-4 hover:underline">
              Volver a la red
            </button>
          </div>
        )}
        <div ref={iris} className="pointer-events-none absolute left-0 top-0 z-20 rounded-full opacity-0 will-change-transform" aria-hidden data-testid="forja-iris" />
        <AnunciosVivos eventos={fuente.eventos} red={fuente.red} activo={!repeticion.activa} />
        {entrada === "esperando" && activacion && (
          <Activacion
            quietaDeEntrada={es2D}
            arranqueManual={activacion.arranqueManual}
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

/** Hora actual para la sala de control (se actualiza cada 15 s; en las demos, la hora de la demo). */
function Reloj({ desfase }: { desfase: number }) {
  const [ahora, setAhora] = useState(() => new Date(Date.now() + desfase).toISOString())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date(Date.now() + desfase).toISOString()), 15_000)
    return () => window.clearInterval(id)
  }, [desfase])
  return <span className="font-mono text-2xl text-blanco">{hora(ahora)}</span>
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
          className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground", vista === v ? "bg-white/12 text-blanco" : "text-acero hover:text-blanco")}
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
    <div className="pointer-events-none absolute left-3 top-3 z-10 hidden items-center gap-2 rounded-md bg-negro/70 px-2 py-1 backdrop-blur md:flex" aria-label="Escala de calor: de frío a blanco caliente">
      <span className="font-mono text-[10px] uppercase tracking-widest text-acero">frío</span>
      <span className="h-1.5 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${degradado})` }} aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-widest text-acero">pico</span>
    </div>
  )
}
