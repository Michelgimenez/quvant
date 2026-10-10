"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, Columns3, List, Plus, Search, Wrench } from "lucide-react"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { EncabezadoPagina, Requiere, Vacio } from "@/components/app/pagina"
import { TablaRapida, type Columna } from "@/components/app/tabla-rapida"
import { IlustracionProducto } from "@/components/base/ilustracion"
import { Ficha } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { diasEntre } from "@/datos/demo/tiempo"
import { NOMBRE_ESTADO_SERVICIO } from "@/dominio/servicio"
import type { EstadoServicio, OrdenServicio } from "@/dominio/tipos"
import { normalizar } from "@/lib/texto"
import { cn } from "@/lib/utils"
import { DetalleOrden } from "./detalle"
import { DialogoIngreso } from "./ingreso"

const COLUMNAS: EstadoServicio[] = ["ingresado", "diagnostico", "esperando_aprobacion", "en_reparacion", "listo"]

export const TONO_SERVICIO: Record<EstadoServicio, string> = {
  ingresado: "bg-muted text-muted-foreground",
  diagnostico: "bg-temple/15 text-enlace",
  esperando_aprobacion: "bg-chispa/15 text-chispa-texto",
  en_reparacion: "bg-temple/15 text-enlace",
  listo: "bg-ok/15 text-ok-texto",
  entregado: "bg-muted text-muted-foreground",
  sin_reparacion: "bg-error/15 text-error-texto",
}

export function ChipServicio({ estado }: { estado: EstadoServicio }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", TONO_SERVICIO[estado])}>{NOMBRE_ESTADO_SERVICIO[estado]}</span>
}

export function Servicio() {
  const { e, v } = useDatos()
  const { puede, usuario } = useApp()
  const params = useSearchParams()
  const router = useRouter()
  const [vista, setVista] = useState<"tablero" | "lista">(params.get("estado") ? "lista" : "tablero")
  const [texto, setTexto] = useState("")
  const [soloMias, setSoloMias] = useState(usuario.rol === "tecnico")
  const [ingreso, setIngreso] = useState(false)
  const filtroEstado = params.get("estado") as EstadoServicio | null
  const seleccionada = params.get("id")
  const hoy = new Date().toISOString()

  const ordenes = useMemo(() => {
    const q = normalizar(texto)
    return Object.values(e.servicio)
      .filter((o) => usuario.sucursalIds === null || usuario.sucursalIds.includes(o.sucursalId))
      .filter((o) => !soloMias || o.tecnicoId === usuario.id)
      .filter((o) => !q || normalizar(`${o.equipo.marca} ${o.equipo.modelo} ${o.falla} ${e.clientes[o.clienteId]?.nombre ?? ""} ${o.numero ?? o.numeroLocal}`).includes(q))
      .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, texto, soloMias])

  const abrir = (id: string | null) => {
    const p = new URLSearchParams(params.toString())
    if (id) p.set("id", id)
    else p.delete("id")
    router.replace(`/app/servicio${p.size ? `?${p}` : ""}`, { scroll: false })
  }

  const columnasTabla: Columna<OrdenServicio>[] = [
    { id: "numero", encabezado: "Orden", ancho: "90px", orden: (o) => o.numero ?? 0, celda: (o) => <span className="ficha text-foreground">ST {o.numero ? `#${o.numero}` : o.numeroLocal}</span> },
    {
      id: "equipo",
      encabezado: "Equipo",
      ancho: "minmax(200px,1.6fr)",
      orden: (o) => o.equipo.marca,
      celda: (o) => (
        <span className="flex items-center gap-2">
          <IlustracionProducto tipo={o.equipo.tipo} className="size-6" />
          <span className="truncate">
            {o.equipo.marca} {o.equipo.modelo}
          </span>
        </span>
      ),
    },
    { id: "cliente", encabezado: "Cliente", ancho: "minmax(160px,1.4fr)", orden: (o) => e.clientes[o.clienteId]?.nombre ?? "", celda: (o) => <span className="truncate">{e.clientes[o.clienteId]?.nombre}</span> },
    { id: "falla", encabezado: "Falla", ancho: "minmax(160px,1.4fr)", celda: (o) => <span className="truncate text-muted-foreground">{o.falla}</span> },
    { id: "estado", encabezado: "Estado", ancho: "170px", orden: (o) => COLUMNAS.indexOf(o.estado), celda: (o) => <ChipServicio estado={o.estado} /> },
    { id: "ingreso", encabezado: "Ingreso", ancho: "96px", orden: (o) => o.fechaIngreso, celda: (o) => <span className="num text-xs text-muted-foreground">{new Date(o.fechaIngreso).toLocaleDateString("es-AR")}</span> },
  ]

  const filasLista = filtroEstado ? ordenes.filter((o) => o.estado === filtroEstado) : ordenes

  return (
    <Requiere permiso="servicio.ver" modulo="servicio">
      <EncabezadoPagina
        ficha={`Taller · ${ordenes.filter((o) => COLUMNAS.includes(o.estado)).length} equipos en curso`}
        titulo="Servicio técnico"
        descripcion="Órdenes de reparación con estado, técnico asignado y avisos al cliente."
        acciones={
          puede("servicio.editar") && (
            <Button onClick={() => setIngreso(true)}>
              <Plus /> Ingresar equipo
            </Button>
          )
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-linea p-0.5" role="group" aria-label="Vista">
          <Button size="sm" variant={vista === "tablero" ? "secondary" : "ghost"} onClick={() => setVista("tablero")} aria-pressed={vista === "tablero"}>
            <Columns3 /> Tablero
          </Button>
          <Button size="sm" variant={vista === "lista" ? "secondary" : "ghost"} onClick={() => setVista("lista")} aria-pressed={vista === "lista"}>
            <List /> Lista
          </Button>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={soloMias} onChange={(ev) => setSoloMias(ev.target.checked)} className="accent-[var(--temple)]" />
          Solo mis órdenes
        </label>
        {filtroEstado && (
          <button type="button" onClick={() => router.replace("/app/servicio")} className="rounded-full border border-linea px-2.5 py-0.5 text-xs">
            {NOMBRE_ESTADO_SERVICIO[filtroEstado]} ✕
          </button>
        )}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Equipo, cliente, falla u orden" className="h-9 pl-9" aria-label="Buscar orden" />
        </div>
      </div>

      {vista === "tablero" ? (
        <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
          <div className="grid min-w-[1100px] grid-cols-5 gap-3">
            {COLUMNAS.map((estado) => {
              const lista = ordenes.filter((o) => o.estado === estado)
              return (
                <section key={estado} className="flex min-h-64 flex-col rounded-xl border border-linea bg-superficie-2/60" aria-label={NOMBRE_ESTADO_SERVICIO[estado]}>
                  <header className="flex items-center justify-between border-b border-linea px-3 py-2">
                    <h2 className="text-sm font-semibold">{NOMBRE_ESTADO_SERVICIO[estado]}</h2>
                    <span className="num rounded bg-muted px-1.5 text-xs">{lista.length}</span>
                  </header>
                  <ul className="flex-1 space-y-2 p-2">
                    {lista.map((o) => (
                      <li key={o.id}>
                        <TarjetaOrden o={o} hoy={hoy} onAbrir={() => abrir(o.id)} />
                      </li>
                    ))}
                    {lista.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted-foreground">Nada acá.</li>}
                  </ul>
                </section>
              )
            })}
          </div>
        </div>
      ) : (
        <TablaRapida
          etiqueta="Órdenes de servicio"
          filas={filasLista}
          columnas={columnasTabla}
          clave={(o) => o.id}
          onElegir={(o) => abrir(o.id)}
          alto="calc(100dvh - 300px)"
          tarjeta={(o) => (
            <div className="flex w-full items-center gap-3">
              <IlustracionProducto tipo={o.equipo.tipo} className="size-7" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {o.equipo.marca} {o.equipo.modelo} · {e.clientes[o.clienteId]?.nombre}
                </p>
                <p className="ficha">ST {o.numero ? `#${o.numero}` : o.numeroLocal}</p>
              </div>
              <ChipServicio estado={o.estado} />
            </div>
          )}
          vacio={<Vacio icono={Wrench} titulo="No hay órdenes con ese filtro" />}
        />
      )}
      <DetalleOrden id={seleccionada} onCerrar={() => abrir(null)} />
      {ingreso && <DialogoIngreso onCerrar={() => setIngreso(false)} onCreada={(id) => abrir(id)} />}
    </Requiere>
  )
}

function TarjetaOrden({ o, hoy, onAbrir }: { o: OrdenServicio; hoy: string; onAbrir: () => void }) {
  const { e } = useDatos()
  const tecnico = e.usuarios.find((u) => u.id === o.tecnicoId)
  const dias = diasEntre(o.fechaIngreso, hoy)
  const atrasada = o.fechaPrometida < hoy && o.estado !== "listo"
  return (
    <button type="button" onClick={onAbrir} className="w-full space-y-2 rounded-lg border border-linea bg-card p-3 text-left transition-colors hover:border-acero/50">
      <div className="flex items-center justify-between gap-2">
        <Ficha>ST {o.numero ? `#${o.numero}` : o.numeroLocal}</Ficha>
        {o.prioridad === "urgente" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-chispa-texto">
            <AlertTriangle className="size-3" /> Urgente
          </span>
        )}
      </div>
      <div className="flex items-start gap-2">
        <IlustracionProducto tipo={o.equipo.tipo} className="size-8 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {o.equipo.marca} {o.equipo.modelo}
          </p>
          <p className="truncate text-xs text-muted-foreground">{e.clientes[o.clienteId]?.nombre}</p>
        </div>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{o.falla}</p>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{tecnico?.nombre.split(" ")[0] ?? "Sin asignar"}</span>
        <span className={cn(atrasada && "font-semibold text-error-texto")}>
          {dias === 0 ? "hoy" : `${dias} día${dias === 1 ? "" : "s"}`}
          {atrasada && " · atrasada"}
        </span>
      </div>
    </button>
  )
}
