"use client"

import { useState } from "react"
import { PackageCheck, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { BuscadorProductos } from "@/components/app/buscador-productos"
import { Ficha } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatoCantidad, formatoPesos } from "@/dominio/dinero"
import type { Id, OrdenCompra } from "@/dominio/tipos"
import { ChipCompra } from "./compras"

export function DetalleCompra({ id, onCerrar }: { id: Id | null; onCerrar: () => void }) {
  const { e } = useDatos()
  const { puede, ejecutar } = useApp()
  const o = id ? e.compras[id] : null
  const [recibir, setRecibir] = useState(false)
  if (!o) return <Sheet open={false} />
  const prov = e.proveedores.find((p) => p.id === o.proveedorId)
  const s = e.sucursales.find((x) => x.id === o.sucursalId)
  return (
    <Sheet open onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-linea">
          <div className="flex items-center gap-2">
            <Ficha>
              {o.numero ? `OC #${o.numero}` : o.numeroLocal} · {s?.codigo}
            </Ficha>
            <ChipCompra estado={o.estado} />
          </div>
          <SheetTitle className="text-xl">{prov?.nombre}</SheetTitle>
          <SheetDescription>
            {new Date(o.fecha).toLocaleDateString("es-AR")} · {prov?.contacto} · {prov?.email}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <ul className="divide-y divide-linea rounded-lg border border-linea t-texto-sm">
            {o.items.map((it) => (
              <li key={it.productoId} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2">
                <span className="truncate">{e.productos[it.productoId]?.nombre}</span>
                <span className="num t-texto-sm text-muted-foreground">
                  {o.estado !== "borrador" && `${formatoCantidad(it.recibido)}/`}
                  {formatoCantidad(it.cantidad)} × {formatoPesos(it.costoUnitario, { sinDecimales: true })}
                </span>
                <span className="num w-24 text-right">{formatoPesos(Math.round(it.cantidad * it.costoUnitario), { sinDecimales: true })}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between t-texto-sm">
            <span className="text-muted-foreground">Total (sin IVA)</span>
            <span className="text-xl font-semibold">{formatoPesos(o.total)}</span>
          </div>
          {o.notas && <p className="rounded-lg bg-superficie-2 p-3 t-texto-sm text-muted-foreground">{o.notas}</p>}
          <div className="flex flex-wrap gap-2">
            {o.estado === "borrador" && puede("compras.editar") && (
              <Button
                onClick={async () => {
                  const r = await ejecutar("compra.enviar", { ordenId: o.id }, o.sucursalId)
                  if (!r.ok) return toast.error(r.error)
                  toast.success("Orden enviada al proveedor (envío por email emulado)")
                }}
              >
                <Send /> Enviar al proveedor
              </Button>
            )}
            {(o.estado === "enviada" || o.estado === "recibida_parcial") && puede("compras.recibir") && (
              <Button onClick={() => setRecibir(true)} data-testid="recibir-compra">
                <PackageCheck /> Recibir mercadería
              </Button>
            )}
          </div>
        </div>
        {recibir && <DialogoRecepcion orden={o} onCerrar={() => setRecibir(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function DialogoRecepcion({ orden, onCerrar }: { orden: OrdenCompra; onCerrar: () => void }) {
  const { e } = useDatos()
  const { ejecutar } = useApp()
  const [cant, setCant] = useState<Record<Id, string>>(() => Object.fromEntries(orden.items.map((i) => [i.productoId, String(Math.max(0, i.cantidad - i.recibido))])))
  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recibir mercadería</DialogTitle>
          <DialogDescription>Cargá lo que llegó. El stock entra en la sucursal y queda el movimiento de compra.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-80 space-y-2 overflow-auto">
          {orden.items.map((i) => (
            <li key={i.productoId} className="flex items-center gap-3 t-texto-sm">
              <span className="min-w-0 flex-1 truncate">{e.productos[i.productoId]?.nombre}</span>
              <span className="num t-texto-sm text-muted-foreground">pedido {formatoCantidad(i.cantidad - i.recibido)}</span>
              <Input value={cant[i.productoId]} onChange={(ev) => setCant({ ...cant, [i.productoId]: ev.target.value })} inputMode="decimal" className="num h-8 w-20 text-right" aria-label={`Recibido de ${e.productos[i.productoId]?.nombre}`} />
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              const items = Object.entries(cant)
                .map(([productoId, c]) => ({ productoId, cantidad: Number(c.replace(",", ".")) }))
                .filter((x) => x.cantidad > 0)
              const r = await ejecutar("compra.recibir", { ordenId: orden.id, items }, orden.sucursalId)
              if (!r.ok) return toast.error(r.error)
              toast.success(`Recepción registrada · ${items.length} producto(s)`, { description: r.avisos.join(" · ") || undefined })
              onCerrar()
            }}
          >
            Confirmar recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditorCompra({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: (id: Id) => void }) {
  const { e } = useDatos()
  const { ejecutar, motor, sucursalId } = useApp()
  const [proveedorId, setProveedorId] = useState(e.proveedores[0]?.id ?? "")
  const [items, setItems] = useState<{ productoId: Id; cantidad: number; costoUnitario: number }[]>([])
  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nueva orden de compra</DialogTitle>
          <DialogDescription>Queda en borrador hasta que la envíes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Proveedor</Label>
          <Select value={proveedorId} onValueChange={setProveedorId}>
            <SelectTrigger className="w-full" aria-label="Proveedor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {e.proveedores.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <BuscadorProductos sucursalId={sucursalId} onElegir={(p) => setItems((xs) => (xs.some((x) => x.productoId === p.id) ? xs : [...xs, { productoId: p.id, cantidad: 1, costoUnitario: p.costo }]))} placeholder="Agregar producto…" />
        <ul className="max-h-64 divide-y divide-linea overflow-auto rounded-lg border border-linea">
          {items.map((it) => (
            <li key={it.productoId} className="flex items-center gap-2 px-3 py-2 t-texto-sm">
              <span className="min-w-0 flex-1 truncate">{e.productos[it.productoId].nombre}</span>
              <Input type="number" min={1} value={it.cantidad} onChange={(ev) => setItems((xs) => xs.map((x) => (x.productoId === it.productoId ? { ...x, cantidad: Number(ev.target.value) } : x)))} className="num h-8 w-20" aria-label="Cantidad" />
              <span className="num w-24 text-right t-texto-sm text-muted-foreground">{formatoPesos(it.costoUnitario, { sinDecimales: true })}</span>
              <Button size="icon-sm" variant="ghost" onClick={() => setItems((xs) => xs.filter((x) => x.productoId !== it.productoId))} aria-label="Quitar">
                <Trash2 />
              </Button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-6 text-center t-texto-sm text-muted-foreground">Sin productos todavía.</li>}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!items.length}
            onClick={async () => {
              const id = motor.uuid()
              const n = await motor.siguienteLocal("compra")
              const r = await ejecutar("compra.guardar", { orden: { id, sucursalId, proveedorId, numeroLocal: `OC-L${String(n).padStart(4, "0")}`, fecha: new Date().toISOString(), items: items.map((i) => ({ ...i, recibido: 0 })), notas: "" } }, sucursalId)
              if (!r.ok) return toast.error(r.error)
              onCerrar()
              onCreada(id)
            }}
          >
            Guardar borrador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
