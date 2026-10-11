"use client"

import { useContext, useEffect, useMemo, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { MapboxOverlay } from "@deck.gl/mapbox"
import { LineLayer, PathLayer, ScatterplotLayer } from "@deck.gl/layers"
import gsap from "gsap"
import type { Id } from "@/dominio/tipos"
import { rgb255Calor } from "@/forja/dominio/calor"
import { grosorEnlace, layoutConstelacion } from "@/forja/dominio/constelacion"
import { avanceTransito, puntoEnArco, puntosArco, type Punto3D } from "@/forja/dominio/geo"
import type { EventoForja, NodoForja, RedForja } from "@/forja/dominio/modelo"
import { hora } from "../formato"
import type { FlujoVista, VistaPieza } from "../pieza/vista"
import { ContextoEscena, useEscenaForja } from "../store"
import { ESTILO_CARTO, teñirMapa } from "./estilo-mapa"
import { NodoRed } from "./nodo-red"
import { TarjetaNodo } from "./tarjeta-nodo"

/**
 * Nivel 1 — la red. MapLibre (estilo oscuro de CARTO, teñido) con deck.gl encima
 * para los arcos de transferencias, las chispas que viajan y el brillo de los
 * nodos. Los nodos en sí son elementos del DOM (accesibles con teclado) que se
 * ubican con la proyección del mapa, o con el diseño de la constelación.
 */
export type ControlRed = {
  /** Cámara hacia un nodo (acerca e inclina; por defecto, a nivel de calle). Resuelve al terminar. */
  volarA: (id: Id, duracionMs: number, opciones?: { zoom?: number; pitch?: number }) => Promise<void>
  /** Vuelve a encuadrar toda la red; `margen` reserva lugar para paneles encima del mapa. */
  encuadrar: (duracionMs: number, margen?: { top: number; bottom: number; left: number; right: number }) => Promise<void>
  /** Posición en pantalla de un nodo (para el iris de la transición). */
  posicion: (id: Id) => { x: number; y: number } | null
}

type Pulso = { nodoId: Id; t0: number }

const DURACION_PULSO = 1400
/** Más ventas nuevas que esto de una vez es un salto en la línea de tiempo: no se anima cada una. */
const MAX_PULSOS_POR_PASO = 12

/**
 * Resuelve cuando termina el movimiento de cámara recién iniciado. Se escucha
 * después de iniciarlo: si cortó otro movimiento, el "moveend" de ese no cuenta.
 */
function finDelMovimiento(mapa: maplibregl.Map, duracionMs: number) {
  if (!mapa.isMoving()) return Promise.resolve()
  return new Promise<void>((ok) => {
    const tope = window.setTimeout(ok, duracionMs + 800)
    mapa.once("moveend", () => {
      window.clearTimeout(tope)
      ok()
    })
  })
}

// Worker de MapLibre servido como archivo estático (scripts/copiar-maplibre.mjs)
maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs")
const reducirMovimiento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function UniversoRed({
  red,
  eventos,
  controlRef,
  onEntrar,
  activa = true,
  entrada = "normal",
  pieza = null,
}: {
  red: RedForja
  eventos: EventoForja[]
  controlRef?: React.RefObject<ControlRed | null>
  onEntrar?: (id: Id) => void
  /** Falso mientras se ve el taller: el bucle de animación del mapa descansa. */
  activa?: boolean
  /** Después de la activación, las sucursales se encienden una por una. */
  entrada?: "normal" | "esperando" | "encender"
  /** Nivel 3: en vez de las transferencias, los flujos de la pieza y una marca por sucursal. */
  pieza?: VistaPieza | null
}) {
  const store = useContext(ContextoEscena)!
  const vista = useEscenaForja((s) => s.vista)
  const sala = useEscenaForja((s) => s.sala)
  const resaltado = useEscenaForja((s) => s.resaltado)
  const resaltar = useEscenaForja((s) => s.resaltar)
  const elegirTransferencia = useEscenaForja((s) => s.elegirTransferencia)
  const transferenciaId = useEscenaForja((s) => s.transferenciaId)

  const contenedor = useRef<HTMLDivElement>(null)
  const divMapa = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<maplibregl.Map | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const elementos = useRef(new Map<Id, HTMLElement>())
  const svgEnlaces = useRef<SVGSVGElement>(null)
  const pulsos = useRef<Pulso[]>([])
  const vistaRef = useRef(vista)
  const [errorMapa, setErrorMapa] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  const conCoordenadas = useMemo(() => red.nodos.filter((n) => n.lat !== null && n.lng !== null), [red.nodos])
  const datos = useRef({ red, conCoordenadas, transferenciaId, activa, pieza })
  useEffect(() => {
    datos.current = { red, conCoordenadas, transferenciaId, activa, pieza }
  }, [red, conCoordenadas, transferenciaId, activa, pieza])
  // Encendido: el brillo de cada nodo (deck.gl) acompaña la aparición escalonada del DOM
  const encendido = useRef<{ modo: typeof entrada; t0: number }>({ modo: entrada, t0: 0 })
  useEffect(() => {
    encendido.current = { modo: entrada, t0: performance.now() }
  }, [entrada])

  // Última venta de cada sucursal: el nodo late cuando cambia
  const ultimaVenta = useMemo(() => {
    const u: Record<Id, string> = {}
    for (const ev of eventos) if (ev.tipo === "venta") u[ev.sucursalId] = ev.id
    return u
  }, [eventos])
  // Golpe de brillo en el mapa por cada venta nueva (las del día al montar no cuentan). En la
  // repetición la lista crece y se achica con el cursor: se compara siempre con la anterior.
  const vistos = useRef<Set<string> | null>(null)
  useEffect(() => {
    const actuales = new Set(eventos.map((e) => e.id))
    if (vistos.current) {
      const nuevas = eventos.filter((ev) => ev.tipo === "venta" && !vistos.current!.has(ev.id))
      if (nuevas.length <= MAX_PULSOS_POR_PASO) for (const ev of nuevas) pulsos.current.push({ nodoId: ev.sucursalId, t0: performance.now() })
    }
    vistos.current = actuales
  }, [eventos])

  // ───── Mapa y overlay ─────
  useEffect(() => {
    if (!divMapa.current) return
    let mapa: maplibregl.Map
    try {
      mapa = new maplibregl.Map({
        container: divMapa.current,
        style: ESTILO_CARTO,
        center: [-58.6, -34.55],
        zoom: 9,
        pitch: 50,
        bearing: -14,
        attributionControl: false,
        maxPitch: 70,
        canvasContextAttributes: { antialias: true },
      })
    } catch (e) {
      const mensaje = (e as Error).message
      requestAnimationFrame(() => setErrorMapa(mensaje))
      return
    }
    mapaRef.current = mapa
    mapa.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right")
    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
      onClick: (info) => {
        if (info.layer?.id === "arcos" && info.object && !datos.current.pieza) elegirTransferencia((info.object as DatoArco).id)
      },
      getCursor: ({ isHovering }) => (isHovering ? "pointer" : "grab"),
    })
    mapa.addControl(overlay)
    overlayRef.current = overlay
    mapa.on("style.load", () => teñirMapa(mapa))
    mapa.on("load", () => {
      encuadrar(0)
      setListo(true)
    })
    mapa.on("error", (e: { error?: { message?: string } }) => {
      // Sin red los tiles no cargan: el mapa queda en su color de fondo y los nodos siguen
      if (String(e.error?.message ?? "").includes("WebGL")) setErrorMapa("WebGL no disponible")
    })
    return () => {
      overlayRef.current = null
      mapaRef.current = null
      mapa.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function encuadrar(duracionMs: number, margen?: { top: number; bottom: number; left: number; right: number }) {
    const mapa = mapaRef.current
    const ns = datos.current.conCoordenadas
    if (!mapa || !ns.length) return Promise.resolve()
    const bounds = new maplibregl.LngLatBounds()
    for (const n of ns) bounds.extend([n.lng!, n.lat!])
    // Margen proporcional: en un celular 160 px por lado alejaría demasiado el mapa
    const { clientWidth: ancho, clientHeight: alto } = mapa.getContainer()
    const mx = Math.round(Math.min(160, ancho * 0.22))
    const my = Math.round(Math.min(140, alto * 0.16))
    mapa.fitBounds(bounds, { padding: margen ?? { top: my, bottom: my + 40, left: mx, right: mx }, pitch: 50, bearing: -14, duration: duracionMs, maxZoom: 13 })
    return finDelMovimiento(mapa, duracionMs)
  }

  // Control para las transiciones entre niveles
  useEffect(() => {
    if (!controlRef) return
    controlRef.current = {
      volarA: (id, duracionMs, opciones) => {
        const mapa = mapaRef.current
        const n = datos.current.conCoordenadas.find((x) => x.id === id)
        if (!mapa || !n) return Promise.resolve()
        mapa.flyTo({ center: [n.lng!, n.lat!], zoom: opciones?.zoom ?? 15.5, pitch: opciones?.pitch ?? 62, bearing: mapa.getBearing() - 18, duration: duracionMs, essential: true })
        return finDelMovimiento(mapa, duracionMs)
      },
      encuadrar,
      posicion: (id) => {
        const el = elementos.current.get(id)
        const caja = contenedor.current?.getBoundingClientRect()
        if (!el || !caja) return null
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2 - caja.left, y: r.top + r.height / 2 - caja.top }
      },
    }
  })

  // ───── Bucle de animación: capas de deck.gl y posición de los nodos ─────
  useEffect(() => {
    const reducir = reducirMovimiento()
    let marco = 0
    const paso = (t: number) => {
      marco = requestAnimationFrame(paso)
      if (document.hidden || !datos.current.activa) return
      const mapa = mapaRef.current
      const overlay = overlayRef.current
      const { red: r, conCoordenadas: ns, transferenciaId: sel, pieza: pz } = datos.current
      pulsos.current = pulsos.current.filter((p) => t - p.t0 < DURACION_PULSO)

      if (mapa && vistaRef.current === "mapa") {
        for (const n of ns) {
          const el = elementos.current.get(n.id)
          if (!el) continue
          const p = mapa.project([n.lng!, n.lat!])
          el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
        }
      }
      // En la repetición, los bultos en camino se ubican según la hora del cursor
      const ahoraMs = store.getState().reloj.t ?? Date.now()
      const factor = (i: number) => factorEncendido(encendido.current, t, i, reducir)
      if (overlay) overlay.setProps({ layers: vistaRef.current === "mapa" ? capasMapa(r, ns, t, ahoraMs, pulsos.current, sel, reducir, factor, pz?.flujos ?? null) : [] })
      if (vistaRef.current === "constelacion" && svgEnlaces.current) animarEnlaces(svgEnlaces.current, t, reducir)
    }
    marco = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(marco)
  }, [store])

  // ───── Cambio Mapa ⇄ Constelación con reacomodo ─────
  const constelacion = useMemo(() => {
    const caja = contenedor.current?.getBoundingClientRect()
    return layoutConstelacion(red.nodos, caja?.width ?? 1200, caja?.height ?? 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [red.nodos.length, vista])

  useEffect(() => {
    const reducir = reducirMovimiento()
    const duracion = reducir ? 0 : 0.9
    const mover = (el: HTMLElement, x: number, y: number, alTerminar?: () => void) => {
      const m = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(el.style.transform)
      const p = { x: m ? Number(m[1]) : x, y: m ? Number(m[2]) : y }
      gsap.to(p, { x, y, duration: duracion, ease: "power3.inOut", overwrite: true, onUpdate: () => (el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`), onComplete: alTerminar })
    }
    // Mientras dura el reacomodo, el bucle del mapa no mueve los nodos
    vistaRef.current = "constelacion"
    if (vista === "constelacion") {
      for (const p of constelacion) {
        const el = elementos.current.get(p.id)
        if (el) mover(el, p.x, p.y)
      }
      gsap.to(divMapa.current, { opacity: 0.08, duration: duracion, ease: "power2.out" })
      gsap.fromTo(svgEnlaces.current, { opacity: 0 }, { opacity: 1, duration: duracion, delay: duracion * 0.4 })
    } else {
      const mapa = mapaRef.current
      let pendientes = 0
      for (const n of red.nodos) {
        const el = elementos.current.get(n.id)
        if (!el || !mapa || n.lat === null || n.lng === null) continue
        const p = mapa.project([n.lng, n.lat])
        pendientes++
        mover(el, p.x, p.y, () => {
          if (--pendientes === 0) vistaRef.current = "mapa"
        })
      }
      if (!pendientes) vistaRef.current = "mapa"
      gsap.to(divMapa.current, { opacity: 1, duration: duracion, ease: "power2.out" })
      gsap.to(svgEnlaces.current, { opacity: 0, duration: duracion * 0.5 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista])

  const posConstelacion = new Map(constelacion.map((p) => [p.id, p]))
  const maxUnidades = Math.max(1, ...red.flujos.map((f) => f.unidades))
  const nodoResaltado = red.nodos.find((n) => n.id === resaltado) ?? null

  return (
    <div ref={contenedor} className="absolute inset-0 overflow-hidden" data-testid="forja-red" data-vista={vista} data-listo={listo || Boolean(errorMapa)}>
      {/* maplibre-gl.css pone position: relative en .maplibregl-map: el tamaño lo da el envoltorio */}
      <div className="absolute inset-0" aria-hidden>
        <div ref={divMapa} className="forja-mapa size-full" />
      </div>
      {errorMapa && <p className="absolute left-4 top-4 rounded-md bg-superficie px-3 py-2 text-xs text-acero">El mapa no se pudo cargar ({errorMapa}). Los datos siguen visibles.</p>}

      {/* Constelación: enlaces con grosor por volumen de transferencias */}
      <svg ref={svgEnlaces} className="pointer-events-none absolute inset-0 size-full opacity-0" aria-hidden>
        {red.flujos.map((f) => {
          const a = posConstelacion.get(f.desdeId)
          const b = posConstelacion.get(f.haciaId)
          if (!a || !b) return null
          return <line key={`${f.desdeId}>${f.haciaId}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3a4450" strokeWidth={grosorEnlace(f.unidades, maxUnidades)} strokeLinecap="round" />
        })}
        {red.transferencias
          .filter((t) => t.estado === "en_transito")
          .map((t) => {
            const a = posConstelacion.get(t.desdeId)
            const b = posConstelacion.get(t.haciaId)
            if (!a || !b) return null
            return (
              <g key={t.id} data-enlace data-x1={a.x} data-y1={a.y} data-x2={b.x} data-y2={b.y}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ff6a1f" strokeOpacity={0.55} strokeWidth={1.4} />
                {[0, 1, 2].map((k) => (
                  <circle key={k} r={2.2} fill="#ffb224" data-chispa={k} />
                ))}
              </g>
            )
          })}
      </svg>

      {/* Nodos */}
      <ul className="pointer-events-none absolute inset-0" aria-label="Sucursales en la red" data-entrada={entrada}>
        {red.nodos.map((n, i) => (
          <NodoRed
            key={n.id}
            indice={i}
            nodo={n}
            radio={vista === "constelacion" ? (posConstelacion.get(n.id)?.radio ?? 18) : 18}
            ultimaVenta={ultimaVenta[n.id]}
            resaltado={resaltado === n.id}
            marca={pieza ? (pieza.marcas[n.id] ?? null) : undefined}
            refElemento={(el) => {
              if (el) elementos.current.set(n.id, el)
              else elementos.current.delete(n.id)
            }}
            onResaltar={(si) => resaltar(si ? n.id : resaltado === n.id ? null : resaltado)}
            onEntrar={() => onEntrar?.(n.id)}
          />
        ))}
      </ul>

      {nodoResaltado && !sala && !pieza && <TarjetaNodo nodo={nodoResaltado} elemento={elementos.current.get(nodoResaltado.id) ?? null} contenedor={contenedor.current} />}
      {!sala && !pieza && <DetalleTransferencia red={red} id={transferenciaId} onCerrar={() => elegirTransferencia(null)} />}
      {!sala && !pieza && <SelectorArcos red={red} onElegir={elegirTransferencia} />}
    </div>
  )
}

// ───── Capas de deck.gl ─────

type DatoArco = { id: Id; path: Punto3D[]; color: [number, number, number, number]; ancho: number }
type DatoPunto = { posicion: Punto3D; color: [number, number, number, number]; radio: number }
type DatoTrazo = { desde: Punto3D; hasta: Punto3D; color: [number, number, number, number] }

const cacheArcos = new Map<string, Punto3D[]>()
function arcoDe(t: { desdeId: Id; haciaId: Id }, a: NodoForja, b: NodoForja) {
  const k = `${t.desdeId}>${t.haciaId}`
  let p = cacheArcos.get(k)
  if (!p) {
    p = puntosArco({ lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! })
    cacheArcos.set(k, p)
  }
  return p
}

/** Encendido escalonado (mismo ritmo que la animación CSS de los nodos): 0 apagado, 1 encendido. */
const ENCENDIDO_RETARDO = 150
const ENCENDIDO_PASO = 180
const ENCENDIDO_DURACION = 700
function factorEncendido(e: { modo: "normal" | "esperando" | "encender"; t0: number }, t: number, i: number, reducir: boolean) {
  if (e.modo === "normal" || reducir) return e.modo === "esperando" ? 0 : 1
  if (e.modo === "esperando") return 0
  return Math.min(1, Math.max(0, (t - e.t0 - ENCENDIDO_RETARDO - i * ENCENDIDO_PASO) / ENCENDIDO_DURACION))
}

/** Estelas que recorren un arco: marcan sentido y movimiento. */
function estelas(A: { lat: number; lng: number }, B: { lat: number; lng: number }, t: number, trazos: DatoTrazo[]) {
  for (let k = 0; k < 3; k++) {
    const fase = ((t / 2600 + k / 3) % 1 + 1) % 1
    for (let s = 0; s < 6; s++) {
      const u0 = Math.max(0, fase - s * 0.012)
      const u1 = Math.max(0, fase - (s + 1) * 0.012)
      const alfa = Math.round(210 * (1 - s / 6) * Math.sin(Math.PI * fase))
      trazos.push({ desde: puntoEnArco(A, B, u0), hasta: puntoEnArco(A, B, u1), color: [255, 178, 36, alfa] })
    }
  }
}

function capasMapa(
  red: RedForja,
  nodos: NodoForja[],
  t: number,
  ahoraMs: number,
  pulsos: Pulso[],
  seleccion: Id | null,
  reducir: boolean,
  encendido: (i: number) => number = () => 1,
  flujosPieza: FlujoVista[] | null = null,
) {
  const porId = new Map(nodos.map((n) => [n.id, n]))
  // Los arcos aparecen cuando ya se encendió la última sucursal
  const arcosVisibles = encendido(nodos.length - 1)
  const arcos: DatoArco[] = []
  const chispas: DatoPunto[] = []
  const trazos: DatoTrazo[] = []

  // Nivel 3: los flujos de la pieza (grosor por cantidad) en lugar de las transferencias del día
  const maxFlujo = Math.max(1, ...(flujosPieza ?? []).map((f) => f.cantidad))
  for (const f of flujosPieza ?? []) {
    const a = porId.get(f.desdeId)
    const b = porId.get(f.haciaId)
    if (!a || !b) continue
    arcos.push({ id: `pieza:${f.desdeId}>${f.haciaId}`, path: arcoDe(f, a, b), color: [255, 106, 31, 200], ancho: 1.5 + 3 * (f.cantidad / maxFlujo) })
    if (!reducir) estelas({ lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! }, t, trazos)
  }
  for (const tr of arcosVisibles > 0 && !flujosPieza ? red.transferencias : []) {
    const a = porId.get(tr.desdeId)
    const b = porId.get(tr.haciaId)
    if (!a || !b) continue
    const enTransito = tr.estado === "en_transito"
    const elegida = tr.id === seleccion
    arcos.push({ id: tr.id, path: arcoDe(tr, a, b), color: enTransito ? [255, 106, 31, elegida ? 230 : 150] : [58, 68, 80, 140], ancho: elegida ? 3 : enTransito ? 1.6 : 1 })
    if (!enTransito) continue
    const A = { lat: a.lat!, lng: a.lng! }
    const B = { lat: b.lat!, lng: b.lng! }
    // El bulto: donde va según la llegada estimada
    const avance = avanceTransito(tr.despachadaEn, tr.llegadaEstimada, ahoraMs)
    chispas.push({ posicion: puntoEnArco(A, B, avance), color: [255, 244, 224, 255], radio: 4 })
    if (!reducir) estelas(A, B, t, trazos)
  }

  // Brillo de cada nodo según su calor, más el golpe de cada venta
  const brillos: DatoPunto[] = []
  for (const [i, n] of nodos.entries()) {
    const luz = encendido(i)
    if (luz <= 0) continue
    const [r, g, b] = rgb255Calor(n.calor)
    const golpe = pulsos.filter((p) => p.nodoId === n.id).reduce((m, p) => Math.max(m, 1 - (t - p.t0) / DURACION_PULSO), 0)
    // Halo contenido: el color manda, no el tamaño (render de producto, no caricatura)
    const intensidad = 0.35 + 0.65 * Math.min(1, n.calor / 1.7)
    const base = 11 + Math.min(n.calor, 2) * 4
    for (const [escala, alfa] of [
      [1, 46],
      [1.8, 18],
      [2.8, 7],
    ] as const) {
      brillos.push({ posicion: [n.lng!, n.lat!, 0], color: [r, g, b, Math.round((alfa * intensidad + golpe * 50) * luz)], radio: base * escala * (1 + golpe * 0.4) })
    }
  }

  const aditivo = { blend: true, blendColorOperation: "add", blendColorSrcFactor: "src-alpha", blendColorDstFactor: "one", blendAlphaOperation: "add", blendAlphaSrcFactor: "one", blendAlphaDstFactor: "one-minus-src-alpha", depthCompare: "always", depthWriteEnabled: false } as const

  return [
    new ScatterplotLayer<DatoPunto>({ id: "brillo", data: brillos, getPosition: (d) => d.posicion, getFillColor: (d) => d.color, getRadius: (d) => d.radio, radiusUnits: "pixels", billboard: true, antialiasing: true, parameters: aditivo, updateTriggers: { getFillColor: t, getRadius: t } }),
    new PathLayer<DatoArco>({
      id: "arcos",
      data: arcos,
      getPath: (d) => d.path,
      getColor: (d) => d.color,
      getWidth: (d) => d.ancho,
      widthUnits: "pixels",
      capRounded: true,
      jointRounded: true,
      pickable: true,
      autoHighlight: true,
      highlightColor: [59, 110, 245, 200],
      parameters: { depthCompare: "always" },
      updateTriggers: { getColor: seleccion, getWidth: seleccion },
    }),
    new LineLayer<DatoTrazo>({ id: "estelas", data: trazos, getSourcePosition: (d) => d.desde, getTargetPosition: (d) => d.hasta, getColor: (d) => d.color, getWidth: 2, widthUnits: "pixels", parameters: aditivo }),
    new ScatterplotLayer<DatoPunto>({ id: "bultos", data: chispas, getPosition: (d) => d.posicion, getFillColor: (d) => d.color, getRadius: (d) => d.radio, radiusUnits: "pixels", billboard: true, stroked: true, getLineColor: [255, 106, 31, 200], lineWidthUnits: "pixels", getLineWidth: 1.5, parameters: { depthCompare: "always" } }),
  ]
}

/** Constelación: chispas que recorren los enlaces en tránsito (SVG). */
function animarEnlaces(svg: SVGSVGElement, t: number, reducir: boolean) {
  for (const g of svg.querySelectorAll<SVGGElement>("g[data-enlace]")) {
    const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((k) => Number(g.dataset[k]))
    for (const c of g.querySelectorAll<SVGCircleElement>("circle[data-chispa]")) {
      const k = Number(c.dataset.chispa)
      const fase = reducir ? 0.5 : (((t / 2600 + k / 3) % 1) + 1) % 1
      c.setAttribute("cx", String(x1 + (x2 - x1) * fase))
      c.setAttribute("cy", String(y1 + (y2 - y1) * fase))
      c.setAttribute("opacity", String(reducir ? (k === 0 ? 1 : 0) : Math.sin(Math.PI * fase)))
    }
  }
}

/** Lista accesible de transferencias (los arcos del mapa también se pueden tocar). */
function SelectorArcos({ red, onElegir }: { red: RedForja; onElegir: (id: Id) => void }) {
  const nombre = (id: Id) => red.nodos.find((n) => n.id === id)?.codigo ?? "—"
  const enTransito = red.transferencias.filter((t) => t.estado === "en_transito")
  if (!enTransito.length) return null
  return (
    <div className="pointer-events-auto absolute bottom-[4.5rem] left-4 flex max-w-[60%] flex-wrap gap-2" aria-label="Transferencias en tránsito">
      {enTransito.map((t) => (
        <button key={t.id} type="button" onClick={() => onElegir(t.id)} className="rounded-md border border-white/10 bg-hierro/85 px-2.5 py-1.5 font-mono text-[11px] text-niebla backdrop-blur hover:border-white/25 focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple" data-testid="transferencia-en-transito">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-brasa align-middle" aria-hidden />
          {nombre(t.desdeId)} → {nombre(t.haciaId)} · llega {hora(t.llegadaEstimada)}
        </button>
      ))}
    </div>
  )
}

function DetalleTransferencia({ red, id, onCerrar }: { red: RedForja; id: Id | null; onCerrar: () => void }) {
  const t = red.transferencias.find((x) => x.id === id)
  if (!t) return null
  const desde = red.nodos.find((n) => n.id === t.desdeId)
  const hacia = red.nodos.find((n) => n.id === t.haciaId)
  return (
    <aside className="pointer-events-auto absolute right-4 top-4 w-80 rounded-xl border border-white/10 bg-hierro/92 p-4 shadow-2xl backdrop-blur" aria-label="Detalle de la transferencia" data-testid="detalle-transferencia">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-acero">Transferencia</p>
          <p className="mt-1 font-heading text-lg font-extrabold">
            {desde?.nombre ?? "—"} → {hacia?.nombre ?? "—"}
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="rounded-md px-2 py-1 text-acero hover:text-niebla focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple" aria-label="Cerrar">
          ✕
        </button>
      </div>
      <p className="mt-2 font-mono text-xs text-niebla">
        {t.estado === "en_transito" ? `En camino · salió ${hora(t.despachadaEn)} · llega ~${hora(t.llegadaEstimada)}` : `Recibida ${hora(t.recibidaEn ?? t.llegadaEstimada)}`}
      </p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {t.items.map((i) => (
          <li key={i.productoId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <span className="truncate text-niebla/90">{i.nombre}</span>
            <span className="whitespace-nowrap font-mono text-acero">× {i.cantidad}</span>
          </li>
        ))}
      </ul>
      {t.motivo && <p className="mt-3 text-xs text-acero">{t.motivo}</p>}
    </aside>
  )
}
