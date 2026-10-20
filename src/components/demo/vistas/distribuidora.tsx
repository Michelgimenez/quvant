"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { toast } from "sonner"
import { Check, HandCoins, MapPin, Smartphone, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Grilla } from "@/components/marca/grilla"
import { Avance, Fila, Numero, Tarjeta } from "@/components/negocio/piezas"
import { formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import { hash, redondearPrecio } from "@/demo/azar"
import { nuevoId } from "@/demo/ids"
import { cn } from "@/lib/utils"
import { hace, horaCorta, useAhoraDemo, useDatosEmpresa, useDemo, useTiendaDemo } from "../contexto"
import { useResumen } from "../tableros/comun"
import { EncabezadoModulo } from "./vista-modulo"

const pesos = (c: number) => formatoPesos(c, { sinDecimales: true })

type PedidoVista = { id: string; numero: string; t: number; preventista: string; zona: string; clienteId: string; cliente: string; lista: string; monto: number; items: number; nuevo: boolean }

/** La preventa: los pedidos que llegan desde la calle, con la lista de precios de cada cliente. */
export function PreventaDistribuidora() {
  const datos = useDatosEmpresa("distribuidora")
  const { resumen } = useResumen("distribuidora")
  const tienda = useTiendaDemo()
  const ahora = useAhoraDemo()
  const movimientos = useDemo((s) => s.porEmpresa.distribuidora.movimientos)
  const x = datos.extras.tipo === "distribuidora" ? datos.extras : null
  const cliente = (id: string) => datos.clientes.find((c) => c.id === id)
  const pedidos: PedidoVista[] = useMemo(() => {
    const propios = movimientos
      .filter((m) => m.tipo === "pedido")
      .map((m) => {
        const c = cliente(m.ref ?? "")
        return { id: m.id, numero: m.detalle, t: m.t, preventista: "Vos (demo)", zona: c?.zona ?? "", clienteId: c?.id ?? "", cliente: c?.nombre ?? "", lista: c?.lista ?? "", monto: m.monto, items: 12, nuevo: true }
      })
    // Los del simulador (los "h-" del resumen son los mismos pedidos de la historia: no se repiten).
    const simulados = resumen.ultimos
      .filter((e) => e.tipo === "pedido" && !e.id.startsWith("h-"))
      .map((e) => {
        const nombre = e.detalle.replace("Pedido · ", "")
        const c = datos.clientes.find((q) => q.nombre === nombre)
        return { id: e.id, numero: `PV-${String(19000 + (hash(e.id) % 900)).padStart(6, "0")}`, t: e.t, preventista: e.quien, zona: c?.zona ?? x?.preventistas.find((p) => p.nombre === e.quien)?.zona ?? "", clienteId: c?.id ?? "", cliente: nombre, lista: c?.lista ?? "", monto: e.monto, items: e.items ?? 10, nuevo: false }
      })
    const historia = (x?.pedidosHoy ?? []).slice(0, 14).map((p) => {
      const c = cliente(p.clienteId)
      return { id: p.id, numero: p.numero, t: Date.parse(p.t), preventista: x?.preventistas[p.preventista]?.nombre ?? "", zona: c?.zona ?? "", clienteId: p.clienteId, cliente: c?.nombre ?? "", lista: c?.lista ?? "", monto: p.monto, items: p.items, nuevo: false }
    })
    return [...propios, ...simulados, ...historia].sort((a, b) => b.t - a.t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientos, resumen.ultimos, datos])
  const [elegido, setElegido] = useState<string | null>(null)
  const p = pedidos.find((q) => q.id === elegido) ?? pedidos[0]
  const c = p ? (cliente(p.clienteId) ?? datos.clientes[hash(p.id) % datos.clientes.length]) : null
  const lista = x?.listas.find((l) => l.nombre === c?.lista) ?? x?.listas[0]
  const renglones = useMemo(() => {
    if (!p) return []
    return Array.from({ length: Math.min(6, 3 + (hash(p.id) % 4)) }, (_, i) => {
      const q = datos.productos[hash(p.id, "r", i) % datos.productos.length]
      const precio = Math.round(redondearPrecio((q.precio / 100) * (1 + (lista?.ajuste ?? 0) / 100)) * 100)
      return { q, cantidad: 1 + (hash(p.id, "c", i) % 6), precio }
    })
  }, [p, datos, lista])
  const entrante = useRef<HTMLDivElement>(null)
  const ultimoNuevo = pedidos[0]?.id
  useEffect(() => {
    if (entrante.current) gsap.fromTo(entrante.current, { y: -10, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" })
  }, [ultimoNuevo])
  /** Un pedido desde la calle: un preventista lo carga en el celular y llega acá. */
  const simularPedido = () => {
    const pv = x?.preventistas[hash("pv", movimientos.length) % 12]
    const zona = datos.clientes.filter((q) => q.zona === pv?.zona)
    const cl = zona[hash("cli", movimientos.length) % zona.length] ?? datos.clientes[0]
    const monto = Math.round(redondearPrecio(380000 + (hash("monto", movimientos.length) % 600000)) * 100)
    tienda.getState().registrar("distribuidora", "movimientos", { id: nuevoId("pd"), t: ahora, tipo: "pedido", detalle: `PV-${String(20500 + movimientos.length).padStart(6, "0")}`, monto, ref: cl.id })
    setElegido(null)
  }
  return (
    <div>
      <EncabezadoModulo
        empresa="distribuidora"
        modulo="preventa"
        detalle="Los preventistas cargan el pedido en la calle, desde el celular, con la lista de precios de cada cliente. Acá llega al instante."
        acciones={
          <Button size="lg" onClick={simularPedido} data-testid="simular-pedido">
            <Smartphone /> Simular un pedido desde la calle
          </Button>
        }
      />
      <div className="grid grid-cols-[1fr_400px] gap-4">
        <Tarjeta etiqueta={`Pedidos de hoy · ${resumen.pedidosHoy}`} titulo={`${formatoPesosCorto(resumen.montoPedidosHoy)} en la calle`}>
          <ul className="divide-y divide-linea">
            {pedidos.slice(0, 13).map((q, i) => (
              <li key={q.id}>
                <div ref={i === 0 ? entrante : undefined}>
                  <button type="button" onClick={() => setElegido(q.id)} className={cn("flex w-full items-center gap-3 py-2 text-left", p?.id === q.id && "bg-muted")}>
                    <span className="t-dato w-12 shrink-0 text-muted-foreground">{horaCorta(q.t)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="t-texto-sm block truncate">{q.cliente}</span>
                      <span className="t-etiqueta block truncate text-muted-foreground">
                        {q.preventista} · {q.zona}
                      </span>
                    </span>
                    {q.nuevo && <span className="t-etiqueta border border-gris-5 px-1.5 py-0.5 text-foreground">Nuevo</span>}
                    <span className="t-dato w-24 shrink-0 text-right font-semibold">{pesos(q.monto)}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
        {p && c && (
          <Tarjeta densidad="amplia" etiqueta={`${p.numero} · ${hace(p.t, ahora)}`} titulo={c.nombre} className="self-start">
            <div className="space-y-1.5">
              <Fila etiqueta="Preventista" valor={p.preventista} />
              <Fila etiqueta="Lista de precios" valor={`${lista?.nombre ?? ""}${lista?.ajuste ? ` · +${lista.ajuste} %` : ""}`} />
              <Fila etiqueta="Cuenta corriente" valor={c.saldo ? `debe ${pesos(c.saldo)}` : "al día"} />
            </div>
            <ul className="divide-y divide-linea border-t border-linea">
              {renglones.map(({ q, cantidad, precio }, i) => (
                <li key={`${q.id}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="t-texto-sm min-w-0 truncate">
                    {cantidad} × {q.nombre}
                  </span>
                  <span className="t-dato shrink-0">{pesos(precio * cantidad)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-end justify-between">
              <span className="t-etiqueta text-muted-foreground">Total del pedido</span>
              <Numero valor={p.monto} tamano="lg" />
            </div>
            <Button className="h-11" onClick={() => toast.success(`${p.numero} pasó a armado en el depósito`)}>
              <Check /> Mandar a armar
            </Button>
          </Tarjeta>
        )}
      </div>
    </div>
  )
}

/** La hoja de ruta: un mapa esquemático sobre la grilla de puntos, con el depósito y las paradas de cada camión. */
export function RepartoDistribuidora() {
  const datos = useDatosEmpresa("distribuidora")
  const { resumen } = useResumen("distribuidora")
  const x = datos.extras.tipo === "distribuidora" ? datos.extras : null
  const [camion, setCamion] = useState(0)
  const reparto = x?.reparto ?? []
  // Las entregas simuladas van completando paradas en orden, camión por camión.
  const extra = Math.max(0, resumen.reparto.entregadas - reparto.flatMap((r) => r.paradas).filter((q) => q.estado === "entregado").length)
  const camiones = reparto.map((r, k) => {
    let sumar = Math.floor(extra / reparto.length) + (k < extra % reparto.length ? 1 : 0)
    const paradas = r.paradas.map((q) => {
      if (q.estado !== "entregado" && sumar > 0) {
        sumar--
        return { ...q, estado: "entregado" as const }
      }
      return q
    })
    const proxima = paradas.findIndex((q) => q.estado !== "entregado")
    return { ...r, paradas: paradas.map((q, j) => (j === proxima ? { ...q, estado: "en-camino" as const } : q)) }
  })
  const W = 640
  const H = 520
  const elegido = camiones[camion]
  // Al elegir un camión, su ruta se dibuja desde el depósito (un trazo SVG; quieto si se pidió menos movimiento).
  const ruta = useRef<SVGPolylineElement>(null)
  useEffect(() => {
    if (!ruta.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(ruta.current, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.out" })
  }, [camion])
  const cliente = (id: string) => datos.clientes.find((c) => c.id === id)
  return (
    <div>
      <EncabezadoModulo empresa="distribuidora" modulo="reparto" detalle={`La hoja de ruta de hoy: ${camiones.length} camiones salen del depósito y entregan lo que se vendió ayer.`} />
      <div className="grid grid-cols-[1fr_360px] gap-4">
        <Tarjeta etiqueta={`Rosario y alrededores · ${resumen.reparto.entregadas} de ${resumen.reparto.total} entregas`} flip="t-mapa-reparto">
          <div className="relative overflow-hidden rounded-md border border-linea bg-negro">
            <Grilla paso={20} />
            <svg viewBox={`0 0 ${W} ${H}`} className="relative block w-full" role="img" aria-label="Hoja de ruta del reparto">
              {camiones.map((r, k) => {
                const activo = k === camion
                const puntos = [{ x: 0.5, y: 0.5 }, ...r.paradas].map((q) => `${q.x * W},${q.y * H}`).join(" ")
                return activo ? (
                  <polyline key={r.id} ref={ruta} points={puntos} fill="none" style={{ stroke: "var(--serie-1)" }} strokeWidth={2} pathLength={1} strokeDasharray="1" strokeLinejoin="round" />
                ) : (
                  <polyline key={r.id} points={puntos} fill="none" style={{ stroke: "var(--gris-5)" }} strokeWidth={1.2} strokeDasharray="3 5" strokeLinejoin="round" />
                )
              })}
              {camiones.map((r, k) =>
                r.paradas.map((q, j) => {
                  const activo = k === camion
                  const lado = activo ? 9 : 6
                  const cx = q.x * W
                  const cy = q.y * H
                  return (
                    <g key={`${r.id}-${j}`} onClick={() => setCamion(k)} className="cursor-pointer">
                      {q.estado === "en-camino" && activo && <rect x={cx - lado} y={cy - lado} width={lado * 2} height={lado * 2} fill="none" style={{ stroke: "var(--serie-1)" }} strokeWidth={1} />}
                      <rect
                        x={cx - lado / 2}
                        y={cy - lado / 2}
                        width={lado}
                        height={lado}
                        style={{
                          fill: q.estado === "entregado" ? (activo ? "var(--blanco)" : "var(--gris-7)") : q.estado === "en-camino" ? "var(--serie-1)" : "none",
                          stroke: q.estado === "pendiente" ? (activo ? "var(--blanco)" : "var(--gris-6)") : "none",
                        }}
                        strokeWidth={1.2}
                      />
                    </g>
                  )
                }),
              )}
              <rect x={W / 2 - 9} y={H / 2 - 9} width={18} height={18} style={{ fill: "var(--blanco)" }} />
              <text x={W / 2} y={H / 2 - 20} textAnchor="middle" style={{ fill: "var(--acero)", fontFamily: "var(--marca-texto)" }} fontSize={11} letterSpacing={2}>
                DEPÓSITO
              </text>
            </svg>
          </div>
          <div className="t-etiqueta flex flex-wrap gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 bg-blanco" /> Entregado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 bg-[var(--serie-1)]" /> En camino
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 border border-blanco" /> Pendiente
            </span>
          </div>
        </Tarjeta>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {camiones.map((r, k) => {
              const hechas = r.paradas.filter((q) => q.estado === "entregado").length
              return (
                <button key={r.id} type="button" onClick={() => setCamion(k)} aria-pressed={k === camion} className={cn("rounded-lg border p-3 text-left transition-colors", k === camion ? "border-gris-8 bg-muted" : "border-linea hover:border-gris-5")}>
                  <span className="t-etiqueta flex items-center gap-1.5">
                    <Truck className="size-3.5" /> Camión {k + 1}
                  </span>
                  <span className="t-numero mt-1 block">
                    {hechas}/{r.paradas.length}
                  </span>
                  <Avance valor={hechas / r.paradas.length} marca={k === camion} className="mt-1.5" />
                </button>
              )
            })}
          </div>
          {elegido && (
            <Tarjeta etiqueta={`${elegido.chofer} · ${elegido.patente}`} densidad="densa">
              <ol className="divide-y divide-linea">
                {elegido.paradas.map((q, j) => (
                  <li key={j} className="flex items-center gap-2 py-1.5">
                    <span className="t-dato w-5 text-muted-foreground">{j + 1}</span>
                    {q.estado === "entregado" ? <Check className="size-3.5 text-ok" /> : q.estado === "en-camino" ? <MapPin className="size-3.5 text-[var(--serie-1)]" /> : <span className="size-3.5" />}
                    <span className={cn("t-texto-sm min-w-0 flex-1 truncate", q.estado === "entregado" && "text-muted-foreground")}>{cliente(q.clienteId)?.nombre}</span>
                    <span className="t-dato shrink-0">{formatoPesosCorto(q.monto)}</span>
                  </li>
                ))}
              </ol>
            </Tarjeta>
          )}
        </div>
      </div>
    </div>
  )
}

/** Cobranzas: elegir un cliente con deuda y registrar lo que pagó. La deuda baja en el momento. */
export function CobranzasDistribuidora() {
  const datos = useDatosEmpresa("distribuidora")
  const { resumen } = useResumen("distribuidora")
  const tienda = useTiendaDemo()
  const ahora = useAhoraDemo()
  const cobranzas = useDemo((s) => s.porEmpresa.distribuidora.cobranzas)
  const saldo = (id: string) => (datos.clientes.find((c) => c.id === id)?.saldo ?? 0) - cobranzas.filter((c) => c.clienteId === id).reduce((a, c) => a + c.monto, 0)
  const deudores = datos.clientes
    .map((c) => ({ ...c, debe: saldo(c.id) }))
    .filter((c) => c.debe > 0)
    .sort((a, b) => b.diasDeuda - a.diasDeuda || b.debe - a.debe)
    .slice(0, 40)
  const [elegido, setElegido] = useState(deudores[0]?.id ?? "")
  const c = deudores.find((d) => d.id === elegido) ?? deudores[0]
  const [monto, setMonto] = useState("")
  const cobrar = () => {
    if (!c) return
    const valor = Math.min(c.debe, Number(monto || 0) * 100 || c.debe)
    tienda.getState().registrar("distribuidora", "cobranzas", { id: nuevoId("cb"), t: ahora, clienteId: c.id, monto: valor })
    toast.success(`Cobranza de ${pesos(valor)} a ${c.nombre}: la deuda bajó`)
    setMonto("")
  }
  return (
    <div>
      <EncabezadoModulo empresa="distribuidora" modulo="cobranzas" detalle="Lo que se cobra en la calle o en el depósito baja la deuda del cliente en el momento, y queda en su cuenta corriente." />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Tarjeta etiqueta="Deuda en la calle" densidad="media">
          <Numero valor={resumen.deuda.total} formato="pesos-corto" tamano="lg" />
        </Tarjeta>
        <Tarjeta etiqueta="Vencida · más de 30 días" densidad="media">
          <Numero valor={resumen.deuda.vencida} formato="pesos-corto" tamano="lg" className="text-alerta" />
        </Tarjeta>
        <Tarjeta etiqueta="Cobrado hoy" densidad="media">
          <Numero valor={resumen.cobradoHoy} formato="pesos-corto" tamano="lg" />
        </Tarjeta>
      </div>
      <div className="grid grid-cols-[1fr_380px] gap-4">
        <Tarjeta etiqueta="Para cobrar · primero lo más viejo">
          <ul className="divide-y divide-linea">
            {deudores.slice(0, 12).map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setElegido(d.id)} className={cn("flex w-full items-center gap-3 py-2 text-left", c?.id === d.id && "bg-muted")}>
                  <span className="min-w-0 flex-1">
                    <span className="t-texto-sm block truncate">{d.nombre}</span>
                    <span className="t-etiqueta block text-muted-foreground">
                      {d.zona} · {d.diasDeuda} días
                    </span>
                  </span>
                  <span className={cn("t-dato font-semibold", d.diasDeuda > 30 && "text-alerta")}>{pesos(d.debe)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
        {c && (
          <Tarjeta densidad="amplia" etiqueta="Registrar una cobranza" titulo={c.nombre} className="self-start">
            <p className="t-etiqueta text-muted-foreground">Debe</p>
            <Numero valor={c.debe} tamano="lg" />
            <Fila etiqueta="Desde hace" valor={`${c.diasDeuda} días`} />
            <Fila etiqueta="Límite de crédito" valor={pesos(c.limite)} />
            <Input inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))} placeholder={`Todo: ${pesos(c.debe)}`} className="t-numero h-12" aria-label="Monto cobrado" />
            <Button className="h-12" onClick={cobrar} data-testid="registrar-cobranza">
              <HandCoins /> Registrar cobranza
            </Button>
          </Tarjeta>
        )}
      </div>
    </div>
  )
}
