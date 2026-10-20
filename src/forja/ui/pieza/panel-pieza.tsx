"use client"

import Link from "next/link"
import { ArrowUpRight, X } from "lucide-react"
import { formatoCantidad, formatoPesosCorto } from "@/dominio/dinero"
import { NOMBRE_ESTADO_SERVICIO } from "@/dominio/servicio"
import type { Id, TipoMovimiento } from "@/dominio/tipos"
import type { DatosPieza, EnlacesForja } from "@/forja/datos/fuente"
import type { RedForja } from "@/forja/dominio/modelo"
import type { HistoriaMaquina, MovimientoPieza, RecorridoProducto } from "@/forja/dominio/pieza"
import { cn } from "@/lib/utils"
import { hora } from "../formato"
import { LUZ_SERVICIO } from "../taller/materiales"

const NOMBRE_MOVIMIENTO: Record<TipoMovimiento, string> = {
  venta: "Venta",
  anulacion: "Anulación de venta",
  compra: "Compra recibida",
  ajuste: "Ajuste",
  conteo: "Conteo",
  transferencia_salida: "Transferencia enviada",
  transferencia_entrada: "Transferencia recibida",
  servicio: "Servicio técnico",
  inicial: "Carga inicial",
}

const COLOR_ESTADO = { normal: "bg-[#6b7684]", critico: "bg-alerta", sin_stock: "bg-brasa" } as const

function dia(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Buenos_Aires" })
}

/** Panel del nivel 3: el recorrido de un producto o la historia de una máquina. */
export function PanelPieza({ datos, red, enlaces, onCerrar }: { datos: DatosPieza; red: RedForja; enlaces: EnlacesForja | null; onCerrar: () => void }) {
  const nombre = (id: Id | null) => red.nodos.find((n) => n.id === id)?.nombre ?? "Otra sucursal"
  return (
    <aside
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex max-h-[52%] flex-col rounded-t-2xl border border-white/10 bg-negro/95 text-blanco shadow-2xl backdrop-blur md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[380px] md:rounded-2xl"
      aria-label={datos.tipo === "producto" ? `Recorrido de ${datos.recorrido.producto.nombre}` : `Historia de la máquina ${datos.historia.serie}`}
      data-testid="panel-pieza"
      data-tipo={datos.tipo}
    >
      <header className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-acero">{datos.tipo === "producto" ? "Recorrido de una pieza" : "Historia de una máquina"}</p>
          <h2 className="mt-0.5 font-heading text-lg font-extrabold leading-tight">
            {datos.tipo === "producto" ? datos.recorrido.producto.nombre : `${datos.historia.equipo.marca} ${datos.historia.equipo.modelo}`}
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-acero">
            {datos.tipo === "producto" ? `${datos.recorrido.producto.sku} · ${datos.recorrido.producto.categoria}` : `Serie ${datos.historia.serie}${datos.historia.cliente ? ` · ${datos.historia.cliente.nombre}` : ""}`}
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="rounded-md p-1.5 text-acero hover:text-blanco focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground" aria-label="Cerrar y volver a la red">
          <X className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
        {datos.tipo === "producto" ? <Producto r={datos.recorrido} nombre={nombre} enlaces={enlaces} /> : <Maquina h={datos.historia} nombre={nombre} enlaces={enlaces} />}
      </div>
    </aside>
  )
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-acero first:mt-0">{children}</h3>
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-medium text-blanco hover:border-white/30 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground" data-testid="enlace-modulo">
      {children}
      <ArrowUpRight className="size-3.5 text-acero" aria-hidden />
    </Link>
  )
}

function Producto({ r, nombre, enlaces }: { r: RecorridoProducto; nombre: (id: Id | null) => string; enlaces: EnlacesForja | null }) {
  const max = Math.max(1, ...r.stock.map((s) => Math.max(s.cantidad, s.minimo * 3)))
  const porDia = new Map<string, MovimientoPieza[]>()
  for (const m of r.movimientos.slice(0, 40)) {
    const k = dia(m.fecha)
    porDia.set(k, [...(porDia.get(k) ?? []), m])
  }
  return (
    <>
      <Titulo>Stock por sucursal</Titulo>
      <ul className="space-y-1.5" data-testid="stock-pieza">
        {r.stock.map((s) => (
          <li key={s.sucursalId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn("size-1.5 shrink-0 rounded-full", COLOR_ESTADO[s.estado])} aria-hidden />
              <span className="truncate text-[13px]">{nombre(s.sucursalId)}</span>
            </span>
            <span className={cn("text-right font-mono text-[12px]", s.estado === "sin_stock" ? "text-brasa" : s.estado === "critico" ? "text-alerta" : "text-blanco")}>
              {formatoCantidad(s.cantidad)}
              {s.minimo > 0 && <span className="text-acero"> / mín. {s.minimo}</span>}
            </span>
            <span className="col-span-2 h-1 overflow-hidden rounded-full bg-white/5" aria-hidden>
              <span className={cn("block h-full origin-left rounded-full", COLOR_ESTADO[s.estado])} style={{ transform: `scaleX(${Math.max(0.02, Math.max(0, s.cantidad) / max)})` }} />
            </span>
          </li>
        ))}
      </ul>

      <Titulo>Últimos 28 días</Titulo>
      <p className="font-mono text-[11px] text-acero">
        {r.resumen.vendidas} vendidas · {r.resumen.compradas} compradas · {r.resumen.transferidas} transferidas{r.resumen.ajustadas ? ` · ${r.resumen.ajustadas} ajustes` : ""}
      </p>
      {r.flujos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {r.flujos.map((f) => (
            <li key={`${f.desdeId}>${f.haciaId}`} className="flex items-baseline gap-2 text-[13px]">
              <span className="size-1.5 shrink-0 rounded-full bg-brasa" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {nombre(f.desdeId)} → {nombre(f.haciaId)}
              </span>
              <span className="font-mono text-[11px] text-acero">
                {formatoCantidad(f.cantidad)} u.{f.enTransito ? ` · ${formatoCantidad(f.enTransito)} en camino` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Titulo>Movimientos</Titulo>
      {r.movimientos.length ? (
        <ol className="space-y-3" data-testid="movimientos-pieza">
          {[...porDia.entries()].map(([d, lista]) => (
            <li key={d}>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-acero">{d}</p>
              <ul className="space-y-1 border-l border-white/10 pl-3">
                {lista.map((m) => (
                  <li key={m.id} className="grid grid-cols-[2.6rem_minmax(0,1fr)_auto] items-baseline gap-2 text-[12px]">
                    <span className="font-mono text-[10px] text-acero">{hora(m.fecha)}</span>
                    <span className="min-w-0">
                      <span className="block truncate">{NOMBRE_MOVIMIENTO[m.tipo]}</span>
                      <span className="block truncate font-mono text-[10px] text-acero">
                        {nombre(m.sucursalId)}
                        {m.otraId ? ` ${m.cantidad < 0 ? "→" : "←"} ${nombre(m.otraId)}` : ""}
                      </span>
                    </span>
                    <span className="text-right font-mono">
                      <span className={m.cantidad < 0 ? "text-acero" : "text-blanco"}>{m.cantidad > 0 ? `+${formatoCantidad(m.cantidad)}` : formatoCantidad(m.cantidad)}</span>
                      <span className="block text-[10px] text-acero">queda {formatoCantidad(m.saldo)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-acero">Sin movimientos en los últimos 28 días.</p>
      )}
      {r.movimientos.length > 40 && <p className="mt-2 font-mono text-[10px] text-acero">y {r.movimientos.length - 40} movimientos más</p>}
      {enlaces && (
        <div className="mt-4">
          <Enlace href={enlaces.inventario(null, { producto: r.producto.id })}>Ver en inventario</Enlace>
        </div>
      )}
    </>
  )
}

function Maquina({ h, nombre, enlaces }: { h: HistoriaMaquina; nombre: (id: Id | null) => string; enlaces: EnlacesForja | null }) {
  return (
    <>
      <Titulo>Ventas que coinciden</Titulo>
      {h.ventasCoincidentes.length ? (
        <ul className="space-y-1">
          {h.ventasCoincidentes.map((v) => (
            <li key={`${v.ventaId}:${v.producto}`} className="flex items-baseline gap-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate">{v.producto}</span>
              <span className="font-mono text-[10px] text-acero">
                {dia(v.fecha)} · {nombre(v.sucursalId)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-acero">No hay ventas a este cliente de un equipo de la misma marca y tipo antes del primer ingreso.</p>
      )}
      <p className="mt-2 text-[11px] leading-snug text-acero">Quvant todavía no registra números de serie en compras y ventas: estas coincidencias son por cliente, marca y tipo de equipo.</p>

      <Titulo>Reparaciones</Titulo>
      <ol className="space-y-3" data-testid="ordenes-maquina">
        {h.ordenes.map((o) => (
          <li key={o.id} className="rounded-lg border border-white/10 p-3">
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-heading font-bold">Orden {o.numero}</span>
              <span className="font-mono text-[10px] text-acero">
                {dia(o.fechaIngreso)} · {nombre(o.sucursalId)}
              </span>
            </p>
            <p className="mt-1 text-[12px] text-blanco/90">{o.falla}</p>
            {o.diagnostico && <p className="mt-0.5 text-[11px] text-acero">Diagnóstico: {o.diagnostico}</p>}
            <ol className="mt-2 space-y-0.5 border-l border-white/10 pl-3">
              {o.eventos.map((ev, i) => (
                <li key={i} className="flex items-baseline gap-2 text-[11px]">
                  <span className="size-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: LUZ_SERVICIO[ev.estado].color }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{NOMBRE_ESTADO_SERVICIO[ev.estado]}</span>
                  <span className="font-mono text-[10px] text-acero">
                    {dia(ev.fecha)} {hora(ev.fecha)}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-acero">{o.presupuesto !== null ? `Presupuesto ${formatoPesosCorto(o.presupuesto)}` : "Sin presupuesto"}</span>
              {enlaces && (
                <Link href={enlaces.servicio(o.id)} className="inline-flex items-center gap-1 text-[11px] text-blanco underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground">
                  Abrir la orden <ArrowUpRight className="size-3" aria-hidden />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
