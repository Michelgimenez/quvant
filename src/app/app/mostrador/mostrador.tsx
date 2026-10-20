"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, CloudOff, Printer, RotateCcw, Truck } from "lucide-react"
import { toast } from "sonner"
import { useApp, useConexion, useDatos } from "@/cliente/app-contexto"
import { BuscadorProductos, type BuscadorRef } from "@/components/app/buscador-productos"
import { Requiere } from "@/components/app/pagina"
import { Ficha, Sello } from "@/components/base/sellos"
import { Carrito } from "@/components/comercial/carrito"
import { SelectorCliente, type SelectorClienteRef } from "@/components/comercial/selector-cliente"
import { AreaImpresion, Comprobante } from "@/components/comercial/ticket"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { formatoPesos } from "@/dominio/dinero"
import { listaDefault } from "@/dominio/estado"
import type { Id, ItemComercial, Pago } from "@/dominio/tipos"
import { agregarAlCarrito, itemDesdeProducto, ivaContenido, subtotalItem, totalItems } from "@/dominio/ventas"
import { BarraCaja, DialogoAbrir, useCaja } from "./caja"
import { DialogoCobro } from "./cobro"

type Borrador = { items: ItemComercial[]; clienteId: Id | null; listaId: Id; entrega: null | { direccion: string; telefono: string; fecha: string; franja: "mañana" | "tarde"; notas: string } }

/** Venta en curso, guardada por sucursal y puesto (sobrevive a una recarga). */
function useBorrador(clave: string, inicial: Borrador) {
  const leer = (k: string) => {
    try {
      const g = sessionStorage.getItem(k)
      return g ? (JSON.parse(g) as Borrador) : inicial
    } catch {
      return inicial
    }
  }
  const [estado, setEstado] = useState(() => ({ clave, b: leer(clave) }))
  // Cambió el puesto o la sucursal: se carga la venta en curso de ese puesto.
  if (estado.clave !== clave) setEstado({ clave, b: leer(clave) })
  const b = estado.clave === clave ? estado.b : inicial
  useEffect(() => {
    try {
      sessionStorage.setItem(estado.clave, JSON.stringify(estado.b))
    } catch {
      /* nada */
    }
  }, [estado])
  const setB = (nuevo: Borrador) => setEstado({ clave, b: nuevo })
  return [b, setB] as const
}

export function Mostrador() {
  return (
    <Requiere permiso="mostrador.vender" modulo="mostrador">
      <PantallaMostrador />
    </Requiere>
  )
}

function PantallaMostrador() {
  const { e } = useDatos()
  const { sucursalId, ejecutar, motor, usuario } = useApp()
  const { estado } = useConexion()
  const sucursal = e.sucursales.find((s) => s.id === sucursalId)!
  const [puesto, setPuesto] = useState(() => {
    try {
      return Math.min(sucursal.puestos, Number(localStorage.getItem(`quvant:puesto:${sucursalId}`)) || 1)
    } catch {
      return 1
    }
  })
  const caja = useCaja(sucursalId, puesto)
  const vacio: Borrador = { items: [], clienteId: null, listaId: listaDefault(e).id, entrega: null }
  const [b, setB] = useBorrador(`quvant:mostrador:${sucursalId}:${puesto}`, vacio)
  const [cobrando, setCobrando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [abrirCaja, setAbrirCaja] = useState(false)
  const [hecha, setHecha] = useState<{ ventaId: Id; sinConexion: boolean } | null>(null)
  const [imprimir, setImprimir] = useState(false)
  const buscador = useRef<BuscadorRef>(null)
  const selectorCliente = useRef<SelectorClienteRef>(null)
  const total = totalItems(b.items)

  // Atajos del mostrador
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (cobrando || hecha) return
      if (ev.key === "F2") {
        ev.preventDefault()
        buscador.current?.enfocar()
      } else if (ev.key === "F4") {
        ev.preventDefault()
        selectorCliente.current?.abrir()
      } else if (ev.key === "F8") {
        ev.preventDefault()
        if (b.items.length) setCobrando(true)
      } else if (ev.key === "Escape" && !(ev.target as HTMLElement).closest("[role=dialog]") && b.items.length) {
        if (confirm("¿Vaciar la venta en curso?")) setB(vacio)
      } else if ((ev.key === "+" || ev.key === "-") && !(ev.target as HTMLElement).matches("input") && b.items.length) {
        ev.preventDefault()
        const i = b.items.length - 1
        const it = b.items[i]
        const cantidad = Math.max(1, it.cantidad + (ev.key === "+" ? 1 : -1))
        setB({ ...b, items: b.items.map((x, k) => (k === i ? { ...x, cantidad } : x)) })
      }
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  })

  useEffect(() => {
    if (!imprimir) return
    const t = window.setTimeout(() => {
      window.print()
      setImprimir(false)
    }, 100)
    return () => window.clearTimeout(t)
  }, [imprimir])

  const cambiarCliente = (id: Id | null) => {
    const c = id ? e.clientes[id] : null
    const listaId = c?.listaId ?? listaDefault(e).id
    // Al cambiar de lista se recalculan los precios (salvo los que se editaron a mano).
    const items = b.items.map((it) => ({ ...it, precioUnitario: e.precios[`${listaId}:${it.productoId}`]?.precio ?? it.precioUnitario }))
    setB({ ...b, clienteId: id, listaId, items, entrega: b.entrega && c ? { ...b.entrega, direccion: c.direccion, telefono: c.telefono } : b.entrega })
  }

  const confirmar = async (pagos: Pago[]) => {
    setProcesando(true)
    const n = await motor.siguienteLocal(`venta:${sucursal.codigo}${puesto}`)
    const id = motor.uuid()
    const c = b.clienteId ? e.clientes[b.clienteId] : null
    const r = await ejecutar(
      "venta.crear",
      {
        venta: {
          id,
          sucursalId,
          puesto,
          numeroLocal: `${sucursal.codigo}${puesto}-L${String(n).padStart(4, "0")}`,
          fecha: new Date().toISOString(),
          clienteId: b.clienteId,
          listaId: b.listaId,
          items: b.items,
          pagos,
          entrega: b.entrega
            ? {
                id: motor.uuid(),
                destinatario: c?.nombre ?? "Cliente mostrador",
                direccion: b.entrega.direccion,
                telefono: b.entrega.telefono,
                fechaProgramada: new Date(`${b.entrega.fecha}T12:00:00-03:00`).toISOString(),
                franja: b.entrega.franja,
                notas: b.entrega.notas,
              }
            : null,
        },
      },
      sucursalId,
    )
    setProcesando(false)
    if (!r.ok) return toast.error(r.error)
    setCobrando(false)
    setHecha({ ventaId: id, sinConexion: estado === "sin_conexion" })
    setB(vacio)
  }

  const venta = hecha ? e.ventas[hecha.ventaId] : null

  return (
    <div className="space-y-3 pb-16 lg:pb-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Ficha>
              Mostrador · {sucursal.codigo} · puesto {puesto}
            </Ficha>
            {e.org.esDemo && <Sello className="scale-90" />}
          </div>
          <h1 className="t-titulo">Nueva venta</h1>
        </div>
        {sucursal.puestos > 1 && (
          <Select
            value={String(puesto)}
            onValueChange={(v) => {
              setPuesto(Number(v))
              try {
                localStorage.setItem(`quvant:puesto:${sucursalId}`, v)
              } catch {
                /* nada */
              }
            }}
          >
            <SelectTrigger size="sm" className="w-32" aria-label="Puesto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: sucursal.puestos }, (_, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  Puesto {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="w-full min-w-0 sm:ml-auto sm:w-auto sm:max-w-md sm:flex-1">
          <BarraCaja sucursalId={sucursalId} puesto={puesto} />
        </div>
      </div>

      {estado === "sin_conexion" && (
        <div className="flex items-center gap-2 rounded-lg border border-alerta/50 bg-alerta/10 px-3 py-2 t-texto-sm" role="status">
          <CloudOff className="size-4 text-alerta" />
          Sin conexión. Seguís vendiendo normalmente: las ventas quedan en cola y se sincronizan solas.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          <BuscadorProductos
            ref={buscador}
            autoFocus
            sucursalId={sucursalId}
            listaId={b.listaId}
            onElegir={(p) => setB({ ...b, items: agregarAlCarrito(b.items, itemDesdeProducto(e, p, b.listaId)) })}
          />
          <Carrito items={b.items} onCambiar={(items) => setB({ ...b, items })} sucursalId={sucursalId} listaId={b.listaId} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-3 rounded-xl border border-linea bg-card p-4">
            <div className="flex items-center justify-between">
              <Label>Cliente</Label>
              <Kbd>F4</Kbd>
            </div>
            <SelectorCliente ref={selectorCliente} valor={b.clienteId} onCambio={cambiarCliente} />
            <div className="flex items-center justify-between t-texto-sm text-muted-foreground">
              <span>Lista de precios</span>
              <Select value={b.listaId} onValueChange={(listaId) => setB({ ...b, listaId, items: b.items.map((it) => ({ ...it, precioUnitario: e.precios[`${listaId}:${it.productoId}`]?.precio ?? it.precioUnitario })) })}>
                <SelectTrigger size="sm" className="h-7 w-32 t-texto-sm" aria-label="Lista de precios">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {e.listas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-linea bg-card p-4">
            <label className="flex items-center justify-between gap-2 t-texto-sm">
              <span className="inline-flex items-center gap-2">
                <Truck className="size-4 text-muted-foreground" /> Entrega a domicilio
              </span>
              <Switch
                checked={Boolean(b.entrega)}
                onCheckedChange={(v) => {
                  const c = b.clienteId ? e.clientes[b.clienteId] : null
                  const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
                  setB({ ...b, entrega: v ? { direccion: c?.direccion ?? "", telefono: c?.telefono ?? "", fecha: manana, franja: "mañana", notas: "" } : null })
                }}
              />
            </label>
            {b.entrega && (
              <div className="grid gap-2">
                <Input value={b.entrega.direccion} onChange={(ev) => setB({ ...b, entrega: { ...b.entrega!, direccion: ev.target.value } })} placeholder="Dirección" aria-label="Dirección de entrega" />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={b.entrega.fecha} onChange={(ev) => setB({ ...b, entrega: { ...b.entrega!, fecha: ev.target.value } })} aria-label="Fecha de entrega" />
                  <Select value={b.entrega.franja} onValueChange={(f) => setB({ ...b, entrega: { ...b.entrega!, franja: f as "mañana" | "tarde" } })}>
                    <SelectTrigger className="w-full" aria-label="Franja">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mañana">Mañana</SelectItem>
                      <SelectItem value="tarde">Tarde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-linea bg-card p-4">
            <dl className="space-y-1 t-texto-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>{b.items.length} ítem(s)</dt>
                <dd className="num">{formatoPesos(b.items.reduce((t, it) => t + Math.round(it.cantidad * it.precioUnitario), 0))}</dd>
              </div>
              {b.items.some((it) => it.descuentoPct > 0) && (
                <div className="flex justify-between text-muted-foreground">
                  <dt>Descuentos</dt>
                  <dd className="num">−{formatoPesos(b.items.reduce((t, it) => t + Math.round(it.cantidad * it.precioUnitario) - subtotalItem(it), 0))}</dd>
                </div>
              )}
              <div className="flex items-end justify-between pt-1">
                <dt className="font-semibold">Total</dt>
                <dd className="t-numero-lg" data-testid="total-venta">
                  {formatoPesos(total)}
                </dd>
              </div>
              <div className="flex justify-between t-texto-sm text-muted-foreground">
                <dt>IVA contenido</dt>
                <dd className="num">{formatoPesos(ivaContenido(total))}</dd>
              </div>
            </dl>
            {caja ? (
              <Button size="lg" className="h-12 w-full text-base" disabled={!b.items.length} onClick={() => setCobrando(true)} data-testid="cobrar">
                Cobrar <Kbd className="ml-1 bg-primary-foreground/15 text-primary-foreground">F8</Kbd>
              </Button>
            ) : (
              <Button size="lg" className="h-12 w-full text-base" onClick={() => setAbrirCaja(true)}>
                Abrir caja para cobrar
              </Button>
            )}
            {b.items.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setB(vacio)}>
                <RotateCcw /> Vaciar
              </Button>
            )}
          </div>
          <p className="px-1 t-texto-sm text-muted-foreground">Vendedor: {usuario.nombre} · la venta se guarda en este equipo y se sincroniza sola.</p>
        </aside>
      </div>

      {/* Celular: total y cobrar siempre a mano, sobre la barra inferior */}
      {b.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-14 z-20 flex items-center gap-3 border-t border-linea bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="t-texto-sm text-muted-foreground">{b.items.length} ítem(s)</p>
            <p className="truncate t-numero">{formatoPesos(total)}</p>
          </div>
          {caja ? (
            <Button size="lg" onClick={() => setCobrando(true)}>
              Cobrar
            </Button>
          ) : (
            <Button size="lg" onClick={() => setAbrirCaja(true)}>
              Abrir caja
            </Button>
          )}
        </div>
      )}

      {cobrando && <DialogoCobro total={total} clienteId={b.clienteId} procesando={procesando} onConfirmar={confirmar} onCerrar={() => setCobrando(false)} />}
      {abrirCaja && <DialogoAbrir sucursalId={sucursalId} puesto={puesto} onCerrar={() => setAbrirCaja(false)} />}

      <Dialog open={Boolean(hecha)} onOpenChange={(o) => !o && setHecha(null)}>
        <DialogContent className="max-w-sm text-center" onOpenAutoFocus={(ev) => ev.preventDefault()}>
          <DialogHeader className="items-center">
            <CheckCircle2 className="size-10 text-ok" />
            <DialogTitle className="t-titulo-sm">Venta registrada</DialogTitle>
            <DialogDescription>
              {venta?.numero ? `Venta #${venta.numero}` : `Número provisorio ${venta?.numeroLocal ?? ""}`} · {venta && formatoPesos(venta.total)}
            </DialogDescription>
          </DialogHeader>
          {hecha?.sinConexion && (
            <p className="rounded-md border border-alerta/50 bg-alerta/10 px-3 py-2 t-texto-sm" data-testid="venta-en-cola">
              Guardada sin conexión. Se sincroniza sola cuando vuelva internet y ahí recibe su número definitivo.
            </p>
          )}
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setImprimir(true)}>
              <Printer /> Imprimir
            </Button>
            <Button
              autoFocus
              onClick={() => {
                setHecha(null)
                window.setTimeout(() => buscador.current?.enfocar(), 50)
              }}
            >
              Nueva venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {imprimir && venta && (
        <AreaImpresion>
          <Comprobante venta={venta} />
        </AreaImpresion>
      )}
    </div>
  )
}
