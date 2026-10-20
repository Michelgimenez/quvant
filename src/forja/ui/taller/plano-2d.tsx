"use client"

import { useEffect, useRef, useState } from "react"
import { formatoCantidad } from "@/dominio/dinero"
import type { EventoForja } from "@/forja/dominio/modelo"
import { ANCHO, FONDO, rellenoBloque, tamanoEquipo, type PlanoTaller, type RackPlano, type Rect } from "@/forja/dominio/plano"
import { cn } from "@/lib/utils"
import { useEscenaForja } from "../store"
import { COLOR, HORAS_BARRA_LLENA, LUZ_SERVICIO } from "./materiales"

const GROSOR = 0.25
const NO_ESCALA = { vectorEffect: "non-scaling-stroke" } as const

/**
 * Nivel 2 en 2D: el plano de planta de la sucursal visto desde arriba, con
 * los mismos datos que el corte 3D (racks, bancos, puestos, muelle) y las
 * mismas interacciones (contorno al pasar, panel al hacer clic).
 */
export function Plano2D({
  plano,
  sucursalId,
  eventos,
  enTransito,
  margenDerecho,
  margenAbajo,
  onListo,
}: {
  plano: PlanoTaller
  sucursalId: string
  eventos: EventoForja[]
  enTransito: number
  /** Lugar que ocupan el panel y la barra de zonas: el plano se acomoda en el resto. */
  margenDerecho: number
  margenAbajo: number
  onListo: () => void
}) {
  const zona = useEscenaForja((s) => s.zona)
  const zonaResaltada = useEscenaForja((s) => s.zonaResaltada)
  const rackResaltado = useEscenaForja((s) => s.rackResaltado)
  const resaltarZona = useEscenaForja((s) => s.resaltarZona)
  const resaltarRack = useEscenaForja((s) => s.resaltarRack)
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  const caja = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const pantallas = useRef(new Map<number, SVGRectElement>())

  useEffect(() => {
    onListo()
    // Solo al montar: el plano 2D no tiene nada que cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cada venta nueva enciende un momento la pantalla de su puesto (opacity; nada si se pide movimiento reducido)
  const vistos = useRef<Set<string> | null>(null)
  useEffect(() => {
    const propios = eventos.filter((e) => e.sucursalId === sucursalId)
    if (!vistos.current) {
      vistos.current = new Set(propios.map((e) => e.id))
      return
    }
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    for (const ev of propios) {
      if (vistos.current.has(ev.id)) continue
      vistos.current.add(ev.id)
      if (ev.tipo === "venta" && !reducir) pantallas.current.get(ev.puesto)?.animate([{ opacity: 1 }, { opacity: 0.35 }], { duration: 900, easing: "ease-out" })
    }
  }, [eventos, sucursalId])

  const x0 = -ANCHO / 2
  const z0 = -FONDO / 2
  const rack = plano.racks.find((r) => r.rack.id === rackResaltado) ?? null
  const marcada = (tipo: string) => zonaResaltada === tipo || zona?.tipo === tipo
  const posCursor = (e: React.PointerEvent) => {
    const r = caja.current?.getBoundingClientRect()
    if (r) setCursor({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div ref={caja} className="absolute left-0 top-0" style={{ right: margenDerecho, bottom: margenAbajo }} data-modo="2d">
      <svg viewBox={`${x0 - 0.8} ${z0 - 0.8} ${ANCHO + 1.6} ${FONDO + 1.6}`} className="size-full" role="img" aria-label="Plano de planta de la sucursal">
        {/* Losa y paredes (fondo e izquierda, con el portón del muelle) */}
        <rect x={x0 - 0.4} y={z0 - 0.4} width={ANCHO + 0.8} height={FONDO + 0.8} fill={COLOR.losa} />
        <rect x={x0 - GROSOR} y={z0 - GROSOR} width={ANCHO + GROSOR} height={GROSOR} fill={COLOR.corte} />
        <rect x={x0 - GROSOR} y={z0} width={GROSOR} height={plano.porton.z - plano.porton.ancho / 2 - z0} fill={COLOR.corte} />
        <rect x={x0 - GROSOR} y={plano.porton.z + plano.porton.ancho / 2} width={GROSOR} height={FONDO / 2 - (plano.porton.z + plano.porton.ancho / 2)} fill={COLOR.corte} />

        {/* Zonas: contorno --temple al pasar o al elegir */}
        {plano.zonas.map((z) => (
          <g key={z.tipo}>
            <rect
              x={z.x}
              y={z.z}
              width={z.ancho}
              height={z.fondo}
              fill={COLOR.piso}
              stroke={marcada(z.tipo) ? COLOR.temple : COLOR.lineaPiso}
              strokeWidth={marcada(z.tipo) ? 1.6 : 1}
              {...NO_ESCALA}
              className="cursor-pointer"
              onPointerEnter={() => resaltarZona(z.tipo)}
              onPointerLeave={() => resaltarZona(null)}
              onClick={() => elegirZona({ tipo: z.tipo, id: null })}
            />
            <text x={z.x + 0.1} y={z.z + z.fondo + 0.5} fontSize={0.4} letterSpacing={0.07} fill={marcada(z.tipo) ? COLOR.blancoCaliente : COLOR.acero} className="pointer-events-none font-mono uppercase">
              {z.nombre}
            </text>
          </g>
        ))}

        {/* Depósito: cada rack con su llenado (frío o ámbar) y el hueco marcado si falta algo */}
        {plano.secciones.map((s) => (
          <text key={s.categoria} x={s.x} y={s.z + 0.05} fontSize={0.28} fill={COLOR.acero} opacity={0.6} className="pointer-events-none font-mono">
            {s.categoria}
          </text>
        ))}
        {plano.racks.map((r) => (
          <Rack
            key={r.rack.id}
            r={r}
            resaltado={rackResaltado === r.rack.id || (zona?.tipo === "deposito" && zona.id === r.rack.id)}
            onEntrar={(e) => {
              resaltarRack(r.rack.id)
              resaltarZona("deposito")
              posCursor(e)
            }}
            onMover={posCursor}
            onSalir={() => resaltarRack(null)}
            onElegir={() => elegirZona({ tipo: "deposito", id: r.rack.id })}
          />
        ))}

        {/* Mostrador: un puesto por caja; ámbar y cola si vendió sin conexión */}
        {plano.mostrador && <rect x={plano.mostrador.x} y={plano.mostrador.z} width={plano.mostrador.ancho} height={plano.mostrador.fondo} fill={COLOR.mueble} stroke={COLOR.tapa} strokeWidth={1} {...NO_ESCALA} className="pointer-events-none" />}
        {plano.puestos.map((p) => (
          <g key={p.puesto.puesto} className="pointer-events-none">
            <rect
              ref={(el) => {
                if (el) pantallas.current.set(p.puesto.puesto, el)
                else pantallas.current.delete(p.puesto.puesto)
              }}
              x={p.x - 0.28}
              y={p.z - 0.2}
              width={0.56}
              height={0.3}
              rx={0.04}
              fill={p.puesto.cajaAbierta ? COLOR.pantalla : COLOR.tapa}
              opacity={p.puesto.cajaAbierta ? 0.35 : 1}
            />
            <text x={p.x} y={p.z + 0.62} fontSize={0.3} textAnchor="middle" fill={COLOR.acero} className="font-mono">
              P{p.puesto.puesto} · {p.puesto.ventasHoy}
            </text>
            {p.puesto.sinConexion > 0 && (
              <>
                <circle cx={p.x + 0.5} cy={p.z - 0.05} r={0.12} fill={COLOR.chispa} />
                <text x={p.x + 0.7} y={p.z} fontSize={0.3} fill={COLOR.chispa} className="font-mono" data-testid="cola-sin-conexion">
                  {p.puesto.sinConexion} sin sincronizar
                </text>
              </>
            )}
          </g>
        ))}

        {/* Servicio técnico: estante de retiro y bancos con su orden */}
        <rect x={plano.estanteRetiro.x} y={plano.estanteRetiro.z} width={plano.estanteRetiro.ancho} height={plano.estanteRetiro.fondo} fill={COLOR.estante} className="pointer-events-none" />
        {plano.retiro.map((r) => (
          <rect key={r.banco.id} x={r.x - 0.16} y={r.z - 0.14 + (r.y > 0.5 ? 0.06 : -0.06)} width={0.32} height={0.24} fill={r.banco.estado === "listo" ? COLOR.blancoCaliente : COLOR.equipo} opacity={r.banco.estado === "listo" ? 0.8 : 0.6} className="cursor-pointer" onClick={() => elegirZona({ tipo: "servicio", id: r.banco.id })} />
        ))}
        {plano.bancos.map((b, i) => (
          <Banco key={b.banco?.id ?? `libre-${i}`} b={b} elegido={zona?.tipo === "servicio" && zona.id === b.banco?.id} onElegir={() => b.banco && elegirZona({ tipo: "servicio", id: b.banco.id })} />
        ))}

        {/* Carga y entregas: un palet por entrega pendiente */}
        {plano.palets.map((p) => (
          <g key={p.bulto.id} className="cursor-pointer" onClick={() => elegirZona({ tipo: "muelle", id: p.bulto.id })}>
            <rect x={p.x - 0.6} y={p.z - 0.5} width={1.2} height={1} fill={COLOR.palet} />
            {Array.from({ length: p.cajas }, (_, i) => (
              <rect key={i} x={p.x - 0.52 + (i % 2) * 0.54} y={p.z - 0.42 + Math.floor(i / 2) * 0.45} width={0.48} height={0.4} fill={COLOR.caja} />
            ))}
          </g>
        ))}
        {!plano.palets.length && <Nota r={plano.zonas.find((z) => z.tipo === "muelle")!} texto="Sin entregas pendientes" />}

        {/* Portón: brasa si hay mercadería en camino (encima de las zonas) */}
        <line x1={x0} y1={plano.porton.z - plano.porton.ancho / 2} x2={x0} y2={plano.porton.z + plano.porton.ancho / 2} stroke={enTransito ? COLOR.blancoCaliente : COLOR.lineaPiso} strokeWidth={2} {...NO_ESCALA} className="pointer-events-none" />
        {enTransito > 0 && (
          <text x={x0 + 0.3} y={plano.porton.z - plano.porton.ancho / 2 + 0.5} fontSize={0.38} fill={COLOR.blancoCaliente} className="pointer-events-none font-mono" data-testid="muelle-en-transito">
            ← {enTransito} en tránsito
          </text>
        )}
      </svg>
      {rack && cursor && <TooltipRack2D r={rack} x={cursor.x} y={cursor.y} />}
    </div>
  )
}

function Nota({ r, texto }: { r: Rect; texto: string }) {
  return (
    <text x={r.x + r.ancho / 2} y={r.z + r.fondo / 2} fontSize={0.36} textAnchor="middle" fill={COLOR.acero} opacity={0.7} className="pointer-events-none font-mono">
      {texto}
    </text>
  )
}

function Rack({ r, resaltado, onEntrar, onMover, onSalir, onElegir }: { r: RackPlano; resaltado: boolean; onEntrar: (e: React.PointerEvent) => void; onMover: (e: React.PointerEvent) => void; onSalir: () => void; onElegir: () => void }) {
  const ps = r.rack.productos
  const relleno = ps.length ? ps.reduce((a, p) => a + rellenoBloque(p), 0) / ps.length : 0
  const critico = ps.some((p) => p.cantidad > 0 && p.minimo > 0 && p.cantidad <= p.minimo)
  const hueco = ps.some((p) => p.cantidad <= 0)
  return (
    <g
      className="cursor-pointer"
      onPointerEnter={onEntrar}
      onPointerMove={onMover}
      onPointerLeave={onSalir}
      onClick={(e) => {
        e.stopPropagation()
        onElegir()
      }}
      data-rack={r.rack.id}
    >
      <rect x={r.x - r.ancho / 2} y={r.z - r.fondo / 2} width={r.ancho} height={r.fondo} fill={COLOR.estante} stroke={resaltado ? COLOR.temple : hueco ? COLOR.ascua : "none"} strokeWidth={resaltado ? 1.6 : 1.2} {...NO_ESCALA} />
      <rect x={r.x - r.ancho / 2} y={r.z - r.fondo / 2} width={Math.max(0.04, r.ancho * relleno)} height={r.fondo} fill={critico ? COLOR.chispa : COLOR.frio} opacity={critico ? 0.85 : 0.9} className="pointer-events-none" />
    </g>
  )
}

function Banco({ b, elegido, onElegir }: { b: PlanoTaller["bancos"][number]; elegido: boolean; onElegir: () => void }) {
  const orden = b.banco
  const luz = orden ? LUZ_SERVICIO[orden.estado] : null
  const [ax, , az] = orden ? tamanoEquipo(orden.id) : [0, 0, 0]
  const tiempo = orden ? Math.min(1, orden.horasEnBanco / HORAS_BARRA_LLENA) : 0
  return (
    <g className={cn(orden && "cursor-pointer")} onClick={onElegir}>
      <rect x={b.x - 1} y={b.z - 0.45} width={2} height={0.9} fill={COLOR.tapa} stroke={elegido ? COLOR.temple : "none"} strokeWidth={1.6} {...NO_ESCALA} />
      {orden && luz && (
        <>
          <rect x={b.x - 0.2 - ax / 2} y={b.z - 0.08 - az / 2} width={ax} height={az} fill={COLOR.equipo} />
          <rect x={b.x - 1} y={b.z + 0.39} width={2} height={0.06} fill={luz.color} />
          <rect x={b.x - 0.9} y={b.z + 0.28} width={1.8 * Math.max(0.02, tiempo)} height={0.05} fill={orden.atrasada ? COLOR.chispa : COLOR.acero} />
          <text x={b.x + 0.55} y={b.z - 0.12} fontSize={0.3} fill={COLOR.blancoCaliente} className="font-mono" data-testid="banco-orden">
            {orden.numero}
            {orden.prioridad === "urgente" ? " !" : ""}
          </text>
        </>
      )}
    </g>
  )
}

function TooltipRack2D({ r, x, y }: { r: RackPlano; x: number; y: number }) {
  const productos = [...r.rack.productos].sort((a, b) => a.estante - b.estante)
  return (
    <div className="pointer-events-none absolute z-10 w-64 rounded-lg border border-white/10 bg-negro/95 p-3 text-blanco shadow-2xl" style={{ left: x + 14, top: y + 14 }} data-testid="tooltip-rack" role="tooltip">
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-heading text-sm font-bold">Rack {r.rack.id}</span>
        <span className="truncate font-mono text-[10px] text-acero">{r.rack.categoriaNombre}</span>
      </p>
      <ul className="mt-2 space-y-1">
        {productos.slice(0, 8).map((p) => (
          <li key={p.productoId} className="flex items-baseline gap-2 text-[11px]">
            <span className="w-6 shrink-0 font-mono text-[10px] text-acero">E{p.estante}</span>
            <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
            <span className={cn("font-mono", p.cantidad <= 0 ? "text-error" : p.minimo > 0 && p.cantidad <= p.minimo ? "text-alerta" : "text-blanco")}>{p.cantidad <= 0 ? "sin stock" : formatoCantidad(p.cantidad)}</span>
          </li>
        ))}
      </ul>
      {productos.length > 8 && <p className="mt-1 font-mono text-[10px] text-acero">y {productos.length - 8} más</p>}
    </div>
  )
}
