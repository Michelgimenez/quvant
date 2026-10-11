"use client"

import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Id } from "@/dominio/tipos"
import { colorCalor } from "@/forja/dominio/calor"
import { grosorEnlace, layoutConstelacion } from "@/forja/dominio/constelacion"
import { avanceTransito, distanciaKm, proyeccion } from "@/forja/dominio/geo"
import type { EventoForja, RedForja } from "@/forja/dominio/modelo"
import type { VistaPieza } from "../pieza/vista"
import { ContextoEscena, useEscenaForja } from "../store"
import { NodoRed } from "./nodo-red"
import { TarjetaNodo } from "./tarjeta-nodo"
import { DetalleTransferencia, SelectorArcos } from "./transferencias"
import type { ControlRed } from "./universo-red"

type Margen = { top: number; bottom: number; left: number; right: number }
type Punto = { x: number; y: number }

const reducirMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Punto de control del arco: a un costado del tramo, proporcional a su largo. */
function control(a: Punto, b: Punto): Punto {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  return { x: mx + dy * 0.22, y: my - dx * 0.22 }
}
function enCurva(a: Punto, c: Punto, b: Punto, t: number): Punto {
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}

/**
 * Nivel 1 en 2D (movimiento reducido o equipos modestos): la misma red sobre
 * SVG, sin mapa base ni WebGL. Nodos, tarjetas, transferencias, constelación,
 * pieza y control de cámara (como zoom) funcionan igual que en el mapa.
 */
export function UniversoRed2D({
  red,
  eventos,
  controlRef,
  onEntrar,
  entrada = "normal",
  pieza = null,
}: {
  red: RedForja
  eventos: EventoForja[]
  controlRef?: React.RefObject<ControlRed | null>
  onEntrar?: (id: Id) => void
  activa?: boolean
  entrada?: "normal" | "esperando" | "encender"
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
  const elementos = useRef(new Map<Id, HTMLElement>())
  const [tam, setTam] = useState({ ancho: 1200, alto: 700 })
  const [margen, setMargen] = useState<Margen | null>(null)
  const [foco, setFoco] = useState<{ id: Id; escala: number } | null>(null)
  const [reducir] = useState(reducirMovimiento)
  // Los bultos en camino se ubican según la hora (la de la repetición, si está activa): basta con un paso por segundo
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(store.getState().reloj.t ?? Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [store])

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setTam({ ancho: e.contentRect.width, alto: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ───── Posiciones: proyección del mapa (dentro del margen pedido) o diseño de la constelación ─────
  const m = margen ?? { top: 70, bottom: 110, left: 60, right: 60 }
  const conCoordenadas = red.nodos.filter((n) => n.lat !== null && n.lng !== null)
  const claveGeo = conCoordenadas.map((n) => `${n.id}:${n.lat}:${n.lng}`).join("|")
  const proyectar = useMemo(() => {
    if (!conCoordenadas.length) return null
    const ancho = Math.max(80, tam.ancho - m.left - m.right)
    const alto = Math.max(80, tam.alto - m.top - m.bottom)
    const f = proyeccion(
      conCoordenadas.map((n) => ({ lat: n.lat!, lng: n.lng! })),
      ancho,
      alto,
      0.12,
    )
    return (p: { lat: number; lng: number }) => {
      const q = f(p)
      return { x: q.x + m.left, y: q.y + m.top }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveGeo, tam.ancho, tam.alto, m.top, m.bottom, m.left, m.right])
  const constelacion = useMemo(() => layoutConstelacion(red.nodos, tam.ancho, tam.alto), [red.nodos, tam.ancho, tam.alto])
  const posiciones = useMemo(() => {
    const p = new Map<Id, Punto & { radio: number }>()
    const porConst = new Map(constelacion.map((c) => [c.id, c]))
    red.nodos.forEach((n, i) => {
      if (vista === "constelacion") {
        const c = porConst.get(n.id)!
        p.set(n.id, { x: c.x, y: c.y, radio: c.radio })
      } else if (proyectar && n.lat !== null && n.lng !== null) p.set(n.id, { ...proyectar({ lat: n.lat, lng: n.lng }), radio: 18 })
      else p.set(n.id, { x: 80 + i * 140, y: tam.alto - 60, radio: 18 })
    })
    return p
  }, [red.nodos, vista, constelacion, proyectar, tam.alto])

  useLayoutEffect(() => {
    for (const [id, el] of elementos.current) {
      const p = posiciones.get(id)
      if (!p) continue
      el.style.transition = reducir ? "" : "transform 0.9s cubic-bezier(0.65, 0, 0.35, 1)"
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
    }
  }, [posiciones, reducir])

  // ───── Control de cámara: en 2D, un acercamiento con transform ─────
  useEffect(() => {
    if (!controlRef) return
    const esperar = (ms: number) => new Promise<void>((ok) => window.setTimeout(ok, reducir ? 0 : Math.min(ms, 900)))
    controlRef.current = {
      volarA: (id, duracionMs, opciones) => {
        setFoco({ id, escala: opciones?.zoom && opciones.zoom < 14 ? 1.7 : 2.3 })
        return esperar(duracionMs)
      },
      encuadrar: (duracionMs, nuevoMargen) => {
        setFoco(null)
        setMargen(nuevoMargen ?? null)
        return esperar(duracionMs)
      },
      posicion: (id) => {
        const el = elementos.current.get(id)
        const caja = contenedor.current?.getBoundingClientRect()
        if (!el || !caja) return null
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2 - caja.left, y: r.top + r.height / 2 - caja.top }
      },
    }
  })

  const centro = foco ? posiciones.get(foco.id) : null
  const transformacion = centro && foco ? `translate(${tam.ancho / 2 - centro.x * foco.escala}px, ${tam.alto / 2 - centro.y * foco.escala}px) scale(${foco.escala})` : "none"

  // ───── Pulso por venta: lo hace cada nodo; acá, la última de cada sucursal ─────
  const ultimaVenta = useMemo(() => {
    const u: Record<Id, string> = {}
    for (const ev of eventos) if (ev.tipo === "venta") u[ev.sucursalId] = ev.id
    return u
  }, [eventos])

  // ───── Arcos: transferencias del día o flujos de la pieza ─────
  const arcos = useMemo(() => {
    // En el mapa, arcos; en la constelación, tramos rectos (y solo lo que está en camino)
    const curva = (a: Punto, b: Punto) => (vista === "mapa" ? control(a, b) : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    if (pieza) {
      const max = Math.max(1, ...pieza.flujos.map((f) => f.cantidad))
      return pieza.flujos.flatMap((f) => {
        const a = posiciones.get(f.desdeId)
        const b = posiciones.get(f.haciaId)
        if (!a || !b) return []
        return [{ id: `pieza:${f.desdeId}>${f.haciaId}`, a, b, c: curva(a, b), color: "#ff6a1f", opacidad: 0.85, ancho: 1.5 + 3 * (f.cantidad / max), avance: null as number | null, vivo: true }]
      })
    }
    return red.transferencias.flatMap((t) => {
      const a = posiciones.get(t.desdeId)
      const b = posiciones.get(t.haciaId)
      if (!a || !b) return []
      const enTransito = t.estado === "en_transito"
      if (vista !== "mapa" && !enTransito) return []
      return [{ id: t.id, a, b, c: curva(a, b), color: enTransito ? "#ff6a1f" : "#3a4450", opacidad: enTransito ? 0.75 : 0.6, ancho: t.id === transferenciaId ? 3 : enTransito ? 1.6 : 1, avance: enTransito ? avanceTransito(t.despachadaEn, t.llegadaEstimada, ahora) : null, vivo: enTransito }]
    })
  }, [vista, pieza, red.transferencias, posiciones, transferenciaId, ahora])

  // Escala del mapa: cuántos km son 100 px (con dos sucursales alcanza)
  const escala = useMemo(() => {
    if (vista !== "mapa" || !proyectar || conCoordenadas.length < 2) return null
    const [a, b] = conCoordenadas
    const pa = proyectar({ lat: a.lat!, lng: a.lng! })
    const pb = proyectar({ lat: b.lat!, lng: b.lng! })
    const px = Math.hypot(pb.x - pa.x, pb.y - pa.y)
    if (px < 1) return null
    const km = (distanciaKm({ lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! }) / px) * 100
    const redondo = km >= 10 ? Math.round(km / 5) * 5 : Math.max(1, Math.round(km))
    return { km: redondo, px: (redondo / km) * 100 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, proyectar, claveGeo])

  const maxUnidades = Math.max(1, ...red.flujos.map((f) => f.unidades))
  const nodoResaltado = red.nodos.find((n) => n.id === resaltado) ?? null
  // La tarjeta consulta en su propio bucle dónde está el nodo (refs fuera del render)
  const buscarElemento = useCallback(() => elementos.current.get(resaltado ?? "") ?? null, [resaltado])
  const buscarContenedor = useCallback(() => contenedor.current, [])

  return (
    <div ref={contenedor} className="absolute inset-0 overflow-hidden bg-hierro" data-testid="forja-red" data-vista={vista} data-listo="true" data-modo="2d">
      <div className="absolute inset-0 origin-top-left" style={{ transform: transformacion, transition: reducir ? undefined : "transform 0.9s cubic-bezier(0.65, 0, 0.35, 1)" }}>
        <svg className="absolute inset-0 size-full" aria-hidden data-entrada={entrada}>
          <defs>
            <pattern id="forja-cuadricula" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#161b22" strokeWidth="1" />
            </pattern>
            {red.nodos.map((n) => (
              <radialGradient key={n.id} id={`halo-${n.id}`}>
                <stop offset="0%" stopColor={colorCalor(n.calor)} stopOpacity={0.55} />
                <stop offset="100%" stopColor={colorCalor(n.calor)} stopOpacity={0} />
              </radialGradient>
            ))}
          </defs>
          {vista === "mapa" && <rect width="100%" height="100%" fill="url(#forja-cuadricula)" />}
          {/* Constelación: enlaces con grosor por volumen de transferencias */}
          {vista === "constelacion" &&
            red.flujos.map((f) => {
              const a = posiciones.get(f.desdeId)
              const b = posiciones.get(f.haciaId)
              if (!a || !b) return null
              return <line key={`${f.desdeId}>${f.haciaId}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3a4450" strokeWidth={grosorEnlace(f.unidades, maxUnidades)} strokeLinecap="round" />
            })}
          {/* Halos de calor, fijos */}
          {red.nodos.map((n, i) => {
            const p = posiciones.get(n.id)
            if (!p) return null
            const radio = 26 + Math.min(n.calor, 2) * 10
            return <circle key={n.id} className="forja-halo" cx={p.x} cy={p.y} r={radio} fill={`url(#halo-${n.id})`} style={{ ["--i" as string]: i }} />
          })}
          {arcos.map((a) => {
            const d = `M ${a.a.x} ${a.a.y} Q ${a.c.x} ${a.c.y} ${a.b.x} ${a.b.y}`
            const bulto = a.avance !== null ? enCurva(a.a, a.c, a.b, a.avance) : null
            return (
              <g key={a.id}>
                <path d={d} fill="none" stroke={a.color} strokeOpacity={a.opacidad} strokeWidth={a.ancho} strokeLinecap="round" />
                {/* Sentido: un trazo que corre sobre el arco (salvo con movimiento reducido) */}
                {a.vivo && !reducir && <path d={d} fill="none" stroke="#ffb224" strokeOpacity={0.8} strokeWidth={1.2} strokeDasharray="4 18" className="forja-flujo" />}
                {bulto && <circle cx={bulto.x} cy={bulto.y} r={4} fill="#fff4e0" stroke="#ff6a1f" strokeWidth={1.5} />}
                {!pieza && (
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => elegirTransferencia(a.id)}
                  />
                )}
              </g>
            )
          })}
        </svg>

        <ul className="pointer-events-none absolute inset-0" aria-label="Sucursales en la red" data-entrada={entrada}>
          {red.nodos.map((n, i) => (
            <NodoRed
              key={n.id}
              indice={i}
              nodo={n}
              radio={posiciones.get(n.id)?.radio ?? 18}
              ultimaVenta={ultimaVenta[n.id]}
              resaltado={resaltado === n.id}
              marca={pieza ? (pieza.marcas[n.id] ?? null) : undefined}
              refElemento={(el) => {
                if (el) {
                  elementos.current.set(n.id, el)
                  const p = posiciones.get(n.id)
                  if (p) el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
                } else elementos.current.delete(n.id)
              }}
              onResaltar={(si) => resaltar(si ? n.id : resaltado === n.id ? null : resaltado)}
              onEntrar={() => onEntrar?.(n.id)}
            />
          ))}
        </ul>
      </div>

      {escala && (
        <div className="pointer-events-none absolute bottom-[4.5rem] right-4 flex flex-col items-end gap-1 font-mono text-[10px] text-acero" aria-hidden>
          <span>{escala.km} km</span>
          <span className="h-1.5 border-x border-b border-acero/60" style={{ width: escala.px }} />
        </div>
      )}
      {nodoResaltado && !sala && !pieza && <TarjetaNodo nodo={nodoResaltado} elemento={buscarElemento} contenedor={buscarContenedor} />}
      {!sala && !pieza && <DetalleTransferencia red={red} id={transferenciaId} onCerrar={() => elegirTransferencia(null)} />}
      {!sala && !pieza && <SelectorArcos red={red} onElegir={elegirTransferencia} />}
    </div>
  )
}
