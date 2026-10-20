"use client"

import { useState } from "react"
import { ArrowDownUp } from "lucide-react"
import { GraficoColumnas } from "@/components/graficos/graficos"
import { formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import type { ModuloDemo } from "@/demo/empresas"
import { MapaSucursales } from "@/components/negocio/mapa-sucursales"
import { Avance, Numero, Tarjeta, Variacion } from "@/components/negocio/piezas"
import { cn } from "@/lib/utils"
import { horaCorta } from "../contexto"
import { EncabezadoTablero, useResumen } from "./comun"

type Orden = "hoy" | "avance" | "margen" | "criticos"

/**
 * El tablero del grupo: denso y preciso. El consolidado de las 40 sucursales, el mapa con su actividad,
 * la comparación (ordenable), las provincias, las aprobaciones pendientes y la auditoría.
 */
export function TableroGrupo({ onModulo }: { onModulo: (m: ModuloDemo) => void }) {
  const { datos, acciones, ahora, resumen } = useResumen("grupo")
  const x = datos.extras.tipo === "grupo" ? datos.extras : null
  const [orden, setOrden] = useState<Orden>("hoy")
  const [elegida, setElegida] = useState<number | null>(null)
  const ranking = [...resumen.ranking].sort((a, b) => (orden === "criticos" ? b.criticos - a.criticos : b[orden] - a[orden]))
  const resueltas = new Set(acciones.aprobaciones.map((a) => a.id))
  const pendientes = (x?.aprobaciones ?? []).filter((a) => !resueltas.has(a.id)).slice(0, 4)
  const serie = resumen.serie.slice(-45).map((d) => ({ etiqueta: `${Number(d.fecha.slice(8, 10))}/${Number(d.fecha.slice(5, 7))}`, valores: [d.total] }))
  const maxProv = Math.max(1, ...resumen.porProvincia.map((p) => p.hoy))
  const avanceObjetivo = resumen.objetivoHoy ? resumen.ventasHoy / resumen.objetivoHoy : 0
  const cifras = [
    { e: "Ventas hoy", v: <Numero valor={resumen.ventasHoy} formato="pesos-corto" tamano="lg" flip="n-ventas" />, pie: <Variacion valor={resumen.vsSemanaPasada} contra="viernes pasado" /> },
    { e: "Objetivo del día", v: <Numero valor={avanceObjetivo} formato="porcentaje" tamano="lg" />, pie: <Avance valor={avanceObjetivo} marca /> },
    { e: "Ticket · 30 días", v: <Numero valor={resumen.ticketPromedio} formato="pesos-corto" tamano="lg" />, pie: <span className="t-dato text-muted-foreground">{resumen.ticketsHoy.toLocaleString("es-AR")} tickets hoy</span> },
    { e: "Margen · 30 días", v: <Numero valor={resumen.margen} formato="porcentaje" tamano="lg" />, pie: <span className="t-dato text-muted-foreground">entre {Math.round(Math.min(...(x?.margenPorSucursal ?? [0])) * 100)} y {Math.round(Math.max(...(x?.margenPorSucursal ?? [0])) * 100)} %</span> },
    { e: "Stock valorizado", v: <Numero valor={x?.stockValorizado ?? 0} formato="pesos-corto" tamano="md" className="pt-2.5" />, pie: <span className="t-dato text-muted-foreground">{datos.productos.length.toLocaleString("es-AR")} productos</span> },
    { e: "Aprobaciones", v: <Numero valor={resumen.aprobacionesPendientes} formato="entero" tamano="lg" />, pie: <button type="button" onClick={() => onModulo("aprobaciones")} className="t-dato text-left text-muted-foreground hover:text-foreground">Revisar →</button> },
  ]
  return (
    <div data-escala="empresa">
      <EncabezadoTablero densidad="densa" ahora={ahora} saludo="Consolidado" detalle={`Grupo Cordal · ${datos.sucursales.length} sucursales · ${x?.provincias.length ?? 0} provincias · 312 usuarios.`} />
      <div className="grid grid-cols-12 gap-2.5">
        {cifras.map((c) => (
          <Tarjeta key={c.e} densidad="densa" etiqueta={c.e} className="col-span-2" flip={`t-${c.e}`}>
            {c.v}
            {c.pie}
          </Tarjeta>
        ))}

        <Tarjeta densidad="densa" etiqueta="Mapa · ventas de hoy" className="col-span-3 row-span-2" flip="t-mapa">
          <MapaSucursales sucursales={datos.sucursales} ventas={resumen.porSucursalHoy} ancho={260} alto={470} paso={6.5} destacada={elegida} onElegir={setElegida} className="mx-auto w-full max-w-[260px]" />
          <p className="t-dato text-muted-foreground">{elegida === null ? "Tocá una sucursal" : `${datos.sucursales[elegida].nombre} · ${formatoPesosCorto(resumen.porSucursalHoy[elegida])} hoy`}</p>
        </Tarjeta>
        <Tarjeta
          densidad="densa"
          etiqueta="Comparación · hoy"
          className="col-span-6 row-span-2"
          flip="t-ranking"
          accion={
            <div className="flex items-center gap-1" role="group" aria-label="Ordenar por">
              <ArrowDownUp className="size-3.5 text-muted-foreground" />
              {(["hoy", "avance", "margen", "criticos"] as const).map((o) => (
                <button key={o} type="button" onClick={() => setOrden(o)} aria-pressed={orden === o} className={cn("t-etiqueta rounded px-1.5 py-1", orden === o ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {{ hoy: "Ventas", avance: "Objetivo", margen: "Margen", criticos: "Críticos" }[o]}
                </button>
              ))}
            </div>
          }
        >
          <div className="sin-scrollbar -mx-1 max-h-[452px] overflow-y-auto px-1">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 bg-card">
                <tr className="t-etiqueta text-left text-muted-foreground">
                  <th className="w-7 pb-1.5 font-medium">#</th>
                  <th className="pb-1.5 font-medium">Sucursal</th>
                  <th className="w-[76px] pb-1.5 text-right font-medium">Hoy</th>
                  <th className="w-[132px] pb-1.5 pl-3 font-medium">Objetivo</th>
                  <th className="w-[64px] pb-1.5 text-right font-medium">Margen</th>
                  <th className="w-[58px] pb-1.5 text-right font-medium">Crít.</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.indice} onMouseEnter={() => setElegida(r.indice)} className={cn("t-dato h-[26px] border-t border-linea", elegida === r.indice && "bg-muted")}>
                    <td className="text-muted-foreground">{i + 1}</td>
                    <td className="truncate pr-2">
                      {r.nombre} <span className="text-muted-foreground">· {r.provincia}</span>
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold">{formatoPesosCorto(r.hoy)}</td>
                    <td className="pl-3">
                      <span className="flex items-center gap-1.5">
                        <Avance valor={r.avance} className="flex-1" />
                        <span className="w-9 text-right text-muted-foreground">{Math.round(r.avance * 100)}%</span>
                      </span>
                    </td>
                    <td className="text-right">{Math.round(r.margen * 1000) / 10}%</td>
                    <td className={cn("text-right", r.criticos > 60 && "text-alerta")}>{r.criticos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
        <Tarjeta densidad="densa" etiqueta="Por provincia" className="col-span-3" flip="t-provincias">
          <ul className="space-y-2">
            {resumen.porProvincia.map((p) => (
              <li key={p.provincia} className="space-y-1">
                <span className="t-dato flex justify-between">
                  <span>
                    {p.provincia} <span className="text-muted-foreground">· {p.sucursales}</span>
                  </span>
                  <span className="font-semibold">{formatoPesosCorto(p.hoy)}</span>
                </span>
                <Avance valor={p.hoy / maxProv} />
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta densidad="densa" etiqueta="Aprobaciones" titulo={`${resumen.aprobacionesPendientes} compras esperan`} className="col-span-3" flip="t-aprobaciones">
          <ul className="divide-y divide-linea">
            {pendientes.map((a) => (
              <li key={a.id} className="py-1.5">
                <span className="t-dato flex justify-between">
                  <span className="truncate">{a.numero}</span>
                  <span className="font-semibold">{formatoPesosCorto(a.monto)}</span>
                </span>
                <span className="t-etiqueta block truncate text-muted-foreground">
                  Nivel {a.nivel} · {datos.sucursales[a.sucursal]?.nombre}
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta densidad="densa" etiqueta="Auditoría" titulo="Quién hizo qué" className="col-span-6" flip="t-auditoria">
          <ul className="divide-y divide-linea">
            {(x?.auditoria ?? []).slice(0, 5).map((a) => (
              <li key={a.id} className="t-dato flex items-baseline gap-3 py-1.5">
                <span className="w-11 shrink-0 text-muted-foreground">{horaCorta(Date.parse(a.t))}</span>
                <span className="w-40 shrink-0 truncate">{a.usuario}</span>
                <span className="min-w-0 flex-1 truncate">
                  {a.accion} <span className="text-muted-foreground">· {a.detalle}</span>
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta densidad="densa" etiqueta="Consolidado · 45 días" titulo="Ventas por día" className="col-span-6" flip="t-serie">
          <GraficoColumnas datos={serie} series={[{ nombre: "Ventas", color: "var(--serie-1)" }]} formato={(n) => formatoPesos(n, { sinDecimales: true })} formatoEje={formatoPesosCorto} alto={132} titulo="Ventas consolidadas de los últimos 45 días" />
        </Tarjeta>
      </div>
    </div>
  )
}
