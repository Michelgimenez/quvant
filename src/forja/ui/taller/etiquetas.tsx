"use client"

import { formatoCantidad } from "@/dominio/dinero"
import { NOMBRE_ESTADO_SERVICIO } from "@/dominio/servicio"
import type { BancoForja, TallerForja } from "@/forja/dominio/modelo"
import { ALTO_PARED, ANCHO, tamanoEquipo, zonaDe, type PlanoTaller, type TipoZona } from "@/forja/dominio/plano"
import { cn } from "@/lib/utils"
import { useEscenaForja } from "../store"
import { LUZ_SERVICIO } from "./materiales"

/**
 * Etiquetas del taller: elementos del DOM (nítidos, con las fuentes de la app)
 * sobre el lienzo. La escena 3D proyecta cada ancla en cada cuadro y mueve su
 * elemento con transform; React no vuelve a renderizar por eso.
 */
export type Punto3 = [number, number, number]
export type Ancla = { id: string; pos: Punto3 } & (
  | { tipo: "zona"; zona: TipoZona; texto: string }
  | { tipo: "seccion"; texto: string; titulo: string }
  | { tipo: "banco"; banco: BancoForja }
  | { tipo: "cola"; n: number }
  | { tipo: "transito"; n: number }
  | { tipo: "nota"; texto: string }
  /** Solo posición: ahí se ubica el detalle del rack bajo el cursor. */
  | { tipo: "rack" }
)

export const ALTO_BANCO = 0.9
export const ALTO_MOSTRADOR = 1

export function anclasTaller(plano: PlanoTaller, taller: TallerForja): Ancla[] {
  const anclas: Ancla[] = []
  // El nombre de cada zona va en el pasillo, frente a su borde delantero
  for (const z of plano.zonas) anclas.push({ id: `zona:${z.tipo}`, tipo: "zona", zona: z.tipo, texto: z.nombre, pos: [z.x + 0.1, 0.02, z.z + z.fondo + 0.42] })
  for (const s of plano.secciones) anclas.push({ id: `seccion:${s.categoria}`, tipo: "seccion", texto: s.categoria, titulo: s.nombre, pos: [s.x, 0.02, s.z] })
  for (const r of plano.racks) anclas.push({ id: `rack:${r.rack.id}`, tipo: "rack", pos: [r.x, r.alto + 0.15, r.z] })
  for (const b of plano.bancos) {
    if (!b.banco) continue
    const [, ay] = tamanoEquipo(b.banco.id)
    anclas.push({ id: `banco:${b.banco.id}`, tipo: "banco", banco: b.banco, pos: [b.x - 0.2, ALTO_BANCO + ay + 0.2, b.z - 0.08] })
  }
  for (const p of plano.puestos) if (p.puesto.sinConexion > 0) anclas.push({ id: `cola:${p.puesto.puesto}`, tipo: "cola", n: p.puesto.sinConexion, pos: [p.x + 0.42, ALTO_MOSTRADOR + 0.85, p.z - 0.02] })
  const enTransito = taller.muelle.filter((b) => b.tipo === "transferencia" && b.estado === "en_transito").length
  // Sobre el portón, arriba del corte de la pared
  if (enTransito) anclas.push({ id: "transito", tipo: "transito", n: enTransito, pos: [-ANCHO / 2 - 0.12, ALTO_PARED + 0.15, plano.porton.z] })
  const servicio = zonaDe(plano, "servicio")
  if (servicio && !plano.retiro.length && plano.bancos.every((b) => !b.banco)) anclas.push({ id: "nota:servicio", tipo: "nota", texto: "Sin órdenes activas", pos: [servicio.x + servicio.ancho / 2, 0.05, servicio.z + servicio.fondo / 2 + 1] })
  const muelle = zonaDe(plano, "muelle")
  if (muelle && !plano.palets.length) anclas.push({ id: "nota:muelle", tipo: "nota", texto: "Sin entregas pendientes", pos: [muelle.x + muelle.ancho / 2 + 1, 0.05, muelle.z + muelle.fondo / 2] })
  return anclas
}

export function CapaEtiquetas({ anclas, plano, elementos }: { anclas: Ancla[]; plano: PlanoTaller; elementos: React.RefObject<Map<string, HTMLElement>> }) {
  const zonaResaltada = useEscenaForja((s) => s.zonaResaltada)
  const zona = useEscenaForja((s) => s.zona)
  const rackResaltado = useEscenaForja((s) => s.rackResaltado)
  const registrar = (id: string) => (el: HTMLElement | null) => {
    if (el) elementos.current.set(id, el)
    else elementos.current.delete(id)
  }
  const rack = plano.racks.find((r) => r.rack.id === rackResaltado)
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {anclas.map((a) => {
        if (a.tipo === "rack") return null
        return (
          <span key={a.id} ref={registrar(a.id)} className="absolute left-0 top-0 will-change-transform" style={{ transform: "translate3d(-9999px, 0, 0)" }} aria-hidden>
            <Etiqueta a={a} activa={a.tipo === "zona" && (zonaResaltada === a.zona || zona?.tipo === a.zona)} />
          </span>
        )
      })}
      {rack && (
        <div key={rack.rack.id} ref={registrar(`rack:${rack.rack.id}`)} className="absolute left-0 top-0 z-10" style={{ transform: "translate3d(-9999px, 0, 0)" }}>
          <TooltipRack rack={rack.rack} />
        </div>
      )}
    </div>
  )
}

function Etiqueta({ a, activa }: { a: Ancla; activa: boolean }) {
  switch (a.tipo) {
    case "zona":
      return <span className={cn("block -translate-y-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em]", activa ? "text-niebla" : "text-acero/75")}>{a.texto}</span>
    case "seccion":
      return (
        <span className="block -translate-y-1/2 whitespace-nowrap font-mono text-[9px] tracking-[0.14em] text-acero/60" title={a.titulo}>
          {a.texto}
        </span>
      )
    case "banco":
      return (
        <span className="flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-[3px] bg-hierro/80 px-1 font-mono text-[10px] text-niebla" data-testid="banco-orden" title={NOMBRE_ESTADO_SERVICIO[a.banco.estado]}>
          <span className="size-1.5 rounded-full" style={{ background: LUZ_SERVICIO[a.banco.estado].color }} />
          {a.banco.numero}
          {a.banco.prioridad === "urgente" && <span className="text-chispa">!</span>}
        </span>
      )
    case "cola":
      return (
        <span className="block -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[3px] border border-chispa/60 bg-hierro/85 px-1.5 py-0.5 font-mono text-[10px] text-chispa" data-testid="cola-sin-conexion">
          {a.n} sin sincronizar
        </span>
      )
    case "transito":
      return (
        <span className="block -translate-y-full whitespace-nowrap font-mono text-[10px] text-brasa" data-testid="muelle-en-transito">
          ← {a.n} en tránsito
        </span>
      )
    case "nota":
      return <span className="block -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-acero/70">{a.texto}</span>
    default:
      return null
  }
}

function TooltipRack({ rack }: { rack: PlanoTaller["racks"][number]["rack"] }) {
  const productos = [...rack.productos].sort((a, b) => a.estante - b.estante)
  return (
    <div className="w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-hierro/95 p-3 text-niebla shadow-2xl" data-testid="tooltip-rack" role="tooltip">
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-heading text-sm font-bold">Rack {rack.id}</span>
        <span className="truncate font-mono text-[10px] text-acero">{rack.categoriaNombre}</span>
      </p>
      <ul className="mt-2 space-y-1">
        {productos.slice(0, 8).map((p) => {
          const alerta = p.cantidad <= 0 || (p.minimo > 0 && p.cantidad <= p.minimo)
          return (
            <li key={p.productoId} className="flex items-baseline gap-2 text-[11px]">
              <span className="w-6 shrink-0 font-mono text-[10px] text-acero">E{p.estante}</span>
              <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
              <span className={cn("font-mono", p.cantidad <= 0 ? "text-brasa" : alerta ? "text-chispa" : "text-niebla")}>{p.cantidad <= 0 ? "sin stock" : formatoCantidad(p.cantidad)}</span>
            </li>
          )
        })}
      </ul>
      {productos.length > 8 && <p className="mt-1 font-mono text-[10px] text-acero">y {productos.length - 8} más</p>}
    </div>
  )
}
