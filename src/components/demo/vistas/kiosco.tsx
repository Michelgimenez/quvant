"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { toast } from "sonner"
import { Banknote, Check, CreditCard, Minus, NotebookPen, Plus, QrCode, ScanBarcode, Send, Smartphone, Trash2, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { lanzarSalto } from "@/components/marca/salto"
import { Fila, Numero, Tarjeta } from "@/components/negocio/piezas"
import { formatoPesos } from "@/dominio/dinero"
import type { MedioPago, ProductoNegocio } from "@/dominio/negocio"
import { normalizar } from "@/lib/texto"
import { cn } from "@/lib/utils"
import { nuevoId } from "@/demo/ids"
import { horaCorta, useAhoraDemo, useDatosEmpresa, useDemo, useTiendaDemo } from "../contexto"
import { ListaEventos, useResumen } from "../tableros/comun"
import { EncabezadoModulo } from "./vista-modulo"

const pesos = (c: number) => formatoPesos(c, { sinDecimales: true })
type Item = { producto: ProductoNegocio; cantidad: number }

/** El interruptor de conexión del kiosco y la sincronización al volver (con el salto: la cola se sincronizó). */
export function useConexionKiosco() {
  const sinConexion = useDemo((s) => s.sinConexion)
  const tienda = useTiendaDemo()
  const enCola = useDemo((s) => s.porEmpresa.kiosco.ventas.filter((v) => !v.sincronizada).length)
  const indicador = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (sinConexion || !enCola) return
    // Volvió internet: la cola se sincroniza sola (con el reloj de GSAP: la filmación lo reproduce igual).
    const t = gsap.delayedCall(1.3, () => {
      tienda.getState().actualizar("kiosco", (a) => ({ ...a, ventas: a.ventas.map((v) => ({ ...v, sincronizada: true })) }))
      lanzarSalto({ desde: indicador.current, mensaje: `Cola sincronizada · ${enCola} ${enCola === 1 ? "venta" : "ventas"}` })
    })
    return () => {
      t.kill()
    }
  }, [sinConexion, enCola, tienda])
  return { sinConexion, enCola, indicador, alternar: () => tienda.getState().setSinConexion(!sinConexion) }
}

function InterruptorConexion() {
  const { sinConexion, enCola, indicador, alternar } = useConexionKiosco()
  return (
    <button
      ref={indicador}
      type="button"
      onClick={alternar}
      aria-pressed={sinConexion}
      data-testid="cortar-conexion"
      className={cn("flex h-11 items-center gap-3 rounded-lg border px-4 transition-colors", sinConexion ? "border-alerta/70" : "border-linea hover:border-gris-5")}
    >
      {sinConexion ? <WifiOff className="size-5 text-alerta" /> : <Wifi className="size-5 text-ok" />}
      <span className="text-left">
        <span className="t-etiqueta block">{sinConexion ? "Sin conexión" : "Conectado"}</span>
        <span className="t-texto-sm block text-muted-foreground">{sinConexion ? `${enCola} ${enCola === 1 ? "venta" : "ventas"} en cola · se sigue vendiendo` : enCola ? "Sincronizando…" : "Cortar la conexión"}</span>
      </span>
      <span className={cn("relative ml-2 inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors", sinConexion ? "border-alerta bg-alerta/20" : "border-gris-5 bg-muted")} aria-hidden>
        <span className={cn("absolute top-0.5 size-[18px] rounded-full transition-transform", sinConexion ? "translate-x-[22px] bg-alerta" : "translate-x-0.5 bg-foreground")} />
      </span>
    </button>
  )
}

const MEDIOS: { id: MedioPago; nombre: string; icono: typeof Banknote }[] = [
  { id: "efectivo", nombre: "Efectivo", icono: Banknote },
  { id: "transferencia", nombre: "Transferencia", icono: Smartphone },
  { id: "qr", nombre: "QR", icono: QrCode },
  { id: "tarjeta", nombre: "Tarjeta", icono: CreditCard },
]

/** El mostrador del kiosco: grande y táctil en su diseño. Lector simulado con el teclado y botones de favoritos. */
export function MostradorKiosco() {
  const { resumen, acciones } = useResumen("kiosco")
  const datos = useDatosEmpresa("kiosco")
  const tienda = useTiendaDemo()
  const ahora = useAhoraDemo()
  const sinConexion = useDemo((s) => s.sinConexion)
  const [items, setItems] = useState<Item[]>([])
  const [medio, setMedio] = useState<MedioPago>("efectivo")
  const [busqueda, setBusqueda] = useState("")
  const [fiadoPara, setFiadoPara] = useState<string | null>(null)
  const [ultima, setUltima] = useState<{ monto: number; t: number; sinConexion: boolean } | null>(null)
  const lector = useRef<HTMLInputElement>(null)
  const escaneos = useRef(0)
  const favoritos = useMemo(() => datos.productos.filter((p) => p.favorito), [datos])
  const resultados = useMemo(() => {
    const n = normalizar(busqueda)
    if (!n || /^\d+$/.test(n)) return []
    return datos.productos.filter((p) => normalizar(p.nombre).includes(n)).slice(0, 6)
  }, [busqueda, datos])
  const total = items.reduce((a, i) => a + i.producto.precio * i.cantidad, 0)
  const vecinos = datos.clientes

  const agregar = (p: ProductoNegocio) => {
    setItems((xs) => {
      const i = xs.findIndex((x) => x.producto.id === p.id)
      if (i < 0) return [...xs, { producto: p, cantidad: 1 }]
      return xs.map((x, j) => (j === i ? { ...x, cantidad: x.cantidad + 1 } : x))
    })
    setUltima(null)
  }
  const leer = (texto: string) => {
    const limpio = texto.trim()
    const porCodigo = datos.productos.find((p) => p.codigo === limpio)
    const p = porCodigo ?? resultados[0]
    if (p) agregar(p)
    else if (limpio) toast.error("No encontré ese código")
    setBusqueda("")
  }
  /** Simula una lectura: el lector "escribe" el código rápido y manda Enter. */
  const escanear = () => {
    const p = datos.productos[(escaneos.current++ * 37 + 11) % datos.productos.length]
    let i = 0
    const paso = () => {
      i += 3
      setBusqueda(p.codigo.slice(0, i))
      if (i < p.codigo.length) gsap.delayedCall(0.018, paso)
      else gsap.delayedCall(0.09, () => leer(p.codigo))
    }
    lector.current?.focus()
    paso()
  }
  const cobrar = (clienteId?: string) => {
    if (!items.length) return
    const id = nuevoId("vk")
    const medioFinal: MedioPago = clienteId ? "cuenta" : medio
    tienda.getState().registrar("kiosco", "ventas", {
      id,
      t: ahora,
      monto: total,
      items: items.map((i) => ({ productoId: i.producto.id, nombre: i.producto.nombre, cantidad: i.cantidad, precio: i.producto.precio })),
      medio: medioFinal,
      clienteId,
      sinConexion,
      sincronizada: !sinConexion,
    })
    if (clienteId) tienda.getState().registrar("kiosco", "fiados", { id: nuevoId("f"), t: ahora, clienteId, monto: total, detalle: items.map((i) => i.producto.nombre).join(", "), tipo: "fiado" })
    setUltima({ monto: total, t: ahora, sinConexion })
    setItems([])
    setFiadoPara(null)
    lector.current?.focus()
  }

  return (
    <div data-lector-activo className="pb-4">
      <EncabezadoModulo empresa="kiosco" modulo="mostrador" detalle="Una caja rápida que nunca se cae: escaneá o tocá un favorito, elegí cómo paga y listo." acciones={<InterruptorConexion />} />
      <div className="grid grid-cols-[1fr_390px] gap-4">
        <div className="space-y-4">
          <div className="relative">
            <ScanBarcode className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={lector}
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && leer(busqueda)}
              placeholder="Escaneá o escribí el nombre…"
              className="t-texto h-14 pl-14 pr-44"
              aria-label="Lector de códigos o búsqueda"
              data-testid="lector-kiosco"
            />
            <Button variant="outline" className="absolute right-2 top-1/2 h-10 -translate-y-1/2" onClick={escanear} data-testid="simular-escaneo">
              <ScanBarcode /> Simular lector
            </Button>
            {resultados.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-linea bg-popover shadow-lg">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => (agregar(p), setBusqueda(""))} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted">
                      <span className="t-texto truncate">{p.nombre}</span>
                      <span className="t-numero">{pesos(p.precio)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="t-etiqueta mb-2 text-muted-foreground">Favoritos</p>
            <div className="grid grid-cols-4 gap-2.5">
              {favoritos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => agregar(p)}
                  className="flex h-[92px] flex-col justify-between rounded-lg border border-linea bg-card p-3 text-left transition-colors hover:border-gris-5 active:translate-y-px"
                  data-testid="favorito"
                >
                  <span className="t-texto-sm line-clamp-2 font-semibold">{p.nombre}</span>
                  <span className="t-numero">{pesos(p.precio)}</span>
                </button>
              ))}
            </div>
          </div>
          <Tarjeta densidad="media" etiqueta="Lo último que vendiste">
            <ListaEventos
              ahora={ahora}
              max={4}
              eventos={[
                ...acciones.ventas.map((v) => ({ id: v.id, t: v.t, tipo: "venta" as const, sucursal: 0, monto: v.monto, detalle: v.items.map((i) => i.nombre).join(" · "), quien: v.sinConexion ? (v.sincronizada ? "Vos · sincronizada" : "Vos · en cola") : "Vos", medio: v.medio })),
                ...resumen.ultimos,
              ]
                .sort((a, b) => b.t - a.t)
                .slice(0, 4)}
            />
          </Tarjeta>
          {ultima && (
            <div className="flex items-center gap-3 rounded-lg border border-ok/50 px-4 py-3" role="status" data-testid="venta-kiosco-ok">
              <Check className="size-5 text-ok" />
              <span className="t-texto">
                Venta de <span className="t-numero">{pesos(ultima.monto)}</span> registrada a las {horaCorta(ultima.t)}.
                {ultima.sinConexion && <span className="text-alerta"> Quedó guardada en este equipo: se sincroniza sola cuando vuelva internet.</span>}
              </span>
            </div>
          )}
        </div>

        <Tarjeta densidad="amplia" etiqueta="Esta venta" className="sticky top-0 self-start">
          {items.length === 0 ? (
            <p className="t-texto py-6 text-center text-muted-foreground">Todavía no hay nada. Escaneá o tocá un favorito.</p>
          ) : (
            <ul className="sin-scrollbar max-h-[260px] divide-y divide-linea overflow-y-auto">
              {items.map((i) => (
                <li key={i.producto.id} className="flex items-center gap-2 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="t-texto-sm block truncate">{i.producto.nombre}</span>
                    <span className="t-dato block text-muted-foreground">{pesos(i.producto.precio)} c/u</span>
                  </span>
                  <Button size="icon-lg" variant="outline" aria-label="Uno menos" onClick={() => setItems((xs) => xs.map((x) => (x.producto.id === i.producto.id ? { ...x, cantidad: x.cantidad - 1 } : x)).filter((x) => x.cantidad > 0))}>
                    {i.cantidad === 1 ? <Trash2 /> : <Minus />}
                  </Button>
                  <span className="t-numero w-6 text-center">{i.cantidad}</span>
                  <Button size="icon-lg" variant="outline" aria-label="Uno más" onClick={() => agregar(i.producto)}>
                    <Plus />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end justify-between border-t border-linea pt-4">
            <span className="t-etiqueta text-muted-foreground">Total</span>
            <Numero valor={total} tamano="xl" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MEDIOS.map((m) => (
              <Button key={m.id} variant={medio === m.id ? "default" : "outline"} className="h-12" onClick={() => setMedio(m.id)} aria-pressed={medio === m.id}>
                <m.icono /> {m.nombre}
              </Button>
            ))}
          </div>
          <Button className="h-16 text-base" disabled={!items.length} onClick={() => cobrar()} data-testid="cobrar-kiosco">
            Cobrar {items.length ? pesos(total) : ""}
          </Button>
          <div>
            <Button variant="ghost" className="w-full" disabled={!items.length} onClick={() => setFiadoPara((v) => (v === null ? "" : null))}>
              <NotebookPen /> Anotar como fiado
            </Button>
            {fiadoPara !== null && items.length > 0 && (
              <ul className="sin-scrollbar mt-2 max-h-48 divide-y divide-linea overflow-y-auto rounded-lg border border-linea">
                {vecinos.map((v) => (
                  <li key={v.id}>
                    <button type="button" onClick={() => cobrar(v.id)} className="t-texto-sm flex w-full justify-between px-3 py-2.5 text-left hover:bg-muted">
                      {v.nombre}
                      {v.saldo > 0 && <span className="t-dato text-muted-foreground">debe {pesos(v.saldo)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Tarjeta>
      </div>
    </div>
  )
}

/** Cerrar la caja: el arqueo contra lo que dice el sistema. Diferencia $ 0 → el salto. */
export function CajaKiosco() {
  const { resumen, datos } = useResumen("kiosco")
  const tienda = useTiendaDemo()
  const ahora = useAhoraDemo()
  const cierre = useDemo((s) => s.porEmpresa.kiosco.cierre)
  const [contado, setContado] = useState(0)
  const boton = useRef<HTMLButtonElement>(null)
  const x = datos.extras.tipo === "kiosco" ? datos.extras : null
  const esperado = resumen.caja.esperado
  const diferencia = contado - esperado
  const BILLETES = [2000000, 1000000, 200000, 100000, 50000, 10000]
  const cerrar = () => {
    tienda.getState().actualizar("kiosco", (a) => ({ ...a, cierre: { t: ahora, esperado, contado } }))
    if (diferencia === 0) lanzarSalto({ desde: boton.current, mensaje: "Caja cerrada · sin diferencias" })
    else toast.warning(`Caja cerrada con una diferencia de ${pesos(diferencia)}`)
  }
  if (cierre) {
    const dif = cierre.contado - cierre.esperado
    return (
      <div>
        <EncabezadoModulo empresa="kiosco" modulo="caja" detalle={`Cerrada a las ${horaCorta(cierre.t)}.`} />
        <div className="grid max-w-5xl grid-cols-2 gap-4">
        <Tarjeta densidad="amplia">
          <p className="t-etiqueta text-muted-foreground">Contaste</p>
          <Numero valor={cierre.contado} tamano="xl" />
          <p className={cn("t-titulo-sm flex items-center gap-2", dif === 0 ? "text-ok" : "text-alerta")}>
            {dif === 0 && <Check className="size-5" />} Diferencia {pesos(dif)}
          </p>
          <Button variant="outline" onClick={() => tienda.getState().actualizar("kiosco", (a) => ({ ...a, cierre: null }))}>
            Reabrir la caja (demo)
          </Button>
        </Tarjeta>
        <Tarjeta densidad="amplia" etiqueta="El día">
          <Numero valor={resumen.ventasHoy} tamano="lg" />
          <div className="space-y-2">
            <Fila etiqueta="Ventas" valor={resumen.ticketsHoy} />
            <Fila etiqueta="En efectivo" valor={pesos(resumen.caja.efectivo)} />
            <Fila etiqueta="Tarjeta, QR y transferencias" valor={pesos(resumen.caja.otros)} />
            <Fila etiqueta="Fondo para mañana" valor={pesos(resumen.caja.fondo)} />
          </div>
        </Tarjeta>
        </div>
      </div>
    )
  }
  return (
    <div>
      <EncabezadoModulo empresa="kiosco" modulo="caja" detalle={`Abierta desde las ${horaCorta(Date.parse(x?.caja.apertura ?? datos.ahora))} · Marta. Contá el efectivo y comparalo con lo que dice el sistema.`} />
      <div className="grid max-w-5xl grid-cols-2 gap-4">
        <Tarjeta densidad="amplia" etiqueta="Lo que dice el sistema">
          <div className="space-y-2">
            <Fila etiqueta="Fondo de la mañana" valor={pesos(resumen.caja.fondo)} />
            <Fila etiqueta="Ventas en efectivo" valor={pesos(resumen.caja.efectivo)} />
          </div>
          <div className="border-t border-linea pt-3">
            <p className="t-etiqueta text-muted-foreground">Tiene que haber en efectivo</p>
            <Numero valor={esperado} tamano="xl" />
          </div>
          <Fila etiqueta="Además: tarjeta, QR y transferencias" valor={pesos(resumen.caja.otros)} />
        </Tarjeta>
        <Tarjeta densidad="amplia" etiqueta="Contá la caja">
          <Input inputMode="numeric" value={contado ? String(Math.round(contado / 100)) : ""} onChange={(e) => setContado(Math.round(Number(e.target.value.replace(/\D/g, "") || 0) * 100))} placeholder="$ 0" className="t-numero-lg h-16" aria-label="Efectivo contado" data-testid="contado-kiosco" />
          <div className="grid grid-cols-3 gap-2">
            {BILLETES.map((b) => (
              <Button key={b} variant="outline" className="h-11" onClick={() => setContado((c) => c + b)}>
                + {pesos(b)}
              </Button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setContado(esperado)} data-testid="contar-todo">
            Contar todo de una vez (demo)
          </Button>
          <p className={cn("t-titulo-sm", !contado ? "text-muted-foreground" : diferencia === 0 ? "text-ok" : "text-alerta")} aria-live="polite">
            {!contado ? "Diferencia: contá primero" : diferencia === 0 ? "Diferencia $ 0: coincide" : `Diferencia ${pesos(diferencia)}`}
          </p>
          <Button ref={boton} className="h-14 text-base" disabled={!contado} onClick={cerrar} data-testid="cerrar-caja-kiosco">
            Cerrar la caja
          </Button>
        </Tarjeta>
      </div>
    </div>
  )
}

/** El fiado de los vecinos: sin cuaderno. Anotar, cobrar y avisar (el aviso por WhatsApp está emulado). */
export function FiadoKiosco() {
  const { resumen, datos } = useResumen("kiosco")
  const tienda = useTiendaDemo()
  const ahora = useAhoraDemo()
  const fiados = useDemo((s) => s.porEmpresa.kiosco.fiados)
  const [nuevo, setNuevo] = useState<{ vecino: string; monto: string; detalle: string } | null>(null)
  const saldo = (id: string) => (datos.clientes.find((c) => c.id === id)?.saldo ?? 0) + fiados.filter((f) => f.clienteId === id).reduce((a, f) => a + (f.tipo === "fiado" ? f.monto : -f.monto), 0)
  const deudores = datos.clientes.map((c) => ({ ...c, debe: saldo(c.id) })).filter((c) => c.debe > 0).sort((a, b) => b.debe - a.debe)
  return (
    <div>
      <EncabezadoModulo
        empresa="kiosco"
        modulo="fiado"
        detalle="Lo que te deben los vecinos, sin cuaderno: quién, cuánto y desde cuándo."
        acciones={
          <Button size="lg" className="h-12" onClick={() => setNuevo({ vecino: deudores[0]?.id ?? datos.clientes[0].id, monto: "", detalle: "" })} data-testid="anotar-fiado">
            <NotebookPen /> Anotar un fiado
          </Button>
        }
      />
      <div className="grid grid-cols-[1fr_380px] gap-4">
        <Tarjeta densidad="amplia" etiqueta={`Te deben · ${deudores.length} vecinos`}>
          <Numero valor={resumen.fiado.total} tamano="xl" />
          <ul className="divide-y divide-linea">
            {deudores.map((c) => (
              <li key={c.id} className="flex items-center gap-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="t-texto block truncate">{c.nombre}</span>
                  <span className="t-etiqueta block text-muted-foreground">{c.diasDeuda ? `desde hace ${c.diasDeuda} días` : "de hoy"}</span>
                </span>
                <span className="t-numero">{pesos(c.debe)}</span>
                <Button variant="outline" onClick={() => toast.info(`Aviso a ${c.nombre} armado. En la demo no se envía: el envío por WhatsApp está emulado.`)}>
                  <Send /> Avisar
                </Button>
                <Button onClick={() => tienda.getState().registrar("kiosco", "fiados", { id: nuevoId("p"), t: ahora, clienteId: c.id, monto: c.debe, detalle: "Pagó todo", tipo: "pago" })}>Pagó</Button>
              </li>
            ))}
          </ul>
        </Tarjeta>
        {nuevo && (
          <Tarjeta densidad="amplia" etiqueta="Anotar un fiado" className="self-start">
            <label className="t-etiqueta text-muted-foreground" htmlFor="vecino">
              Vecino
            </label>
            <select id="vecino" value={nuevo.vecino} onChange={(e) => setNuevo({ ...nuevo, vecino: e.target.value })} className="t-texto h-12 rounded-lg border border-input bg-background px-3">
              {datos.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <Input inputMode="numeric" value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value.replace(/\D/g, "") })} placeholder="Monto" className="t-numero-lg h-14" aria-label="Monto" />
            <Input value={nuevo.detalle} onChange={(e) => setNuevo({ ...nuevo, detalle: e.target.value })} placeholder="Qué se llevó (opcional)" className="h-12" />
            <Button
              className="h-12"
              disabled={!Number(nuevo.monto)}
              onClick={() => {
                tienda.getState().registrar("kiosco", "fiados", { id: nuevoId("f"), t: ahora, clienteId: nuevo.vecino, monto: Number(nuevo.monto) * 100, detalle: nuevo.detalle, tipo: "fiado" })
                toast.success("Fiado anotado")
                setNuevo(null)
              }}
              data-testid="guardar-fiado"
            >
              Anotar
            </Button>
          </Tarjeta>
        )}
      </div>
    </div>
  )
}

/** El pedido sugerido: lo que está por debajo del mínimo, agrupado por proveedor y su día de visita. */
export function ProveedoresKiosco() {
  const datos = useDatosEmpresa("kiosco")
  const x = datos.extras.tipo === "kiosco" ? datos.extras : null
  return (
    <div>
      <EncabezadoModulo empresa="kiosco" modulo="proveedores" detalle="Lo que está por debajo del mínimo, armado por proveedor para cuando pase." />
      <div className="grid grid-cols-2 gap-4">
        {(x?.proveedores ?? []).map((pr) => {
          const lineas = (x?.pedidoSugerido ?? []).filter((l) => l.proveedorId === pr.id)
          if (!lineas.length) return null
          return (
            <Tarjeta key={pr.id} densidad="amplia" etiqueta={`Viene ${pr.visita}`} titulo={pr.nombre}>
              <ul className="divide-y divide-linea">
                {lineas.map((l) => {
                  const p = datos.productos.find((q) => q.id === l.productoId)
                  return (
                    <li key={l.productoId} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="t-texto-sm truncate">{p?.nombre}</span>
                      <span className="t-dato shrink-0 text-muted-foreground">
                        hay {p?.stock} · pedir <span className="font-semibold text-foreground">{l.cantidad}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <Button variant="outline" onClick={() => toast.info("Pedido armado. En la demo no se envía: el envío por WhatsApp está emulado.")}>
                <Send /> Mandar el pedido por WhatsApp
              </Button>
            </Tarjeta>
          )
        })}
      </div>
    </div>
  )
}
