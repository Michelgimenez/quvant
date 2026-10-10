"use client"

import Link from "next/link"
import { useMemo } from "react"
import { AlertTriangle, ArrowRight, CircleCheck, CloudOff, FilePlus2, PackageSearch, ShoppingCart, Wrench } from "lucide-react"
import { useApp, useConexion, useDatos } from "@/cliente/app-contexto"
import { Cifra, Delta } from "@/components/app/cifras"
import { EncabezadoPagina, Panel, Requiere } from "@/components/app/pagina"
import { Ficha, Punto } from "@/components/base/sellos"
import { BarrasHorizontales, GraficoColumnas, SERIES } from "@/components/graficos/graficos"
import { Button } from "@/components/ui/button"
import { claveDia, diaART, sumarDias } from "@/datos/demo/tiempo"
import { formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import { alertas, diaDe, margenBruto, rangoDias, resumir, topProductos, variacion, ventasConfirmadas, ventasPorDia, type Alerta } from "@/dominio/indicadores"
import { NOMBRE_ROL } from "@/dominio/permisos"
import { NOMBRE_ESTADO_SERVICIO } from "@/dominio/servicio"
import { ESTADOS_SERVICIO, type EstadoServicio } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]

function saludo() {
  const h = new Date().getHours()
  return h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches"
}

export function Tablero() {
  const { usuario } = useApp()
  return (
    <Requiere permiso="tablero.ver">
      <EncabezadoPagina
        ficha={`Tablero · ${NOMBRE_ROL[usuario.rol]}`}
        titulo={`${saludo()}, ${usuario.nombre.split(" ")[0]}.`}
        descripcion="Todos tus negocios en una pantalla."
      />
      {usuario.rol === "tecnico" ? <TableroTaller /> : usuario.rol === "mostrador" || usuario.rol === "deposito" ? <TableroOperativo /> : <TableroDireccion />}
    </Requiere>
  )
}

function diaSemanaHoy(d: { y: number; m: number; d: number }) {
  return new Date(Date.UTC(d.y, d.m, d.d)).getUTCDay()
}

function useFechas() {
  return useMemo(() => {
    const ahora = new Date()
    const hoy = diaART(ahora)
    return {
      ahora,
      hoy,
      kHoy: claveDia(hoy),
      kSemanaPasada: claveDia(sumarDias(hoy, -7)),
      kAyer: claveDia(sumarDias(hoy, diaSemanaHoy(hoy) === 1 ? -2 : -1)),
      inicioMes: claveDia({ ...hoy, d: 1 }),
      inicioMesAnterior: claveDia(hoy.m === 0 ? { y: hoy.y - 1, m: 11, d: 1 } : { y: hoy.y, m: hoy.m - 1, d: 1 }),
      mismoDiaMesAnterior: claveDia(hoy.m === 0 ? { y: hoy.y - 1, m: 11, d: hoy.d } : { y: hoy.y, m: hoy.m - 1, d: hoy.d }),
      hace30: claveDia(sumarDias(hoy, -29)),
      hace60: claveDia(sumarDias(hoy, -59)),
      hace31: claveDia(sumarDias(hoy, -30)),
    }
  }, [])
}

function TableroDireccion() {
  const { e, v } = useDatos()
  const { puede, usuario } = useApp()
  const f = useFechas()

  const datos = useMemo(() => {
    const ventas = ventasConfirmadas(e)
    const hoy = resumir(ventas, f.kHoy, f.kHoy)
    const ayer = resumir(ventas, f.kAyer, f.kAyer)
    const semanaPasada = resumir(ventas, f.kSemanaPasada, f.kSemanaPasada)
    const mes = resumir(ventas, f.inicioMes, f.kHoy)
    const mesAnterior = resumir(ventas, f.inicioMesAnterior, f.mismoDiaMesAnterior)
    const ult30 = resumir(ventas, f.hace30, f.kHoy)
    const prev30 = resumir(ventas, f.hace60, f.hace31)
    const porDiaNegocio = ventasPorDia(ventas, (x) => x.negocioId)
    const dias = rangoDias(f.hoy, 30)
    const columnas = dias.map((d) => {
      const k = claveDia(d)
      return {
        etiqueta: `${d.d}/${d.m + 1}`,
        detalle: `${DIAS_CORTOS[new Date(Date.UTC(d.y, d.m, d.d)).getUTCDay()]} ${d.d}/${d.m + 1}`,
        valores: e.negocios.map((n) => porDiaNegocio[k]?.[n.id] ?? 0),
      }
    })
    const porNegocio = e.negocios.map((n) => {
      const vs = ventas.filter((x) => x.negocioId === n.id)
      return {
        negocio: n,
        hoy: resumir(vs, f.kHoy, f.kHoy),
        mes: resumir(vs, f.inicioMes, f.kHoy),
        sucursales: e.sucursales
          .filter((s) => s.negocioId === n.id)
          .map((s) => ({ s, hoy: resumir(vs.filter((x) => x.sucursalId === s.id), f.kHoy, f.kHoy) })),
      }
    })
    const presupuestosAbiertos = Object.values(e.presupuestos).filter((p) => p.estado === "enviado" || p.estado === "aceptado" || p.estado === "borrador")
    const aCobrar = Object.values(e.clientes).reduce((t, c) => {
      let s = 0
      for (const m of e.movimientosCuenta) if (m.clienteId === c.id) s += m.importe
      return t + Math.max(0, s)
    }, 0)
    const sparkDiario = dias.slice(-14).map((d) => e.negocios.reduce((t, n) => t + (porDiaNegocio[claveDia(d)]?.[n.id] ?? 0), 0))
    return {
      hoy,
      ayer,
      semanaPasada,
      mes,
      mesAnterior,
      ult30,
      prev30,
      columnas,
      porNegocio,
      presupuestosAbiertos,
      aCobrar,
      sparkDiario,
      top: topProductos(e, ventas, f.inicioMes, 7),
      alertas: alertas(e, f.ahora, usuario.sucursalIds),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  const ticket = datos.ult30.cantidad ? datos.ult30.total / datos.ult30.cantidad : 0
  const ticketPrev = datos.prev30.cantidad ? datos.prev30.total / datos.prev30.cantidad : 0
  const margen = margenBruto(datos.ult30)
  const margenPrev = margenBruto(datos.prev30)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        <section className="flex flex-col justify-between gap-4 rounded-xl border border-linea bg-card p-5">
          <div>
            <p className="text-sm text-muted-foreground">Ventas de hoy · todos los negocios</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight sm:text-6xl" data-testid="ventas-hoy">
              {formatoPesosCorto(datos.hoy.total)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Delta valor={variacion(datos.hoy.total, datos.semanaPasada.total)} periodo="el mismo día de la semana pasada" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {datos.hoy.cantidad
                ? `${datos.hoy.cantidad} ventas · ${formatoPesos(datos.hoy.total)}`
                : `Todavía no hay ventas hoy. Ayer: ${formatoPesos(datos.ayer.total, { sinDecimales: true })} en ${datos.ayer.cantidad} ventas.`}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {datos.porNegocio.map(({ negocio, hoy, sucursales }, i) => (
              <div key={negocio.id} className="rounded-lg border border-linea bg-superficie-2 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2.5 rounded-[2px]" style={{ background: SERIES[i] }} aria-hidden />
                  {negocio.nombre}
                </p>
                <p className="mt-1 text-lg font-semibold">{formatoPesosCorto(hoy.total)}</p>
                <ul className="mt-1 space-y-0.5">
                  {sucursales.map(({ s, hoy: h }) => (
                    <li key={s.id} className="flex justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="min-w-0 truncate">
                        <span className="num">{s.codigo}</span> {s.nombre}
                      </span>
                      <span className="shrink-0 whitespace-nowrap">{formatoPesosCorto(h.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <Panel titulo="Ventas de los últimos 30 días" ficha="Por negocio">
          <GraficoColumnas
            titulo="Ventas diarias de los últimos 30 días, por negocio"
            datos={datos.columnas}
            series={e.negocios.map((n, i) => ({ nombre: n.nombre, color: SERIES[i] }))}
            formato={(n) => formatoPesos(n, { sinDecimales: true })}
            formatoEje={formatoPesosCorto}
            alto={230}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra
          etiqueta="Ventas del mes"
          valor={formatoPesosCorto(datos.mes.total)}
          delta={<Delta valor={variacion(datos.mes.total, datos.mesAnterior.total)} periodo="el mismo período del mes pasado" />}
          tendencia={datos.sparkDiario}
        />
        <Cifra etiqueta="Ticket promedio · 30 días" valor={formatoPesosCorto(ticket)} delta={<Delta valor={variacion(ticket, ticketPrev)} periodo="los 30 días anteriores" />} />
        {puede("costos.ver") ? (
          <Cifra
            etiqueta="Margen bruto · 30 días"
            valor={margen === null ? "—" : `${margen.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`}
            delta={margen !== null && margenPrev !== null ? <DeltaPuntos valor={margen - margenPrev} /> : undefined}
          />
        ) : (
          <Cifra etiqueta="Ventas · 30 días" valor={datos.ult30.cantidad.toLocaleString("es-AR")} />
        )}
        <Cifra
          etiqueta="Presupuestos abiertos"
          valor={datos.presupuestosAbiertos.length.toLocaleString("es-AR")}
          pie={`${formatoPesosCorto(datos.presupuestosAbiertos.reduce((t, p) => t + p.total, 0))} en juego · ${formatoPesosCorto(datos.aCobrar)} a cobrar en cuentas corrientes`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListaAlertas alertas={datos.alertas} className="lg:col-span-1" />
        <Panel titulo="Lo más vendido del mes" ficha="Por facturación" className="lg:col-span-1">
          <BarrasHorizontales
            titulo="Productos más vendidos del mes por facturación"
            datos={datos.top.map((t) => ({ etiqueta: t.producto.nombre, valor: t.total, detalle: `${t.unidades.toLocaleString("es-AR")} unidades` }))}
            formato={formatoPesosCorto}
          />
        </Panel>
        <ActividadReciente className="lg:col-span-1" />
      </div>
    </div>
  )
}

function DeltaPuntos({ valor }: { valor: number }) {
  return (
    <span className={cn("text-xs font-semibold", valor >= 0 ? "text-ok-texto" : "text-error-texto")}>
      {valor >= 0 ? "+" : "−"}
      {Math.abs(valor).toLocaleString("es-AR", { maximumFractionDigits: 1 })} pts <span className="font-normal text-muted-foreground">vs 30 días anteriores</span>
    </span>
  )
}

function ListaAlertas({ alertas: lista, className }: { alertas: Alerta[]; className?: string }) {
  const { motor } = useApp()
  const { pendientes, estado } = useConexion()
  return (
    <Panel titulo="Para atender hoy" className={className}>
      <ul className="divide-y divide-linea">
        {estado === "sin_conexion" && pendientes > 0 && (
          <li className="flex items-center gap-3 py-2.5">
            <CloudOff className="size-4 text-chispa-texto" />
            <span className="flex-1 text-sm">
              {pendientes} cambio{pendientes === 1 ? "" : "s"} en cola en este equipo
            </span>
          </li>
        )}
        {lista.map((a) => (
          <li key={a.id}>
            <Link href={a.href} className="group flex items-center gap-3 py-2.5">
              <Punto tono={a.tono} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{a.titulo}</span>
                <span className="block truncate text-xs text-muted-foreground">{a.detalle}</span>
              </span>
              <span className="num rounded-md bg-muted px-2 py-0.5 text-sm font-semibold">{a.cantidad}</span>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
        {lista.length === 0 && (
          <li className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-ok-texto" /> Todo en orden.
          </li>
        )}
      </ul>
      {motor.estado.org.esDemo && <p className="mt-3 text-[11px] text-muted-foreground">Datos de la empresa demo.</p>}
    </Panel>
  )
}

function ActividadReciente({ className }: { className?: string }) {
  const { e, v } = useDatos()
  const { puede } = useApp()
  const items = useMemo(() => e.auditoria.slice(0, 8), [e, v]) // eslint-disable-line react-hooks/exhaustive-deps
  const nombre = (id: string) => e.usuarios.find((u) => u.id === id)?.nombre.split(" ")[0] ?? "—"
  return (
    <Panel titulo="Actividad reciente" accion={puede("auditoria.ver") ? <Link href="/app/auditoria" className="text-xs text-enlace hover:underline">Ver todo</Link> : undefined} className={className}>
      <ol className="space-y-2.5">
        {items.map((a) => (
          <li key={a.id} className="flex gap-3 text-sm">
            <span className="num mt-0.5 w-11 shrink-0 text-[11px] text-muted-foreground">
              {new Date(a.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{a.resumen}</span>
              <span className="text-xs text-muted-foreground">
                {nombre(a.usuarioId)}
                {a.origen === "sin_conexion" && " · hecha sin conexión"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/** Mostrador y depósito: foco en su sucursal y en lo que tienen que hacer. */
function TableroOperativo() {
  const { e, v } = useDatos()
  const { usuario, sucursalId, puede } = useApp()
  const f = useFechas()
  const sucursal = e.sucursales.find((s) => s.id === sucursalId)!
  const datos = useMemo(() => {
    const ventas = ventasConfirmadas(e, { sucursalId })
    return {
      hoy: resumir(ventas, f.kHoy, f.kHoy),
      semanaPasada: resumir(ventas, f.kSemanaPasada, f.kSemanaPasada),
      alertas: alertas(e, f.ahora, usuario.sucursalIds === null ? [sucursalId] : usuario.sucursalIds),
      ultimas: ventas.filter((x) => diaDe(x.fecha) === f.kHoy).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, sucursalId])
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {puede("mostrador.vender") && (
          <Button asChild size="lg" className="h-14 justify-start text-base">
            <Link href="/app/mostrador">
              <ShoppingCart /> Nueva venta
            </Link>
          </Button>
        )}
        {puede("presupuestos.editar") && (
          <Button asChild size="lg" variant="outline" className="h-14 justify-start text-base">
            <Link href="/app/presupuestos/nuevo">
              <FilePlus2 /> Nuevo presupuesto
            </Link>
          </Button>
        )}
        <Button asChild size="lg" variant="outline" className="h-14 justify-start text-base">
          <Link href="/app/inventario">
            <PackageSearch /> Consultar stock
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {puede("ventas.ver") && (
          <Panel titulo={`Hoy en ${sucursal.nombre}`} ficha={sucursal.codigo}>
            <p className="text-4xl font-semibold tracking-tight">{formatoPesosCorto(datos.hoy.total)}</p>
            <Delta valor={variacion(datos.hoy.total, datos.semanaPasada.total)} periodo="el mismo día de la semana pasada" />
            <p className="mt-1 text-xs text-muted-foreground">{datos.hoy.cantidad} ventas</p>
            <ul className="mt-4 divide-y divide-linea">
              {datos.ultimas.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="ficha">{x.numero ? `#${x.numero}` : x.numeroLocal}</span>
                  <span className="num">{formatoPesos(x.total)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <ListaAlertas alertas={datos.alertas} />
        <ActividadReciente />
      </div>
    </div>
  )
}

function TableroTaller() {
  const { e, v } = useDatos()
  const { usuario } = useApp()
  const ordenes = useMemo(() => Object.values(e.servicio), [e, v]) // eslint-disable-line react-hooks/exhaustive-deps
  const activos: EstadoServicio[] = ESTADOS_SERVICIO.filter((s) => s !== "entregado" && s !== "sin_reparacion")
  const mias = ordenes.filter((o) => o.tecnicoId === usuario.id && activos.includes(o.estado))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {activos.map((s) => (
          <Link key={s} href={`/app/servicio?estado=${s}`} className="rounded-xl border border-linea bg-card p-4 hover:border-acero/40">
            <p className="text-xs text-muted-foreground">{NOMBRE_ESTADO_SERVICIO[s]}</p>
            <p className="text-2xl font-semibold">{ordenes.filter((o) => o.estado === s).length}</p>
          </Link>
        ))}
      </div>
      <Panel titulo="Mis órdenes en curso" accion={<Button asChild size="sm" variant="outline"><Link href="/app/servicio"><Wrench /> Ir al taller</Link></Button>}>
        {mias.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenés órdenes asignadas en curso.</p>
        ) : (
          <ul className="divide-y divide-linea">
            {mias.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <Ficha>ST #{o.numero ?? o.numeroLocal}</Ficha>
                <span className="font-medium">
                  {o.equipo.marca} {o.equipo.modelo}
                </span>
                <span className="text-muted-foreground">{o.falla}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs">
                  {o.prioridad === "urgente" && <AlertTriangle className="size-3.5 text-chispa-texto" />}
                  {NOMBRE_ESTADO_SERVICIO[o.estado]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
