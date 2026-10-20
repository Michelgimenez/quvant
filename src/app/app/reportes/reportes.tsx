"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Download } from "lucide-react"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { Cifra, Delta } from "@/components/app/cifras"
import { EncabezadoPagina, Panel, Requiere } from "@/components/app/pagina"
import { BarrasHorizontales, GraficoColumnas, SERIES } from "@/components/graficos/graficos"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { claveDia, diaART, diasEntre, sumarDias } from "@/datos/demo/tiempo"
import { formatoCantidad, formatoPesos, formatoPesosCorto, formatoPorcentaje } from "@/dominio/dinero"
import { claveStock } from "@/dominio/estado"
import { diaDe, margenBruto, resumir, topProductos, variacion, ventasConfirmadas } from "@/dominio/indicadores"
import { NOMBRE_ESTADO_SERVICIO } from "@/dominio/servicio"
import type { Id, MedioPago } from "@/dominio/tipos"
import { NOMBRE_MEDIO, subtotalItem } from "@/dominio/ventas"
import { descargarCSV, pesos } from "@/lib/csv"

const PERIODOS = [
  { dias: 7, nombre: "Últimos 7 días" },
  { dias: 30, nombre: "Últimos 30 días" },
  { dias: 90, nombre: "Últimos 90 días" },
  { dias: 180, nombre: "Últimos 6 meses" },
]

function BotonCSV({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick} className="text-muted-foreground">
      <Download /> CSV
    </Button>
  )
}

export function Reportes() {
  const { e, v } = useDatos()
  const { puede } = useApp()
  const params = useSearchParams()
  const [dias, setDias] = useState(30)
  const [negocioId, setNegocioId] = useState<string>("todos")
  const hoy = diaART(new Date())
  const desde = claveDia(sumarDias(hoy, -dias + 1))
  const hasta = claveDia(hoy)
  const desdeAnt = claveDia(sumarDias(hoy, -2 * dias + 1))
  const hastaAnt = claveDia(sumarDias(hoy, -dias))

  const d = useMemo(() => {
    const todas = ventasConfirmadas(e, negocioId === "todos" ? undefined : { negocioId })
    const ventas = todas.filter((x) => {
      const k = diaDe(x.fecha)
      return k >= desde && k <= hasta
    })
    const actual = resumir(todas, desde, hasta)
    const anterior = resumir(todas, desdeAnt, hastaAnt)
    const sucursales = e.sucursales.filter((s) => negocioId === "todos" || s.negocioId === negocioId)

    // Serie temporal: diaria hasta 31 días, semanal después
    const semanal = dias > 31
    const buckets: { etiqueta: string; detalle: string; desde: string; hasta: string }[] = []
    if (!semanal) {
      for (let i = dias - 1; i >= 0; i--) {
        const dd = sumarDias(hoy, -i)
        buckets.push({ etiqueta: `${dd.d}/${dd.m + 1}`, detalle: `${dd.d}/${dd.m + 1}`, desde: claveDia(dd), hasta: claveDia(dd) })
      }
    } else {
      for (let i = Math.ceil(dias / 7) - 1; i >= 0; i--) {
        const fin = sumarDias(hoy, -i * 7)
        const ini = sumarDias(fin, -6)
        buckets.push({ etiqueta: `${ini.d}/${ini.m + 1}`, detalle: `Semana del ${ini.d}/${ini.m + 1} al ${fin.d}/${fin.m + 1}`, desde: claveDia(ini), hasta: claveDia(fin) })
      }
    }
    const columnas = buckets.map((b) => ({
      etiqueta: b.etiqueta,
      detalle: b.detalle,
      valores: sucursales.map((s) => resumir(todas.filter((x) => x.sucursalId === s.id), b.desde, b.hasta).total),
    }))

    const porMedio: Record<string, number> = {}
    const porCategoria: Record<Id, number> = {}
    const porVendedor: Record<Id, number> = {}
    let sinConexion = 0
    for (const x of ventas) {
      if (x.origen === "sin_conexion") sinConexion++
      porVendedor[x.vendedorId] = (porVendedor[x.vendedorId] ?? 0) + x.total
      for (const p of x.pagos) porMedio[p.medio] = (porMedio[p.medio] ?? 0) + p.importe
      for (const it of x.items) {
        const c = e.productos[it.productoId]?.categoriaId
        if (c) porCategoria[c] = (porCategoria[c] ?? 0) + subtotalItem(it)
      }
    }
    return {
      ventas,
      actual,
      anterior,
      sucursales,
      columnas,
      semanal,
      sinConexion,
      porMedio: Object.entries(porMedio).sort((a, b) => b[1] - a[1]),
      porCategoria: Object.entries(porCategoria).sort((a, b) => b[1] - a[1]),
      porVendedor: Object.entries(porVendedor).sort((a, b) => b[1] - a[1]),
      top: topProductos(e, ventas, desde, 25),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, dias, negocioId])

  const ticket = d.actual.cantidad ? d.actual.total / d.actual.cantidad : 0
  const ticketAnt = d.anterior.cantidad ? d.anterior.total / d.anterior.cantidad : 0
  const margen = margenBruto(d.actual)
  const periodo = PERIODOS.find((p) => p.dias === dias)!.nombre.toLowerCase()

  return (
    <Requiere permiso="reportes.ver" modulo="reportes">
      <EncabezadoPagina ficha="Reportes" titulo="Los números del negocio" descripcion="Ventas, márgenes, stock valorizado, cuentas corrientes y taller. Todo exportable." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={String(dias)} onValueChange={(x) => setDias(Number(x))}>
          <SelectTrigger className="w-48" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => (
              <SelectItem key={p.dias} value={String(p.dias)}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={negocioId} onValueChange={setNegocioId}>
          <SelectTrigger className="w-56" aria-label="Negocio">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los negocios</SelectItem>
            {e.negocios.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue={params.get("vista") === "advertencias" ? "revisar" : "ventas"}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="cuentas">Cuentas corrientes</TabsTrigger>
          <TabsTrigger value="taller">Taller</TabsTrigger>
          <TabsTrigger value="revisar">Para revisar</TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra etiqueta={`Ventas · ${periodo}`} valor={formatoPesosCorto(d.actual.total)} delta={<Delta valor={variacion(d.actual.total, d.anterior.total)} periodo="el período anterior" />} />
            <Cifra etiqueta="Cantidad de ventas" valor={d.actual.cantidad.toLocaleString("es-AR")} delta={<Delta valor={variacion(d.actual.cantidad, d.anterior.cantidad)} periodo="el período anterior" />} />
            <Cifra etiqueta="Ticket promedio" valor={formatoPesosCorto(ticket)} delta={<Delta valor={variacion(ticket, ticketAnt)} periodo="el período anterior" />} />
            {puede("costos.ver") ? (
              <Cifra etiqueta="Margen bruto" valor={margen === null ? "—" : formatoPorcentaje(margen)} pie="sobre ventas netas de IVA" />
            ) : (
              <Cifra etiqueta="Hechas sin conexión" valor={String(d.sinConexion)} pie="se sincronizaron solas" />
            )}
          </div>
          <Panel titulo={d.semanal ? "Ventas por semana" : "Ventas por día"} ficha="Por sucursal">
            <GraficoColumnas
              titulo={`Ventas por ${d.semanal ? "semana" : "día"} y sucursal`}
              datos={d.columnas}
              series={d.sucursales.map((s, i) => ({ nombre: `${s.codigo} · ${s.nombre}`, color: SERIES[i % SERIES.length] }))}
              formato={(n) => formatoPesos(n, { sinDecimales: true })}
              formatoEje={formatoPesosCorto}
              alto={260}
            />
          </Panel>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel titulo="Por categoría">
              <BarrasHorizontales titulo="Ventas por categoría" datos={d.porCategoria.slice(0, 10).map(([id, val]) => ({ etiqueta: e.categorias.find((c) => c.id === id)?.nombre ?? "—", valor: val }))} formato={formatoPesosCorto} />
            </Panel>
            <Panel titulo="Por medio de pago">
              <BarrasHorizontales titulo="Ventas por medio de pago" datos={d.porMedio.map(([m, val]) => ({ etiqueta: NOMBRE_MEDIO[m as MedioPago], valor: val }))} formato={formatoPesosCorto} />
            </Panel>
            <Panel titulo="Por vendedor">
              <BarrasHorizontales titulo="Ventas por vendedor" datos={d.porVendedor.map(([id, val]) => ({ etiqueta: e.usuarios.find((u) => u.id === id)?.nombre ?? "—", valor: val }))} formato={formatoPesosCorto} />
            </Panel>
          </div>
          <Panel
            titulo="Productos más vendidos"
            accion={<BotonCSV onClick={() => descargarCSV("productos-mas-vendidos", [["SKU", "Producto", "Unidades", "Facturación"], ...d.top.map((t) => [t.producto.sku, t.producto.nombre, t.unidades, pesos(t.total)])])} />}
          >
            <TablaSimple columnas={["Producto", "Unidades", "Facturación"]} filas={d.top.map((t) => [t.producto.nombre, formatoCantidad(t.unidades), formatoPesos(t.total, { sinDecimales: true })])} />
          </Panel>
        </TabsContent>

        <TabsContent value="stock">
          <ReporteStock />
        </TabsContent>
        <TabsContent value="cuentas">
          <ReporteCuentas />
        </TabsContent>
        <TabsContent value="taller">
          <ReporteTaller desde={desde} />
        </TabsContent>
        <TabsContent value="revisar">
          <ReporteRevisar />
        </TabsContent>
      </Tabs>
    </Requiere>
  )
}

function TablaSimple({ columnas, filas }: { columnas: string[]; filas: (string | number)[][] }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-lg border border-linea">
      <table className="w-full t-texto-sm">
        <thead className="sticky top-0 bg-superficie-2 t-texto-sm text-muted-foreground">
          <tr>
            {columnas.map((c, i) => (
              <th key={c} className={`px-3 py-2 font-medium ${i ? "text-right" : "text-left"}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-linea">
              {f.map((c, k) => (
                <td key={k} className={`px-3 py-1.5 ${k ? "num text-right" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={columnas.length} className="px-3 py-6 text-center text-muted-foreground">
                Nada para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ReporteStock() {
  const { e, v } = useDatos()
  const { puede } = useApp()
  const [ahora] = useState(() => Date.now())
  const d = useMemo(() => {
    const porSucursal = e.sucursales.map((s) => {
      let valor = 0
      let unidades = 0
      for (const st of Object.values(e.stock)) {
        if (st.sucursalId !== s.id || st.cantidad <= 0) continue
        valor += Math.round(st.cantidad * (e.productos[st.productoId]?.costo ?? 0))
        unidades += st.cantidad
      }
      return { s, valor, unidades }
    })
    const porCategoria: Record<Id, number> = {}
    for (const st of Object.values(e.stock)) {
      const p = e.productos[st.productoId]
      if (p && st.cantidad > 0) porCategoria[p.categoriaId] = (porCategoria[p.categoriaId] ?? 0) + Math.round(st.cantidad * p.costo)
    }
    const hace90 = new Date(ahora - 90 * 86_400_000).toISOString()
    const ultimaVenta: Record<Id, string> = {}
    for (const m of e.movimientos) if (m.tipo === "venta" && (!ultimaVenta[m.productoId] || m.fecha > ultimaVenta[m.productoId])) ultimaVenta[m.productoId] = m.fecha
    const quietos = Object.values(e.productos)
      .filter((p) => (!ultimaVenta[p.id] || ultimaVenta[p.id] < hace90) && e.sucursales.some((s) => (e.stock[claveStock(s.id, p.id)]?.cantidad ?? 0) > 0))
      .map((p) => ({ p, unidades: e.sucursales.reduce((t, s) => t + Math.max(0, e.stock[claveStock(s.id, p.id)]?.cantidad ?? 0), 0), ultima: ultimaVenta[p.id] }))
      .sort((a, b) => b.unidades * b.p.costo - a.unidades * a.p.costo)
    return { porSucursal, porCategoria: Object.entries(porCategoria).sort((a, b) => b[1] - a[1]), quietos }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, ahora])
  if (!puede("costos.ver")) return <p className="t-texto-sm text-muted-foreground">El stock valorizado necesita permiso para ver costos.</p>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Stock valorizado a costo" valor={formatoPesosCorto(d.porSucursal.reduce((t, x) => t + x.valor, 0))} />
        {d.porSucursal.map((x) => (
          <Cifra key={x.s.id} etiqueta={`${x.s.codigo} · ${x.s.nombre}`} valor={formatoPesosCorto(x.valor)} pie={`${formatoCantidad(Math.round(x.unidades))} unidades`} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Valorizado por categoría">
          <BarrasHorizontales titulo="Stock valorizado por categoría" datos={d.porCategoria.map(([id, val]) => ({ etiqueta: e.categorias.find((c) => c.id === id)?.nombre ?? "—", valor: val }))} formato={formatoPesosCorto} />
        </Panel>
        <Panel
          titulo="Sin ventas en 90 días"
          ficha={`${d.quietos.length} productos con stock quieto`}
          accion={<BotonCSV onClick={() => descargarCSV("stock-quieto", [["SKU", "Producto", "Unidades", "Valor a costo", "Última venta"], ...d.quietos.map((q) => [q.p.sku, q.p.nombre, q.unidades, pesos(q.unidades * q.p.costo), q.ultima ? new Date(q.ultima).toLocaleDateString("es-AR") : "nunca"])])} />}
        >
          <TablaSimple columnas={["Producto", "Unidades", "Valor"]} filas={d.quietos.slice(0, 30).map((q) => [q.p.nombre, formatoCantidad(q.unidades), formatoPesos(Math.round(q.unidades * q.p.costo), { sinDecimales: true })])} />
        </Panel>
      </div>
    </div>
  )
}

function ReporteCuentas() {
  const { e, v } = useDatos()
  const d = useMemo(() => {
    const saldo: Record<Id, number> = {}
    const ultimoPago: Record<Id, string> = {}
    for (const m of e.movimientosCuenta) {
      saldo[m.clienteId] = (saldo[m.clienteId] ?? 0) + m.importe
      if (m.tipo === "pago" && (!ultimoPago[m.clienteId] || m.fecha > ultimoPago[m.clienteId])) ultimoPago[m.clienteId] = m.fecha
    }
    const deudores = Object.entries(saldo)
      .filter(([, s]) => s > 0)
      .map(([id, s]) => ({ c: e.clientes[id], s, ultimo: ultimoPago[id] }))
      .filter((x) => x.c)
      .sort((a, b) => b.s - a.s)
    return { deudores, total: deudores.reduce((t, x) => t + x.s, 0), excedidos: deudores.filter((x) => x.c.limiteCredito > 0 && x.s > x.c.limiteCredito) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Cifra etiqueta="Total a cobrar" valor={formatoPesosCorto(d.total)} />
        <Cifra etiqueta="Clientes con saldo" valor={String(d.deudores.length)} />
        <Cifra etiqueta="Sobre su límite" valor={String(d.excedidos.length)} />
      </div>
      <Panel
        titulo="Saldos por cliente"
        accion={<BotonCSV onClick={() => descargarCSV("cuentas-corrientes", [["Cliente", "CUIT", "Saldo", "Límite", "Último pago"], ...d.deudores.map((x) => [x.c.nombre, x.c.cuit, pesos(x.s), pesos(x.c.limiteCredito), x.ultimo ? new Date(x.ultimo).toLocaleDateString("es-AR") : "—"])])} />}
      >
        <TablaSimple
          columnas={["Cliente", "Saldo", "Límite", "Último pago"]}
          filas={d.deudores.map((x) => [x.c.nombre, formatoPesos(x.s, { sinDecimales: true }), x.c.limiteCredito ? formatoPesos(x.c.limiteCredito, { sinDecimales: true }) : "—", x.ultimo ? `hace ${diasEntre(x.ultimo, new Date().toISOString())} días` : "—"])}
        />
      </Panel>
    </div>
  )
}

function ReporteTaller({ desde }: { desde: string }) {
  const { e, v } = useDatos()
  const d = useMemo(() => {
    const ordenes = Object.values(e.servicio)
    const porEstado = Object.entries(ordenes.reduce<Record<string, number>>((m, o) => ({ ...m, [o.estado]: (m[o.estado] ?? 0) + 1 }), {}))
    const terminadas = ordenes.filter((o) => diaDe(o.fechaIngreso) >= desde && o.eventos.some((ev) => ev.estado === "listo"))
    const demora = (o: (typeof ordenes)[number]) => diasEntre(o.fechaIngreso, o.eventos.find((ev) => ev.estado === "listo")!.fecha)
    const promedio = terminadas.length ? terminadas.reduce((t, o) => t + demora(o), 0) / terminadas.length : 0
    const porTecnico = e.usuarios
      .filter((u) => u.rol === "tecnico")
      .map((u) => {
        const suyas = terminadas.filter((o) => o.tecnicoId === u.id)
        return { u, cantidad: suyas.length, promedio: suyas.length ? suyas.reduce((t, o) => t + demora(o), 0) / suyas.length : 0 }
      })
    return { porEstado, terminadas: terminadas.length, promedio, porTecnico }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, desde])
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Reparaciones terminadas" valor={String(d.terminadas)} pie="ingresadas en el período" />
        <Cifra etiqueta="Días promedio hasta listo" valor={d.promedio.toLocaleString("es-AR", { maximumFractionDigits: 1 })} />
        {d.porTecnico.map((t) => (
          <Cifra key={t.u.id} etiqueta={t.u.nombre} valor={`${t.cantidad} equipos`} pie={`${t.promedio.toLocaleString("es-AR", { maximumFractionDigits: 1 })} días promedio`} />
        ))}
      </div>
      <Panel titulo="Órdenes por estado (todas)">
        <BarrasHorizontales titulo="Órdenes de servicio por estado" datos={d.porEstado.map(([k, n]) => ({ etiqueta: NOMBRE_ESTADO_SERVICIO[k as keyof typeof NOMBRE_ESTADO_SERVICIO], valor: n }))} formato={(n) => String(n)} />
      </Panel>
    </div>
  )
}

function ReporteRevisar() {
  const { e, v } = useDatos()
  const filas = useMemo(
    () =>
      Object.values(e.ventas)
        .filter((x) => x.advertencias.length > 0 && x.estado === "confirmada")
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v],
  )
  return (
    <Panel
      titulo="Ventas con advertencias"
      ficha="Se aceptaron (la venta ya ocurrió) pero conviene revisarlas"
      accion={<BotonCSV onClick={() => descargarCSV("ventas-para-revisar", [["Venta", "Fecha", "Sucursal", "Total", "Origen", "Advertencias"], ...filas.map((x) => [x.numero ?? x.numeroLocal, new Date(x.fecha).toLocaleString("es-AR"), e.sucursales.find((s) => s.id === x.sucursalId)?.codigo, pesos(x.total), x.origen, x.advertencias.join(" | ")])])} />}
    >
      {filas.length === 0 ? (
        <p className="t-texto-sm text-muted-foreground">No hay ventas con advertencias. Aparecen acá, por ejemplo, las ventas hechas sin conexión que dejaron stock negativo o se cobraron a un precio viejo.</p>
      ) : (
        <ul className="divide-y divide-linea">
          {filas.map((x) => (
            <li key={x.id} className="space-y-1 py-2.5">
              <p className="flex flex-wrap items-center gap-2 t-texto-sm">
                <span className="ficha text-foreground">{x.numero ? `#${x.numero}` : x.numeroLocal}</span>
                <span className="text-muted-foreground">{new Date(x.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
                {x.origen === "sin_conexion" && <span className="rounded bg-alerta/15 px-1.5 t-texto-sm text-alerta">sin conexión</span>}
                <span className="num ml-auto">{formatoPesos(x.total, { sinDecimales: true })}</span>
              </p>
              <ul className="t-texto-sm text-muted-foreground">
                {x.advertencias.map((a, i) => (
                  <li key={i}>• {a.split(": ").slice(1).join(": ") || a}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
