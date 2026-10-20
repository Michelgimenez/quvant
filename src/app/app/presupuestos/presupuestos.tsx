"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FilePlus2, FileText, Search } from "lucide-react"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { EncabezadoPagina, Requiere, Vacio } from "@/components/app/pagina"
import { TablaRapida, type Columna } from "@/components/app/tabla-rapida"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import { ABIERTOS, estadoVisible, NOMBRE_ESTADO_PRESUPUESTO } from "@/dominio/presupuestos"
import type { EstadoPresupuesto, Presupuesto } from "@/dominio/tipos"
import { normalizar } from "@/lib/texto"
import { cn } from "@/lib/utils"
import { DetallePresupuesto } from "./detalle"

const FILTROS = [
  { id: "abiertos", nombre: "Abiertos", estados: ABIERTOS },
  { id: "convertidos", nombre: "Convertidos", estados: ["convertido"] },
  { id: "cerrados", nombre: "Vencidos y rechazados", estados: ["vencido", "rechazado"] },
  { id: "todos", nombre: "Todos", estados: null },
] as const

export const TONO_ESTADO: Record<EstadoPresupuesto, string> = {
  borrador: "bg-muted text-muted-foreground",
  enviado: "bg-foreground/15 text-foreground",
  aceptado: "bg-ok/15 text-ok",
  convertido: "bg-ok/15 text-ok",
  vencido: "bg-alerta/15 text-alerta",
  rechazado: "bg-error/15 text-error",
}

export function EstadoChip({ estado }: { estado: EstadoPresupuesto }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 t-texto-sm font-medium", TONO_ESTADO[estado])}>{NOMBRE_ESTADO_PRESUPUESTO[estado]}</span>
}

export function Presupuestos() {
  const { e, v } = useDatos()
  const { puede, usuario } = useApp()
  const params = useSearchParams()
  const router = useRouter()
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("abiertos")
  const [texto, setTexto] = useState("")
  const seleccionado = params.get("id")
  const ahora = new Date().toISOString()

  const filas = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro)!
    const q = normalizar(texto)
    return Object.values(e.presupuestos)
      .filter((p) => usuario.sucursalIds === null || usuario.sucursalIds.includes(p.sucursalId))
      .filter((p) => !f.estados || (f.estados as readonly EstadoPresupuesto[]).includes(estadoVisible(p, ahora)))
      .filter((p) => !q || normalizar(p.clienteNombre).includes(q) || String(p.numero ?? "").includes(q) || p.numeroLocal.toLowerCase().includes(q))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, filtro, texto])

  const abiertos = Object.values(e.presupuestos).filter((p) => ABIERTOS.includes(estadoVisible(p, ahora)))
  const tasa = useMemo(() => {
    const decididos = Object.values(e.presupuestos).filter((p) => ["convertido", "rechazado", "vencido"].includes(estadoVisible(p, ahora)))
    return decididos.length ? (decididos.filter((p) => p.estado === "convertido").length / decididos.length) * 100 : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  const columnas: Columna<Presupuesto>[] = [
    { id: "numero", encabezado: "Número", ancho: "110px", orden: (p) => p.numero ?? 0, celda: (p) => <span className="ficha text-foreground">{p.numero ? `#${p.numero}` : p.numeroLocal}</span> },
    { id: "cliente", encabezado: "Cliente", ancho: "minmax(200px,2fr)", orden: (p) => p.clienteNombre, celda: (p) => <span className="truncate font-medium">{p.clienteNombre}</span> },
    { id: "fecha", encabezado: "Fecha", ancho: "100px", orden: (p) => p.fecha, celda: (p) => <span className="num t-texto-sm text-muted-foreground">{new Date(p.fecha).toLocaleDateString("es-AR")}</span> },
    { id: "vence", encabezado: "Vence", ancho: "100px", orden: (p) => p.vencimiento, celda: (p) => <span className="num t-texto-sm text-muted-foreground">{new Date(p.vencimiento).toLocaleDateString("es-AR")}</span> },
    { id: "estado", encabezado: "Estado", ancho: "150px", orden: (p) => estadoVisible(p, ahora), celda: (p) => <EstadoChip estado={estadoVisible(p, ahora)} /> },
    { id: "total", encabezado: "Total", ancho: "130px", alinear: "der", orden: (p) => p.total, celda: (p) => <span className="num font-semibold">{formatoPesos(p.total, { sinDecimales: true })}</span> },
  ]

  return (
    <Requiere permiso="presupuestos.ver" modulo="presupuestos">
      <EncabezadoPagina
        ficha={`Presupuestos · ${abiertos.length} abiertos · ${formatoPesosCorto(abiertos.reduce((t, p) => t + p.total, 0))} en juego`}
        titulo="Presupuestos"
        descripcion={`Presupuestos prolijos que pasan a venta con un clic. Se concretó el ${tasa.toLocaleString("es-AR", { maximumFractionDigits: 0 })} % de los decididos.`}
        acciones={
          puede("presupuestos.editar") && (
            <Button asChild>
              <Link href="/app/presupuestos/nuevo">
                <FilePlus2 /> Nuevo presupuesto
              </Link>
            </Button>
          )
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={cn("h-8 rounded-full border px-3 t-texto-sm", filtro === f.id ? "border-foreground/30 bg-muted font-semibold" : "border-linea text-muted-foreground hover:text-foreground")}
            >
              {f.nombre}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Cliente o número" className="h-9 pl-9" aria-label="Buscar presupuesto" />
        </div>
      </div>
      <TablaRapida
        etiqueta="Presupuestos"
        filas={filas}
        columnas={columnas}
        clave={(p) => p.id}
        onElegir={(p) => router.replace(`/app/presupuestos?id=${p.id}`, { scroll: false })}
        alto="calc(100dvh - 300px)"
        tarjeta={(p) => (
          <div className="flex w-full items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate t-texto-sm font-medium">{p.clienteNombre}</p>
              <p className="ficha">
                {p.numero ? `#${p.numero}` : p.numeroLocal} · {new Date(p.fecha).toLocaleDateString("es-AR")}
              </p>
            </div>
            <div className="text-right">
              <p className="num t-texto-sm font-semibold">{formatoPesosCorto(p.total)}</p>
              <EstadoChip estado={estadoVisible(p, ahora)} />
            </div>
          </div>
        )}
        vacio={<Vacio icono={FileText} titulo="No hay presupuestos con este filtro" />}
      />
      <DetallePresupuesto id={seleccionado} onCerrar={() => router.replace("/app/presupuestos", { scroll: false })} />
    </Requiere>
  )
}
