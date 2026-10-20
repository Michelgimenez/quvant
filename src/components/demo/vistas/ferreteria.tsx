"use client"

import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ArrowRight, Check, PackageCheck, Plus, Send, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { lanzarSalto } from "@/components/marca/salto"
import { Fila, Numero, Tarjeta } from "@/components/negocio/piezas"
import { formatoPesos } from "@/dominio/dinero"
import { hash } from "@/demo/azar"
import type { OrdenVisitante, TransferenciaVisitante } from "@/demo/estado-visitante"
import { cn } from "@/lib/utils"
import { nuevoId } from "@/demo/ids"
import { horaCorta, useAhoraDemo, useDatosEmpresa, useDemo, useTiendaDemo } from "../contexto"
import { EncabezadoModulo } from "./vista-modulo"

const pesos = (c: number) => formatoPesos(c, { sinDecimales: true })
const fecha = (iso: string) => new Date(Date.parse(iso) - 3 * 3600000).toISOString().slice(5, 10).split("-").reverse().join("/")

/** Presupuestos: elegir uno y pasarlo a venta (con el salto: un presupuesto que se cierra). */
export function PresupuestosFerreteria() {
  const datos = useDatosEmpresa("ferreteria")
  const tienda = useTiendaDemo()
  const ahora = useAhoraDemo()
  const movimientos = useDemo((s) => s.porEmpresa.ferreteria.movimientos)
  const x = datos.extras.tipo === "comercio" ? datos.extras : null
  const convertidos = new Set(movimientos.filter((m) => m.tipo === "presupuesto-venta").map((m) => m.ref))
  const [elegido, setElegido] = useState(x?.presupuestos[0]?.id ?? "")
  const boton = useRef<HTMLButtonElement>(null)
  const p = x?.presupuestos.find((q) => q.id === elegido)
  // Los renglones del presupuesto (en el modelo de lectura solo viaja el total): productos reales del catálogo.
  const renglones = useMemo(() => {
    if (!p) return []
    const n = 3 + (hash(p.id) % 4)
    const lista = Array.from({ length: n }, (_, i) => datos.productos[hash(p.id, i) % datos.productos.length])
    const base = lista.reduce((a, q) => a + q.precio, 0) || 1
    return lista.map((q) => ({ q, cantidad: Math.max(1, Math.round(p.monto / base)) }))
  }, [p, datos])
  const pasarAVenta = () => {
    if (!p) return
    tienda.getState().registrar("ferreteria", "movimientos", { id: nuevoId("pv"), t: ahora, tipo: "presupuesto-venta", detalle: `${p.numero} · ${p.cliente}`, monto: p.monto, ref: p.id })
    tienda.getState().registrar("ferreteria", "ventas", { id: nuevoId("vf"), t: ahora, monto: p.monto, items: [], medio: "cuenta", sinConexion: false, sincronizada: true })
    lanzarSalto({ desde: boton.current, mensaje: "Presupuesto → venta" })
  }
  return (
    <div>
      <EncabezadoModulo empresa="ferreteria" modulo="presupuestos" detalle="Presupuestos prolijos que pasan a venta con un clic: los precios, el stock y el cliente ya están." />
      <div className="grid grid-cols-[1fr_380px] gap-4">
        <Tarjeta etiqueta={`Abiertos · ${(x?.presupuestos.length ?? 0) - convertidos.size}`}>
          <table className="w-full">
            <thead>
              <tr className="t-etiqueta text-left text-muted-foreground">
                <th className="pb-2 font-medium">Número</th>
                <th className="pb-2 font-medium">Cliente</th>
                <th className="pb-2 text-right font-medium">Monto</th>
                <th className="pb-2 text-right font-medium">Vence</th>
                <th className="pb-2 pl-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {(x?.presupuestos ?? []).map((q) => {
                const hecho = convertidos.has(q.id)
                return (
                  <tr key={q.id} onClick={() => setElegido(q.id)} className={cn("t-dato h-10 cursor-pointer", elegido === q.id && "bg-muted")}>
                    <td className="pl-1">{q.numero}</td>
                    <td className="max-w-0 truncate pr-3">{q.cliente}</td>
                    <td className="text-right font-semibold">{pesos(q.monto)}</td>
                    <td className="text-right text-muted-foreground">{fecha(q.vence)}</td>
                    <td className="pl-3">
                      <span className={cn("t-etiqueta", hecho ? "text-ok" : q.estado === "por-vencer" ? "text-alerta" : "text-muted-foreground")}>{hecho ? "Venta" : q.estado === "por-vencer" ? "Por vencer" : "Abierto"}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Tarjeta>
        {p && (
          <Tarjeta densidad="amplia" etiqueta={p.numero} titulo={p.cliente} className="self-start" flip="t-presupuesto">
            <ul className="divide-y divide-linea">
              {renglones.map(({ q, cantidad }, i) => (
                <li key={`${q.id}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="t-texto-sm truncate">
                    {cantidad} × {q.nombre}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-end justify-between border-t border-linea pt-3">
              <span className="t-etiqueta text-muted-foreground">Total</span>
              <Numero valor={p.monto} tamano="lg" />
            </div>
            {convertidos.has(p.id) ? (
              <p className="t-titulo-sm flex items-center gap-2 text-ok">
                <Check className="size-5" /> Ya es una venta
              </p>
            ) : (
              <Button ref={boton} className="h-12" onClick={pasarAVenta} data-testid="pasar-a-venta">
                Pasar a venta <ArrowRight />
              </Button>
            )}
          </Tarjeta>
        )}
      </div>
    </div>
  )
}

/** Transferencias entre sucursales: despachar y recibir, con registro. */
export function TransferenciasFerreteria() {
  const datos = useDatosEmpresa("ferreteria")
  const tienda = useTiendaDemo()
  const ahora = useAhoraDemo()
  const propias = useDemo((s) => s.porEmpresa.ferreteria.transferencias)
  const estados = useDemo((s) => s.porEmpresa.ferreteria.estados)
  const x = datos.extras.tipo === "comercio" ? datos.extras : null
  const [desde, setDesde] = useState(0)
  const [hasta, setHasta] = useState(1)
  // Lo que conviene mandar: lo que falta en la sucursal de destino.
  const sugeridos = datos.stockCritico.filter((c) => c.sucursal === hasta).slice(0, 4).map((c) => datos.productos.find((p) => p.id === c.productoId)).filter(Boolean)
  const despachar = () => {
    const n = propias.length + 1
    const t: TransferenciaVisitante = { id: nuevoId("tv"), numero: `TR-${String(2200 + n).padStart(5, "0")}`, t: ahora, desde, hasta, items: sugeridos.map((p) => ({ productoId: p!.id, nombre: p!.nombre, cantidad: 4 })), estado: "en-viaje" }
    tienda.getState().registrar("ferreteria", "transferencias", t)
    toast.success(`${t.numero} despachada a ${datos.sucursales[hasta].nombre}`)
  }
  const lista = [
    ...propias.map((t) => ({ id: t.id, numero: t.numero, desde: t.desde, hasta: t.hasta, items: t.items.length, estado: t.estado, propia: true, t: t.t })),
    ...(x?.transferencias ?? []).map((t) => ({ ...t, estado: (estados[t.id] as typeof t.estado) ?? t.estado, propia: false, t: 0 })),
  ]
  const recibir = (id: string, propia: boolean) => {
    if (propia) tienda.getState().actualizar("ferreteria", (a) => ({ ...a, transferencias: a.transferencias.map((t) => (t.id === id ? { ...t, estado: "recibida" } : t)) }))
    else tienda.getState().actualizar("ferreteria", (a) => ({ ...a, estados: { ...a.estados, [id]: "recibida" } }))
    toast.success("Transferencia recibida: el stock ya se movió")
  }
  return (
    <div>
      <EncabezadoModulo empresa="ferreteria" modulo="transferencias" detalle="Mover mercadería entre sucursales con registro: sale de una, viaja y entra en la otra." />
      <div className="grid grid-cols-[1fr_400px] gap-4">
        <Tarjeta etiqueta="Transferencias">
          <ul className="divide-y divide-linea">
            {lista.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                {t.estado === "recibida" ? <PackageCheck className="size-4 text-ok" /> : <Truck className="size-4 text-alerta" />}
                <span className="min-w-0 flex-1">
                  <span className="t-dato block">
                    {t.numero} · {datos.sucursales[t.desde]?.codigo} → {datos.sucursales[t.hasta]?.codigo}
                  </span>
                  <span className="t-etiqueta block text-muted-foreground">
                    {t.items} productos · {t.estado === "recibida" ? "recibida" : "en viaje"}
                    {t.propia && ` · ${horaCorta(t.t)}`}
                  </span>
                </span>
                {t.estado !== "recibida" && (
                  <Button size="sm" variant="outline" onClick={() => recibir(t.id, t.propia)}>
                    Recibir
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta densidad="amplia" etiqueta="Nueva transferencia" className="self-start">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Desde", desde, setDesde],
              ["Hacia", hasta, setHasta],
            ].map(([nombre, valor, set]) => (
              <label key={nombre as string} className="space-y-1">
                <span className="t-etiqueta text-muted-foreground">{nombre as string}</span>
                <select value={valor as number} onChange={(e) => (set as (n: number) => void)(Number(e.target.value))} className="t-texto-sm h-11 w-full rounded-lg border border-input bg-background px-2">
                  {datos.sucursales.map((s, i) => (
                    <option key={s.id} value={i}>
                      {s.codigo} · {s.nombre}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="t-etiqueta text-muted-foreground">Lo que falta en {datos.sucursales[hasta]?.nombre}</p>
          <ul className="space-y-1.5">
            {sugeridos.map((p) => (
              <Fila key={p!.id} etiqueta={p!.nombre} valor="4 u" />
            ))}
            {!sugeridos.length && <p className="t-texto-sm text-muted-foreground">No hay faltantes en esa sucursal.</p>}
          </ul>
          <Button className="h-12" disabled={desde === hasta || !sugeridos.length} onClick={despachar} data-testid="despachar-transferencia">
            <Truck /> Despachar
          </Button>
        </Tarjeta>
      </div>
    </div>
  )
}

const COLUMNAS = [
  { estado: "ingresado", nombre: "Ingresados" },
  { estado: "diagnostico", nombre: "Diagnóstico" },
  { estado: "reparacion", nombre: "En reparación" },
  { estado: "listo", nombre: "Listos" },
] as const
const SIGUIENTE: Record<string, OrdenVisitante["estado"]> = { ingresado: "diagnostico", diagnostico: "reparacion", reparacion: "listo", listo: "entregado" }

/** Servicio técnico: las órdenes por estado, una orden nueva y el aviso al cliente (emulado). */
export function ServicioFerreteria() {
  const datos = useDatosEmpresa("ferreteria")
  const tienda = useTiendaDemo()
  const ahora = useAhoraDemo()
  const propias = useDemo((s) => s.porEmpresa.ferreteria.ordenes)
  const estados = useDemo((s) => s.porEmpresa.ferreteria.estados)
  const x = datos.extras.tipo === "comercio" ? datos.extras : null
  const [nueva, setNueva] = useState<{ cliente: string; equipo: string; falla: string } | null>(null)
  const ordenes = [
    ...propias.map((o) => ({ id: o.id, numero: o.numero, cliente: o.cliente, equipo: o.equipo, estado: o.estado, tecnico: "Sin asignar", propia: true })),
    ...(x?.servicio ?? []).map((o) => ({ ...o, estado: (estados[o.id] as OrdenVisitante["estado"]) ?? o.estado, propia: false })),
  ]
  const avanzar = (id: string, propia: boolean, estado: string) => {
    const proximo = SIGUIENTE[estado]
    if (propia) tienda.getState().actualizar("ferreteria", (a) => ({ ...a, ordenes: a.ordenes.map((o) => (o.id === id ? { ...o, estado: proximo } : o)) }))
    else tienda.getState().actualizar("ferreteria", (a) => ({ ...a, estados: { ...a.estados, [id]: proximo } }))
    if (proximo === "listo") toast.success("Equipo listo. El aviso al cliente queda armado (WhatsApp emulado).")
  }
  return (
    <div>
      <EncabezadoModulo
        empresa="ferreteria"
        modulo="servicio"
        detalle="Órdenes de reparación con su estado, el técnico y el aviso al cliente cuando está listo."
        acciones={
          <Button size="lg" onClick={() => setNueva({ cliente: "", equipo: "", falla: "" })} data-testid="nueva-orden">
            <Plus /> Nueva orden
          </Button>
        }
      />
      {nueva && (
        <Tarjeta densidad="amplia" etiqueta="Ingreso de un equipo" className="mb-4">
          <div className="grid grid-cols-3 gap-3">
            <Input value={nueva.cliente} onChange={(e) => setNueva({ ...nueva, cliente: e.target.value })} placeholder="Cliente" className="h-11" aria-label="Cliente" />
            <Input value={nueva.equipo} onChange={(e) => setNueva({ ...nueva, equipo: e.target.value })} placeholder="Equipo (p. ej. amoladora 115 mm)" className="h-11" aria-label="Equipo" />
            <Input value={nueva.falla} onChange={(e) => setNueva({ ...nueva, falla: e.target.value })} placeholder="Falla" className="h-11" aria-label="Falla" />
          </div>
          <Button
            className="h-11 self-start"
            disabled={!nueva.cliente || !nueva.equipo}
            onClick={() => {
              tienda.getState().registrar("ferreteria", "ordenes", { id: nuevoId("os"), numero: `ST-${String(400 + propias.length + 1).padStart(5, "0")}`, t: ahora, cliente: nueva.cliente, equipo: nueva.equipo, falla: nueva.falla, estado: "ingresado" })
              setNueva(null)
              toast.success("Orden ingresada")
            }}
            data-testid="guardar-orden"
          >
            Ingresar
          </Button>
        </Tarjeta>
      )}
      <div className="grid grid-cols-4 gap-3">
        {COLUMNAS.map((c) => {
          const lista = ordenes.filter((o) => o.estado === c.estado)
          return (
            <Tarjeta key={c.estado} etiqueta={`${c.nombre} · ${lista.length}`} densidad="densa" className="self-start">
              <ul className="space-y-2">
                {lista.map((o) => (
                  <li key={o.id} className="space-y-1.5 rounded-md border border-linea bg-superficie-2 p-2.5">
                    <p className="t-dato flex justify-between">
                      <span>{o.numero}</span>
                      <span className="text-muted-foreground">{o.tecnico}</span>
                    </p>
                    <p className="t-texto-sm truncate">{o.equipo}</p>
                    <p className="t-etiqueta truncate text-muted-foreground">{o.cliente}</p>
                    <div className="flex gap-1.5">
                      {c.estado === "listo" ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => toast.info(`Aviso a ${o.cliente} armado (WhatsApp emulado).`)}>
                            <Send /> Avisar
                          </Button>
                          <Button size="sm" onClick={() => avanzar(o.id, o.propia, o.estado)}>
                            <Check /> Entregado
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => avanzar(o.id, o.propia, o.estado)}>
                          Avanzar <ArrowRight />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
                {!lista.length && <p className="t-texto-sm text-muted-foreground">Nada acá.</p>}
              </ul>
            </Tarjeta>
          )
        })}
      </div>
    </div>
  )
}
