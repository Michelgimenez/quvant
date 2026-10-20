"use client"

import { ArrowRight, NotebookPen, ShoppingCart, Truck, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatoPesos } from "@/dominio/dinero"
import type { ModuloDemo } from "@/demo/empresas"
import { Fila, Numero, Tarjeta, Variacion } from "@/components/negocio/piezas"
import { EncabezadoTablero, HorasDelDia, ListaEventos, useResumen } from "./comun"

/**
 * El tablero del kiosco: grande, simple y con pocas cosas muy claras. Se entiende sin explicación:
 * cuánto vendí hoy, cuánto hay en la caja, cuánto me deben y qué tengo que pedir.
 */
export function TableroKiosco({ onModulo }: { onModulo: (m: ModuloDemo) => void }) {
  const { datos, acciones, ahora, resumen } = useResumen("kiosco")
  const x = datos.extras.tipo === "kiosco" ? datos.extras : null
  const porHora = [...datos.hoyPorHora]
  // Las ventas simuladas y las del visitante caen en su hora.
  const horaActual = new Date(ahora - 3 * 3600000).getUTCHours()
  porHora[horaActual] += Math.max(0, resumen.ventasHoy - datos.hoyPorHora.reduce((a, b) => a + b, 0))
  const nombre = datos.extras.tipo === "kiosco" ? "Marta" : ""
  const top = datos.top.slice(0, 5).map((t) => ({ ...t, producto: datos.productos.find((p) => p.id === t.productoId) }))
  return (
    <div data-escala="kiosco">
      <EncabezadoTablero
        densidad="amplia"
        ahora={ahora}
        saludo={`Buenas tardes, ${nombre}.`}
        detalle="Kiosco La Esquina · una caja, todo en una pantalla."
        acciones={
          <Button size="lg" className="h-12 px-6" onClick={() => onModulo("mostrador")} data-testid="ir-vender">
            <ShoppingCart /> Vender
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-4">
        <Tarjeta densidad="amplia" etiqueta="Vendiste hoy" className="col-span-2" flip="t-ventas">
          <div className="flex items-end justify-between gap-8">
            <div className="space-y-2">
              <Numero valor={resumen.ventasHoy} tamano="xl" flip="n-ventas" />
              <Variacion valor={resumen.vsSemanaPasada} contra="el viernes pasado" />
              <p className="t-texto-sm text-muted-foreground">
                {resumen.ticketsHoy} ventas · ticket promedio {formatoPesos(resumen.ticketsHoy ? Math.round(resumen.ventasHoy / resumen.ticketsHoy) : 0, { sinDecimales: true })}
              </p>
            </div>
            <div className="w-[46%] pb-5">
              <HorasDelDia porHora={porHora} ahora={ahora} alto={96} />
            </div>
          </div>
        </Tarjeta>
        <Tarjeta densidad="amplia" etiqueta={resumen.caja.cerrada ? "La caja quedó cerrada" : "En la caja tiene que haber"} flip="t-caja">
          <Numero valor={resumen.caja.cerrada ? 0 : resumen.caja.esperado} tamano="lg" />
          <div className="space-y-1.5">
            <Fila etiqueta="Fondo de la mañana" valor={formatoPesos(resumen.caja.fondo, { sinDecimales: true })} />
            <Fila etiqueta="Ventas en efectivo" valor={formatoPesos(resumen.caja.efectivo, { sinDecimales: true })} />
            <Fila etiqueta="Tarjeta, QR y transferencias" valor={formatoPesos(resumen.caja.otros, { sinDecimales: true })} />
          </div>
          <Button size="lg" variant="outline" className="mt-auto h-11 w-full" onClick={() => onModulo("caja")} data-testid="ir-caja">
            <Wallet /> {resumen.caja.cerrada ? "Ver el cierre" : "Cerrar la caja"}
          </Button>
        </Tarjeta>

        <Tarjeta densidad="amplia" etiqueta="Te deben (fiado)" flip="t-fiado">
          <Numero valor={resumen.fiado.total} tamano="lg" />
          <p className="t-texto-sm text-muted-foreground">
            {resumen.fiado.vecinos} vecinos · el más viejo, hace {resumen.fiado.masViejo} días
          </p>
          <Button variant="ghost" className="mt-auto justify-between px-0 hover:bg-transparent" onClick={() => onModulo("fiado")}>
            <span className="flex items-center gap-2">
              <NotebookPen /> Ver el fiado
            </span>
            <ArrowRight />
          </Button>
        </Tarjeta>
        <Tarjeta densidad="amplia" etiqueta="Para pedir" flip="t-pedir">
          <div className="flex items-baseline gap-2">
            <Numero valor={resumen.paraPedir.cantidad} formato="entero" tamano="lg" />
            <span className="t-texto text-muted-foreground">productos</span>
          </div>
          <p className="t-texto-sm text-muted-foreground">Están por debajo del mínimo. {x?.proveedores[1]?.nombre} viene el {x?.proveedores[1]?.visita}.</p>
          <Button variant="ghost" className="mt-auto justify-between px-0 hover:bg-transparent" onClick={() => onModulo("proveedores")}>
            <span className="flex items-center gap-2">
              <Truck /> Ver el pedido sugerido
            </span>
            <ArrowRight />
          </Button>
        </Tarjeta>
        <Tarjeta densidad="amplia" etiqueta="Precios" flip="t-precios">
          <p className="t-titulo-sm">{x?.ultimoAumento.proveedor} subió {x?.ultimoAumento.porcentaje.toLocaleString("es-AR")} %</p>
          <p className="t-texto-sm text-muted-foreground">
            {x?.ultimoAumento.hace} · {x?.ultimoAumento.productos} productos actualizados de una vez, con la vista previa antes de aplicar.
          </p>
          <Button variant="ghost" className="mt-auto justify-between px-0 hover:bg-transparent" onClick={() => onModulo("precios")}>
            <span>Revisar precios</span>
            <ArrowRight />
          </Button>
        </Tarjeta>

        <Tarjeta densidad="amplia" etiqueta="Las últimas ventas" className="col-span-2" flip="t-ultimas">
          <ListaEventos
            densidad="amplia"
            ahora={ahora}
            max={5}
            eventos={[
              ...acciones.ventas
                .slice(-5)
                .reverse()
                .map((v) => ({ id: v.id, t: v.t, tipo: "venta" as const, sucursal: 0, monto: v.monto, detalle: v.items.map((i) => i.nombre).join(" · "), quien: v.sinConexion ? "Vos · sin conexión" : "Vos", medio: v.medio })),
              ...resumen.ultimos,
            ]
              .sort((a, b) => b.t - a.t)
              .slice(0, 5)}
          />
        </Tarjeta>
        <Tarjeta densidad="amplia" etiqueta="Lo que más sale" flip="t-top">
          <ul className="space-y-2.5">
            {top.map((t, i) => (
              <li key={t.productoId} className="flex items-baseline gap-3">
                <span className="t-dato w-4 text-muted-foreground">{i + 1}</span>
                <span className="t-texto-sm min-w-0 flex-1 truncate">{t.producto?.nombre}</span>
                <span className="t-dato text-muted-foreground">{t.unidades} u</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>
    </div>
  )
}
