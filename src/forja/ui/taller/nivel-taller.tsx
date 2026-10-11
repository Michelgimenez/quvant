"use client"

import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import type { FuenteForja } from "@/forja/datos/fuente"
import type { NodoForja, TallerForja } from "@/forja/dominio/modelo"
import type { Pieza } from "@/forja/dominio/pieza"
import { NOMBRE_ZONA, TIPOS_ZONA, estadoBloque, planoTaller, type PlanoTaller, type TipoZona } from "@/forja/dominio/plano"
import { cn } from "@/lib/utils"
import { useEscenaForja } from "../store"
import { moverConFlechas } from "../teclado"
import type { ModoCamara } from "./camara"
import { CapaEtiquetas, anclasTaller } from "./etiquetas"
import { PanelZona } from "./panel-zona"
import { Plano2D } from "./plano-2d"

const Taller3D = lazy(() => import("./taller-3d"))
/** Se llama al empezar la transición: el módulo 3D baja mientras vuela el mapa. */
export const precargarTaller3D = () => import("./taller-3d")

const reducirMovimiento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Nivel 2 — una sucursal por dentro: la escena 3D (carga diferida), la barra
 * de zonas (también es el camino con teclado) y el panel lateral.
 */
export function NivelTaller({
  fuente,
  nodo,
  modo,
  modo2D = false,
  onListo,
  onPieza,
}: {
  fuente: FuenteForja
  nodo: NodoForja
  modo: ModoCamara
  /** Versión 2D: plano de planta en SVG en lugar del corte 3D (sin three.js). */
  modo2D?: boolean
  onListo: () => void
  onPieza?: (p: Pieza) => void
}) {
  const taller = useMemo(() => fuente.taller(nodo.id), [fuente, nodo.id])
  const plano = useMemo(() => (taller ? planoTaller(taller, nodo.tipo) : null), [taller, nodo.tipo])
  const anclas = useMemo(() => (plano && taller ? anclasTaller(plano, taller) : []), [plano, taller])
  const elementos = useRef(new Map<string, HTMLElement>())
  const zona = useEscenaForja((s) => s.zona)
  const caja = useRef<HTMLDivElement>(null)
  const [tamano, setTamano] = useState({ ancho: 1200, alto: 800 })
  const [listo, setListo] = useState(false)
  // Si el navegador pierde el contexto WebGL, el taller sigue en el plano 2D
  const [perdido, setPerdido] = useState(false)
  const en2D = modo2D || perdido
  const [reducir] = useState(reducirMovimiento)

  useEffect(() => {
    const el = caja.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setTamano({ ancho: e.contentRect.width, alto: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const avisar = () => {
    setListo(true)
    onListo()
  }

  if (!taller || !plano) return null
  const escritorio = tamano.ancho >= 768
  const margenDerecho = zona && escritorio ? 392 : 0
  const margenAbajo = zona && !escritorio ? tamano.alto * 0.58 : 64
  const enTransito = taller.muelle.filter((b) => b.tipo === "transferencia" && b.estado === "en_transito").length

  return (
    <div ref={caja} className="absolute inset-0 z-10 overflow-clip bg-hierro" data-testid="forja-taller" data-sucursal={nodo.codigo} data-listo={listo} data-modo={en2D ? "2d" : "3d"}>
      {en2D ? (
        <Plano2D plano={plano} sucursalId={nodo.id} eventos={fuente.eventos} enTransito={enTransito} margenDerecho={margenDerecho} margenAbajo={margenAbajo} onListo={avisar} />
      ) : (
      <ErrorWebGL onFallo={avisar}>
        <Suspense fallback={null}>
          <Taller3D
            plano={plano}
            sucursalId={nodo.id}
            eventos={fuente.eventos}
            enTransito={enTransito}
            modo={modo}
            reducir={reducir}
            margenDerecho={margenDerecho}
            margenAbajo={margenAbajo}
            anclas={anclas}
            elementos={elementos}
            onListo={avisar}
            onPerdida={() => setPerdido(true)}
          />
        </Suspense>
      </ErrorWebGL>
      )}
      {listo && !en2D && <CapaEtiquetas anclas={anclas} plano={plano} elementos={elementos} />}
      {perdido && (
        <p className="absolute left-3 top-3 z-10 rounded-md border border-white/10 bg-hierro/90 px-2.5 py-1.5 text-xs text-acero" role="status" data-testid="aviso-contexto">
          Se perdió la aceleración gráfica: seguimos en el plano 2D.
        </p>
      )}
      <BarraZonas plano={plano} taller={taller} />
      {zona && <PanelZona zona={zona} nodo={nodo} taller={taller} plano={plano} red={fuente.red} enlaces={fuente.enlaces} onPieza={onPieza} />}
    </div>
  )
}

/** Resumen de una línea por zona (barra y lectores de pantalla). */
export function resumenZona(tipo: TipoZona, taller: TallerForja) {
  switch (tipo) {
    case "mostrador": {
      const ventas = taller.puestos.reduce((a, p) => a + p.ventasHoy, 0)
      const cola = taller.puestos.reduce((a, p) => a + p.sinConexion, 0)
      return `${ventas} ventas hoy${cola ? ` · ${cola} sin sincronizar` : ""}`
    }
    case "deposito": {
      const ps = taller.racks.flatMap((r) => r.productos).map(estadoBloque)
      return `${ps.filter((e) => e === "critico").length} críticos · ${ps.filter((e) => e === "sin_stock").length} sin stock`
    }
    case "servicio": {
      const retiro = taller.bancos.filter((b) => b.estado === "listo" || b.estado === "sin_reparacion").length
      return `${taller.bancos.length - retiro} en banco · ${retiro} para retirar`
    }
    case "muelle": {
      const pendientes = taller.muelle.filter((b) => b.tipo === "entrega" && b.estado === "pendiente").length
      const transito = taller.muelle.filter((b) => b.tipo === "transferencia" && b.estado === "en_transito").length
      return `${pendientes} por salir · ${transito} en tránsito`
    }
  }
}

function BarraZonas({ plano, taller }: { plano: PlanoTaller; taller: TallerForja }) {
  const zona = useEscenaForja((s) => s.zona)
  const resaltada = useEscenaForja((s) => s.zonaResaltada)
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  const resaltarZona = useEscenaForja((s) => s.resaltarZona)
  const tipos = TIPOS_ZONA.filter((t) => plano.zonas.some((z) => z.tipo === t))
  return (
    <nav className={cn("pointer-events-auto absolute bottom-3 left-3 right-3 z-10 flex gap-2 overflow-x-auto md:right-auto", zona && "max-md:hidden")} aria-label="Zonas de la sucursal (flechas para moverse)" onKeyDown={moverConFlechas}>
      {tipos.map((t) => {
        const activa = zona?.tipo === t
        return (
          <button
            key={t}
            type="button"
            aria-pressed={activa}
            onClick={() => elegirZona(activa ? null : { tipo: t, id: null })}
            onMouseEnter={() => resaltarZona(t)}
            onMouseLeave={() => resaltarZona(null)}
            onFocus={() => resaltarZona(t)}
            onBlur={() => resaltarZona(null)}
            className={cn(
              "shrink-0 rounded-lg border bg-hierro/85 px-3 py-1.5 text-left backdrop-blur transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple",
              activa || resaltada === t ? "border-temple" : "border-white/10 hover:border-white/25",
            )}
            data-testid={`zona-${t}`}
          >
            <span className="block text-xs font-semibold text-niebla">{NOMBRE_ZONA[t]}</span>
            <span className="block font-mono text-[10px] text-acero">{resumenZona(t, taller)}</span>
          </button>
        )
      })}
    </nav>
  )
}

/** Si el navegador no puede iniciar WebGL, la barra y el panel siguen andando. */
class ErrorWebGL extends Component<{ children: React.ReactNode; onFallo: () => void }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() {
    return { fallo: true }
  }
  componentDidCatch() {
    this.props.onFallo()
  }
  render() {
    if (this.state.fallo)
      return (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <p className="max-w-sm text-sm text-acero">Este navegador no pudo iniciar la vista 3D. Los datos de cada zona siguen disponibles en la barra de abajo.</p>
        </div>
      )
    return this.props.children
  }
}
