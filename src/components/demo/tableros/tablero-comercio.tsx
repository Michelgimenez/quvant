"use client"

import { GraficoColumnas } from "@/components/graficos/graficos"
import { formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import type { ModuloDemo } from "@/demo/empresas"
import { Fila, Numero, Tarjeta, Variacion } from "@/components/negocio/piezas"
import { EncabezadoTablero, ListaEventos, useResumen } from "./comun"

/**
 * El tablero de un comercio con sucursales (la Ferretería Industrial Demo): las ventas de hoy por sucursal,
 * los 30 días por negocio, los números del mes y lo que hay que atender hoy.
 */
export function TableroComercio({ onModulo }: { onModulo: (m: ModuloDemo) => void }) {
  const { datos, ahora, resumen } = useResumen("ferreteria")
  const x = datos.extras.tipo === "comercio" ? datos.extras : null
  const negocios = x?.negocios ?? []
  const ultimos30 = resumen.serie.slice(-30)
  const datosGrafico = ultimos30.map((d) => ({
    etiqueta: `${Number(d.fecha.slice(8, 10))}/${Number(d.fecha.slice(5, 7))}`,
    valores: negocios.map((n) => n.sucursales.reduce((a, i) => a + (d.porSucursal[i] ?? 0), 0)),
  }))
  const atender = [
    { titulo: "Sin stock o bajo el mínimo", detalle: "Productos para reponer en alguna sucursal", valor: resumen.stockCritico, modulo: "inventario" as const },
    { titulo: "Presupuestos abiertos", detalle: `${formatoPesosCorto(resumen.presupuestosMonto)} en juego`, valor: resumen.presupuestosAbiertos, modulo: "presupuestos" as const },
    { titulo: "Equipos listos para retirar", detalle: "Servicio técnico · avisar al cliente", valor: resumen.servicioListos, modulo: "servicio" as const },
    { titulo: "Transferencias en viaje", detalle: "Entre sucursales", valor: resumen.transferenciasEnViaje, modulo: "transferencias" as const },
  ]
  return (
    <div data-escala="comercio">
      <EncabezadoTablero densidad="media" ahora={ahora} saludo="Buenas tardes, Martín." detalle="Ferretería Industrial Demo · 2 negocios · 3 sucursales." />
      <div className="grid grid-cols-12 gap-3">
        <Tarjeta etiqueta="Ventas de hoy · todas las sucursales" className="col-span-5" flip="t-ventas">
          <Numero valor={resumen.ventasHoy} tamano="xl" flip="n-ventas" />
          <Variacion valor={resumen.vsSemanaPasada} contra="el viernes pasado" />
          <div className="mt-1 grid grid-cols-3 gap-2">
            {datos.sucursales.map((s, i) => (
              <div key={s.id} className="rounded-md border border-linea bg-superficie-2 p-2.5">
                <p className="t-etiqueta text-muted-foreground">{s.codigo}</p>
                <p className="t-texto-sm truncate text-muted-foreground">{s.nombre}</p>
                <p className="t-numero mt-1">{formatoPesosCorto(resumen.porSucursalHoy[i] ?? 0)}</p>
              </div>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta etiqueta="Por negocio" titulo="Ventas de los últimos 30 días" className="col-span-7" flip="t-serie">
          <GraficoColumnas
            datos={datosGrafico}
            series={negocios.map((n, i) => ({ nombre: n.nombre, color: i === 0 ? "var(--serie-1)" : "var(--serie-2)" }))}
            formato={(n) => formatoPesos(n, { sinDecimales: true })}
            formatoEje={formatoPesosCorto}
            alto={196}
            titulo="Ventas de los últimos 30 días por negocio"
          />
        </Tarjeta>

        {[
          { e: "Ventas del mes", v: resumen.ventasMes, f: "pesos-corto" as const, pie: <Variacion valor={resumen.vsMesAnterior} contra="los 30 días anteriores" /> },
          { e: "Ticket promedio · 30 días", v: resumen.ticketPromedio, f: "pesos-corto" as const, pie: <span className="t-texto-sm text-muted-foreground">{resumen.ticketsHoy} ventas hoy</span> },
          { e: "Margen bruto · 30 días", v: resumen.margen, f: "porcentaje" as const, pie: <span className="t-texto-sm text-muted-foreground">sobre el costo de reposición</span> },
          { e: "Presupuestos abiertos", v: resumen.presupuestosAbiertos, f: "entero" as const, pie: <span className="t-texto-sm text-muted-foreground">{formatoPesosCorto(resumen.presupuestosMonto)} en juego</span> },
        ].map((c) => (
          <Tarjeta key={c.e} etiqueta={c.e} className="col-span-3" flip={`t-${c.e}`}>
            <Numero valor={c.v} formato={c.f} tamano="lg" />
            {c.pie}
          </Tarjeta>
        ))}

        <Tarjeta titulo="Para atender hoy" className="col-span-4" flip="t-atender">
          <ul className="divide-y divide-linea">
            {atender.map((a) => (
              <li key={a.titulo}>
                <button type="button" onClick={() => onModulo(a.modulo)} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="t-texto-sm block font-medium">{a.titulo}</span>
                    <span className="t-texto-sm block truncate text-muted-foreground">{a.detalle}</span>
                  </span>
                  <span className="t-numero rounded-md bg-muted px-2 py-0.5">{a.valor}</span>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta titulo="Servicio técnico" etiqueta="Taller · Casa Central" className="col-span-3" flip="t-servicio">
          <ul className="divide-y divide-linea">
            {(["ingresado", "diagnostico", "reparacion", "listo"] as const).map((estado) => (
              <li key={estado} className="flex items-center justify-between py-2">
                <span className="t-texto-sm text-muted-foreground">{{ ingresado: "Ingresados", diagnostico: "En diagnóstico", reparacion: "En reparación", listo: "Listos para retirar" }[estado]}</span>
                <span className="t-numero">{(x?.servicio ?? []).filter((o) => o.estado === estado).length}</span>
              </li>
            ))}
          </ul>
          <Fila etiqueta="Órdenes abiertas" valor={resumen.servicioEnCurso + resumen.servicioListos} fuerte />
        </Tarjeta>
        <Tarjeta titulo="Actividad" etiqueta="Lo último" className="col-span-5" flip="t-actividad">
          <ListaEventos eventos={resumen.ultimos} ahora={ahora} max={5} />
        </Tarjeta>
      </div>
    </div>
  )
}
