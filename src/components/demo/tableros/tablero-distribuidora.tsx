"use client"

import { GraficoColumnas } from "@/components/graficos/graficos"
import { formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import type { ModuloDemo } from "@/demo/empresas"
import { Avance, Numero, Tarjeta } from "@/components/negocio/piezas"
import { cn } from "@/lib/utils"
import { EncabezadoTablero, ListaEventos, useResumen } from "./comun"

/**
 * El tablero de la distribuidora: la calle. Pedidos de hoy por preventista contra su objetivo, lo cobrado,
 * la deuda en la calle, cómo va el reparto y los 90 días con los picos de fin de mes.
 */
export function TableroDistribuidora({ onModulo }: { onModulo: (m: ModuloDemo) => void }) {
  const { datos, ahora, resumen } = useResumen("distribuidora")
  const masDeuda = [...datos.clientes].sort((a, b) => b.saldo - a.saldo).slice(0, 6)
  const serie = resumen.serie.slice(-60).map((d) => ({ etiqueta: `${Number(d.fecha.slice(8, 10))}/${Number(d.fecha.slice(5, 7))}`, valores: [d.total] }))
  const pedidos = resumen.ultimos.filter((e) => e.tipo === "pedido" || e.tipo === "cobranza" || e.tipo === "entrega")
  return (
    <div data-escala="distribuidora">
      <EncabezadoTablero densidad="media" ahora={ahora} saludo="Tablero comercial" detalle="Distribuidora Ruta Clara · 1 depósito · 12 preventistas en la calle · 400 clientes." />
      <div className="grid grid-cols-12 gap-3">
        <Tarjeta etiqueta="Pedidos de hoy" className="col-span-3" flip="t-ventas">
          <Numero valor={resumen.montoPedidosHoy} formato="pesos-corto" tamano="lg" flip="n-ventas" />
          <p className="t-texto-sm text-muted-foreground">{resumen.pedidosHoy} pedidos desde la calle</p>
        </Tarjeta>
        <Tarjeta etiqueta="Cobrado hoy" className="col-span-3" flip="t-cobrado">
          <Numero valor={resumen.cobradoHoy} formato="pesos-corto" tamano="lg" />
          <button type="button" onClick={() => onModulo("cobranzas")} className="t-texto-sm text-left text-muted-foreground hover:text-foreground">
            Ver cobranzas →
          </button>
        </Tarjeta>
        <Tarjeta etiqueta="Deuda en la calle" className="col-span-3" flip="t-deuda">
          <Numero valor={resumen.deuda.total} formato="pesos-corto" tamano="lg" />
          <p className="t-texto-sm text-muted-foreground">
            {formatoPesosCorto(resumen.deuda.vencida)} vencida (+30 días) · {resumen.deuda.clientes} clientes
          </p>
        </Tarjeta>
        <Tarjeta etiqueta="Reparto de hoy" className="col-span-3" flip="t-reparto">
          <div className="flex items-baseline gap-2">
            <Numero valor={resumen.reparto.entregadas} formato="entero" tamano="lg" />
            <span className="t-texto text-muted-foreground">de {resumen.reparto.total} entregas</span>
          </div>
          <Avance valor={resumen.reparto.entregadas / Math.max(1, resumen.reparto.total)} marca />
        </Tarjeta>

        <Tarjeta etiqueta="Preventa · hoy" titulo="Preventistas contra su objetivo" className="col-span-8" flip="t-preventistas">
          <table className="w-full">
            <thead>
              <tr className="t-etiqueta text-left text-muted-foreground">
                <th className="pb-2 font-medium">Preventista</th>
                <th className="pb-2 font-medium">Zona</th>
                <th className="pb-2 text-right font-medium">Pedidos</th>
                <th className="pb-2 text-right font-medium">Monto</th>
                <th className="w-[28%] pb-2 pl-4 font-medium">Objetivo del día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {resumen.porPreventista.map((p) => {
                const avance = p.objetivo ? p.monto / p.objetivo : 0
                return (
                  <tr key={p.nombre} className="t-dato h-7">
                    <td className="truncate pr-2">{p.nombre}</td>
                    <td className="truncate pr-2 text-muted-foreground">{p.zona}</td>
                    <td className="text-right">{p.pedidos}</td>
                    <td className="text-right font-semibold">{formatoPesosCorto(p.monto)}</td>
                    <td className="pl-4">
                      <span className="flex items-center gap-2">
                        <Avance valor={avance} marca={avance >= 1} className="flex-1" />
                        <span className={cn("w-10 text-right", avance >= 1 ? "text-foreground" : "text-muted-foreground")}>{Math.round(avance * 100)} %</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Tarjeta>
        <Tarjeta etiqueta="Desde la calle" titulo="Últimos movimientos" className="col-span-4" flip="t-actividad">
          <ListaEventos eventos={pedidos} ahora={ahora} max={7} densidad="densa" vacio="Esperando el próximo pedido" />
        </Tarjeta>

        <Tarjeta etiqueta="Ventas · 60 días" titulo="Los picos de fin de mes" className="col-span-8" flip="t-serie">
          <GraficoColumnas datos={serie} series={[{ nombre: "Ventas", color: "var(--serie-1)" }]} formato={(n) => formatoPesos(n, { sinDecimales: true })} formatoEje={formatoPesosCorto} alto={170} titulo="Ventas de los últimos 60 días" />
        </Tarjeta>
        <Tarjeta etiqueta="Cuentas corrientes" titulo="Más deuda" className="col-span-4" flip="t-mas-deuda">
          <ul className="divide-y divide-linea">
            {masDeuda.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="t-texto-sm block truncate">{c.nombre}</span>
                  <span className="t-etiqueta block text-muted-foreground">
                    {c.zona} · {c.diasDeuda} días
                  </span>
                </span>
                <span className={cn("t-dato shrink-0 font-semibold", c.diasDeuda > 30 && "text-alerta")}>{formatoPesosCorto(c.saldo)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>
    </div>
  )
}
