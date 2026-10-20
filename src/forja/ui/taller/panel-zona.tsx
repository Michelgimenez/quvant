"use client"

import Link from "next/link"
import { ArrowLeft, ArrowUpRight, History, Route, X } from "lucide-react"
import { formatoCantidad, formatoPesosCorto } from "@/dominio/dinero"
import { NOMBRE_ESTADO_SERVICIO } from "@/dominio/servicio"
import type { EnlacesForja } from "@/forja/datos/fuente"
import type { BancoForja, NodoForja, RedForja, TallerForja } from "@/forja/dominio/modelo"
import type { Pieza } from "@/forja/dominio/pieza"
import { estadoBloque, nombreZona, type PlanoTaller, type TipoZona } from "@/forja/dominio/plano"
import { cn } from "@/lib/utils"
import { duracionHoras, hora } from "../formato"
import { useEscenaForja } from "../store"
import { LUZ_SERVICIO } from "./materiales"

type Props = {
  zona: { tipo: TipoZona; id: string | null }
  nodo: NodoForja
  taller: TallerForja
  plano: PlanoTaller
  red: RedForja
  enlaces: EnlacesForja | null
  /** Ir al nivel 3 (recorrido de un producto o historia de una máquina). */
  onPieza?: (p: Pieza) => void
}

/** Panel lateral del taller: los datos de Quvant de la zona y enlaces directos al módulo. */
export function PanelZona(props: Props) {
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  const { zona, nodo, plano } = props
  return (
    <aside
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex max-h-[58%] flex-col rounded-t-2xl border border-white/10 bg-negro/95 text-blanco shadow-2xl backdrop-blur md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[360px] md:rounded-2xl"
      aria-label={`${nombreZona(plano.rubro, zona.tipo)} de ${nodo.nombre}`}
      data-testid="panel-zona"
      data-zona={zona.tipo}
    >
      <header className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-acero">{nodo.nombre}</p>
          <h2 className="mt-0.5 font-heading text-lg font-extrabold leading-tight">{nombreZona(plano.rubro, zona.tipo)}</h2>
        </div>
        <button type="button" onClick={() => elegirZona(null)} className="rounded-md p-1.5 text-acero hover:text-blanco focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground" aria-label="Cerrar panel">
          <X className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
        {zona.tipo === "mostrador" && <PanelMostrador {...props} />}
        {zona.tipo === "deposito" && (zona.id ? <PanelRack {...props} rackId={zona.id} /> : <PanelDeposito {...props} />)}
        {zona.tipo === "servicio" && (zona.id ? <PanelOrden {...props} ordenId={zona.id} /> : <PanelServicio {...props} />)}
        {zona.tipo === "muelle" && <PanelMuelle {...props} />}
      </div>
    </aside>
  )
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-medium text-blanco hover:border-white/30 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground" data-testid="enlace-modulo">
      {children}
      <ArrowUpRight className="size-3.5 text-acero" aria-hidden />
    </Link>
  )
}

function Dato({ etiqueta, valor, alerta }: { etiqueta: string; valor: React.ReactNode; alerta?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-acero">{etiqueta}</dt>
      <dd className={cn("mt-0.5 font-mono text-[15px]", alerta ? "text-alerta" : "text-blanco")}>{valor}</dd>
    </div>
  )
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-acero first:mt-0">{children}</h3>
}

function Volver({ zona, texto }: { zona: TipoZona; texto: string }) {
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  return (
    <button type="button" onClick={() => elegirZona({ tipo: zona, id: null })} className="mb-3 inline-flex items-center gap-1 text-xs text-acero hover:text-blanco focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground">
      <ArrowLeft className="size-3.5" aria-hidden /> {texto}
    </button>
  )
}

function PanelMostrador({ taller, nodo, enlaces }: Props) {
  const ventas = taller.puestos.reduce((a, p) => a + p.ventasHoy, 0)
  const importe = taller.puestos.reduce((a, p) => a + p.importeHoy, 0)
  const cola = taller.puestos.reduce((a, p) => a + p.sinConexion, 0)
  return (
    <>
      <dl className="grid grid-cols-3 gap-3">
        <Dato etiqueta="Ventas hoy" valor={ventas} />
        <Dato etiqueta="Facturado" valor={formatoPesosCorto(importe)} />
        <Dato etiqueta="Presup. abiertos" valor={nodo.presupuestosAbiertos} />
      </dl>
      {cola > 0 && <p className="mt-3 rounded-md border border-alerta/40 px-2.5 py-2 text-xs text-alerta">{cola} ventas hechas sin conexión esperan sincronizar. Ya están registradas en el puesto y se envían solas al volver la red.</p>}
      <Titulo>Puestos</Titulo>
      <ul className="divide-y divide-white/8">
        {taller.puestos.map((p) => (
          <li key={p.puesto} className="flex items-baseline gap-3 py-2">
            <span className="w-16 shrink-0 font-heading font-bold">Puesto {p.puesto}</span>
            <span className={cn("shrink-0 font-mono text-[11px]", p.cajaAbierta ? "text-blanco" : "text-acero")}>{p.cajaAbierta ? "caja abierta" : "caja cerrada"}</span>
            <span className="ml-auto text-right font-mono text-[11px] text-acero">
              {p.ventasHoy} ventas · {formatoPesosCorto(p.importeHoy)}
              {p.ultimaVenta && <span className="block">última {hora(p.ultimaVenta)}</span>}
              {p.sinConexion > 0 && <span className="block text-alerta">{p.sinConexion} sin sincronizar</span>}
            </span>
          </li>
        ))}
      </ul>
      {enlaces && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Enlace href={enlaces.mostrador()}>Ir al mostrador</Enlace>
          <Enlace href={enlaces.presupuestos()}>Presupuestos</Enlace>
        </div>
      )}
    </>
  )
}

function PanelDeposito({ taller, nodo, enlaces }: Props) {
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  const resaltarRack = useEscenaForja((s) => s.resaltarRack)
  const productos = taller.racks.flatMap((r) => r.productos.map((p) => ({ ...p, rackId: r.id })))
  const faltantes = productos
    .map((p) => ({ ...p, estado: estadoBloque(p) }))
    .filter((p) => p.estado !== "normal")
    .sort((a, b) => (a.estado === b.estado ? a.cantidad / Math.max(1, a.minimo) - b.cantidad / Math.max(1, b.minimo) : a.estado === "sin_stock" ? -1 : 1))
  const sin = faltantes.filter((p) => p.estado === "sin_stock").length
  return (
    <>
      <dl className="grid grid-cols-3 gap-3">
        <Dato etiqueta="Racks" valor={taller.racks.length} />
        <Dato etiqueta="Críticos" valor={faltantes.length - sin} alerta={faltantes.length - sin > 0} />
        <Dato etiqueta="Sin stock" valor={sin} alerta={sin > 0} />
      </dl>
      <Leyenda />
      <Titulo>Para reponer</Titulo>
      {faltantes.length ? (
        <ul className="space-y-0.5">
          {faltantes.slice(0, 14).map((p) => (
            <li key={`${p.rackId}:${p.productoId}`}>
              <button
                type="button"
                onClick={() => elegirZona({ tipo: "deposito", id: p.rackId })}
                onMouseEnter={() => resaltarRack(p.rackId)}
                onMouseLeave={() => resaltarRack(null)}
                onFocus={() => resaltarRack(p.rackId)}
                onBlur={() => resaltarRack(null)}
                className="flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground"
                data-testid="faltante"
              >
                <span className="w-11 shrink-0 font-mono text-[10px] text-acero">{p.rackId}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{p.nombre}</span>
                <span className={cn("font-mono text-[11px]", p.estado === "sin_stock" ? "text-error" : "text-alerta")}>{p.estado === "sin_stock" ? "sin stock" : `${formatoCantidad(p.cantidad)} / ${p.minimo}`}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-acero">Todo el stock ubicado está por encima del mínimo.</p>
      )}
      {faltantes.length > 14 && <p className="mt-1 font-mono text-[10px] text-acero">y {faltantes.length - 14} más</p>}
      {enlaces && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Enlace href={enlaces.inventario(nodo.id, { stock: "bajo" })}>Bajo el mínimo en inventario</Enlace>
          <Enlace href={enlaces.inventario(nodo.id, { stock: "sin" })}>Sin stock</Enlace>
        </div>
      )}
    </>
  )
}

function PanelRack({ taller, nodo, enlaces, rackId, onPieza }: Props & { rackId: string }) {
  const rack = taller.racks.find((r) => r.id === rackId)
  if (!rack) return <Volver zona="deposito" texto="Todo el depósito" />
  const productos = [...rack.productos].sort((a, b) => a.estante - b.estante || a.nombre.localeCompare(b.nombre))
  return (
    <>
      <Volver zona="deposito" texto="Todo el depósito" />
      <p className="font-heading text-base font-bold">Rack {rack.id}</p>
      <p className="font-mono text-[11px] text-acero">
        {rack.categoriaNombre} · {formatoCantidad(rack.unidades)} unidades
      </p>
      <ul className="mt-3 divide-y divide-white/8" data-testid="productos-rack">
        {productos.map((p) => {
          const estado = estadoBloque(p)
          const fila = (
            <>
              <span className="w-7 shrink-0 font-mono text-[10px] text-acero">E{p.estante}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{p.nombre}</span>
                <span className="block font-mono text-[10px] text-acero">{p.sku}</span>
              </span>
              <span className={cn("text-right font-mono text-[12px]", estado === "sin_stock" ? "text-error" : estado === "critico" ? "text-alerta" : "text-blanco")}>
                {formatoCantidad(p.cantidad)}
                {p.minimo > 0 && <span className="block text-[10px] text-acero">mín. {p.minimo}</span>}
              </span>
            </>
          )
          return (
            <li key={p.productoId} className="flex items-center gap-1">
              {enlaces ? (
                <Link href={enlaces.inventario(nodo.id, { producto: p.productoId })} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1.5 hover:bg-white/5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground">
                  {fila}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5">{fila}</div>
              )}
              {onPieza && (
                <button
                  type="button"
                  onClick={() => onPieza({ tipo: "producto", id: p.productoId })}
                  className="shrink-0 rounded-md p-1.5 text-acero hover:bg-white/5 hover:text-blanco focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground"
                  aria-label={`Recorrido de ${p.nombre} por las sucursales`}
                  title="Recorrido por las sucursales"
                  data-testid="ver-recorrido"
                >
                  <Route className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {enlaces && (
        <div className="mt-4">
          <Enlace href={enlaces.inventario(nodo.id, { rack: rack.id })}>Ver el rack en inventario</Enlace>
        </div>
      )}
    </>
  )
}

function FilaOrden({ o }: { o: BancoForja }) {
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  return (
    <li>
      <button type="button" onClick={() => elegirZona({ tipo: "servicio", id: o.id })} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground" data-testid="fila-orden">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: LUZ_SERVICIO[o.estado].color }} aria-hidden />
        <span className="w-14 shrink-0 font-mono text-[11px]">{o.numero}</span>
        <span className="min-w-0 flex-1 truncate text-[13px]">{o.descripcion}</span>
        <span className={cn("shrink-0 font-mono text-[10px]", o.atrasada ? "text-alerta" : "text-acero")}>{duracionHoras(o.horasEnBanco)}</span>
      </button>
    </li>
  )
}

function PanelServicio({ taller, enlaces }: Props) {
  const enBanco = taller.bancos.filter((b) => b.estado !== "listo" && b.estado !== "sin_reparacion").sort((a, b) => b.horasEnBanco - a.horasEnBanco)
  const retiro = taller.bancos.filter((b) => b.estado === "listo" || b.estado === "sin_reparacion")
  const atrasadas = taller.bancos.filter((b) => b.atrasada).length
  return (
    <>
      <dl className="grid grid-cols-3 gap-3">
        <Dato etiqueta="En banco" valor={enBanco.length} />
        <Dato etiqueta="Para retirar" valor={retiro.length} />
        <Dato etiqueta="Atrasadas" valor={atrasadas} alerta={atrasadas > 0} />
      </dl>
      <Titulo>En los bancos</Titulo>
      {enBanco.length ? (
        <ul>
          {enBanco.map((o) => (
            <FilaOrden key={o.id} o={o} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-acero">No hay equipos en reparación.</p>
      )}
      {retiro.length > 0 && (
        <>
          <Titulo>Esperan que los retiren</Titulo>
          <ul>
            {retiro.map((o) => (
              <FilaOrden key={o.id} o={o} />
            ))}
          </ul>
        </>
      )}
      {enlaces && (
        <div className="mt-4">
          <Enlace href={enlaces.servicio()}>Abrir servicio técnico</Enlace>
        </div>
      )}
    </>
  )
}

function PanelOrden({ taller, enlaces, ordenId, onPieza }: Props & { ordenId: string }) {
  const o = taller.bancos.find((b) => b.id === ordenId)
  if (!o) return <Volver zona="servicio" texto="Todo el servicio técnico" />
  return (
    <>
      <Volver zona="servicio" texto="Todo el servicio técnico" />
      <p className="flex items-center gap-2 font-heading text-base font-bold">
        Orden {o.numero}
        {o.prioridad === "urgente" && <span className="rounded-[3px] border border-alerta/60 px-1 font-mono text-[10px] font-semibold text-alerta">URGENTE</span>}
      </p>
      <p className="text-[13px] text-blanco/90">{o.descripcion}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Dato
          etiqueta="Estado"
          valor={
            <span className="flex items-center gap-1.5 text-[13px]">
              <span className="size-1.5 rounded-full" style={{ background: LUZ_SERVICIO[o.estado].color }} aria-hidden />
              {NOMBRE_ESTADO_SERVICIO[o.estado]}
            </span>
          }
        />
        <Dato etiqueta="En el taller" valor={duracionHoras(o.horasEnBanco)} alerta={o.atrasada} />
      </dl>
      {o.atrasada && <p className="mt-3 text-xs text-alerta">Pasó la fecha prometida al cliente.</p>}
      {o.estado === "esperando_aprobacion" && <p className="mt-3 text-xs text-acero">El presupuesto de reparación espera la aprobación del cliente.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {enlaces && <Enlace href={enlaces.servicio(o.id)}>Abrir la orden</Enlace>}
        {onPieza && o.serie && (
          <button
            type="button"
            onClick={() => onPieza({ tipo: "maquina", id: o.serie })}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-medium text-blanco hover:border-white/30 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground"
            data-testid="ver-historia-maquina"
          >
            <History className="size-3.5 text-acero" aria-hidden /> Historia de la máquina
          </button>
        )}
      </div>
    </>
  )
}

const NOMBRE_ENTREGA: Record<string, string> = { pendiente: "Por salir", en_camino: "En camino", entregada: "Entregadas", fallida: "No se pudieron entregar" }

function PanelMuelle({ taller, red, enlaces }: Props) {
  const entregas = taller.muelle.filter((b) => b.tipo === "entrega")
  const transferencias = taller.muelle.filter((b) => b.tipo === "transferencia")
  const nombre = (id: string | null) => red.nodos.find((n) => n.id === id)?.nombre ?? "otra sucursal"
  return (
    <>
      <dl className="grid grid-cols-3 gap-3">
        <Dato etiqueta="Por salir" valor={entregas.filter((b) => b.estado === "pendiente").length} />
        <Dato etiqueta="En camino" valor={entregas.filter((b) => b.estado === "en_camino").length} />
        <Dato etiqueta="Transf. hoy" valor={transferencias.length} />
      </dl>
      {(["pendiente", "en_camino", "entregada", "fallida"] as const).map((estado) => {
        const lista = entregas.filter((b) => b.estado === estado)
        if (!lista.length) return null
        return (
          <section key={estado}>
            <Titulo>{NOMBRE_ENTREGA[estado]}</Titulo>
            <ul className="space-y-1">
              {lista.map((b) => (
                <li key={b.id} className="flex items-baseline gap-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">{b.detalle}</span>
                  {b.franja && <span className="font-mono text-[10px] text-acero">{b.franja}</span>}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {transferencias.length > 0 && (
        <>
          <Titulo>Transferencias que salieron hoy</Titulo>
          <ul className="space-y-1">
            {transferencias.map((b) => (
              <li key={b.id} className="flex items-baseline gap-2 text-[13px]">
                <span className="size-1.5 shrink-0 bg-blanco" aria-hidden />
                <span className="min-w-0 flex-1 truncate">A {nombre(b.destinoId)}</span>
                <span className="font-mono text-[10px] text-acero">{b.estado === "en_transito" ? "en tránsito" : "recibida"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {!entregas.length && !transferencias.length && <p className="mt-3 text-xs text-acero">Hoy no hay entregas ni transferencias desde esta sucursal.</p>}
      {enlaces && (
        <div className="mt-4">
          <Enlace href={enlaces.entregas()}>Ver entregas</Enlace>
        </div>
      )}
    </>
  )
}

/** Cómo leer el depósito: altura = stock relativo; frío, ámbar o hueco. */
export function Leyenda({ className }: { className?: string }) {
  return (
    <ul className={cn("mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-acero", className)} aria-label="Cómo leer el depósito">
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2 rounded-[1px] bg-gris-6" aria-hidden /> stock normal
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2 rounded-[1px] bg-alerta" aria-hidden /> en el mínimo
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-2.5 bg-error" aria-hidden /> hueco: sin stock
      </li>
    </ul>
  )
}
