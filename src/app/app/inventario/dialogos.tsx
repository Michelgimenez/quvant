"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { BuscadorProductos } from "@/components/app/buscador-productos"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { aCentavos, formatoCantidad, formatoPesos } from "@/dominio/dinero"
import { claveStock } from "@/dominio/estado"
import { precioParaMargen } from "@/dominio/precios"
import type { Id, Producto, Unidad } from "@/dominio/tipos"

export function DialogoTransferencia({ onCerrar }: { onCerrar: () => void }) {
  const { e } = useDatos()
  const { ejecutar, motor, sucursalesPermitidas, sucursalId } = useApp()
  const [desde, setDesde] = useState(sucursalId)
  const [hacia, setHacia] = useState(sucursalesPermitidas.find((s) => s.id !== sucursalId)?.id ?? "")
  const [items, setItems] = useState<{ productoId: Id; cantidad: number }[]>([])

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Transferir entre sucursales</DialogTitle>
          <DialogDescription>La mercadería sale de una sucursal y entra en la otra, con registro.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["Desde", desde, setDesde],
              ["Hacia", hacia, setHacia],
            ] as const
          ).map(([nombre, valor, set]) => (
            <div key={nombre} className="space-y-1.5">
              <Label>{nombre}</Label>
              <Select value={valor} onValueChange={set}>
                <SelectTrigger className="w-full" aria-label={nombre}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sucursalesPermitidas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.codigo} · {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <BuscadorProductos sucursalId={desde} onElegir={(p) => setItems((xs) => (xs.some((x) => x.productoId === p.id) ? xs : [...xs, { productoId: p.id, cantidad: 1 }]))} placeholder="Agregar producto a transferir…" />
        <ul className="max-h-64 divide-y divide-linea overflow-auto rounded-lg border border-linea">
          {items.map((it) => (
            <li key={it.productoId} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{e.productos[it.productoId].nombre}</span>
              <span className="ficha">hay {formatoCantidad(e.stock[claveStock(desde, it.productoId)]?.cantidad ?? 0)}</span>
              <Input type="number" min={0.001} step="any" value={it.cantidad} onChange={(ev) => setItems((xs) => xs.map((x) => (x.productoId === it.productoId ? { ...x, cantidad: Number(ev.target.value) } : x)))} className="num h-8 w-20" aria-label="Cantidad" />
              <Button size="icon-sm" variant="ghost" onClick={() => setItems((xs) => xs.filter((x) => x.productoId !== it.productoId))} aria-label="Quitar">
                <Trash2 />
              </Button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Buscá productos para agregarlos.</li>}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!items.length || desde === hacia || items.some((x) => !(x.cantidad > 0))}
            onClick={async () => {
              const r = await ejecutar("stock.transferir", { transferenciaId: motor.uuid(), desdeId: desde, haciaId: hacia, items, motivo: "Transferencia" }, desde)
              if (!r.ok) return toast.error(r.error)
              toast.success(`Transferencia registrada · ${items.length} producto(s)`)
              onCerrar()
            }}
          >
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DialogoNuevoProducto({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (id: Id) => void }) {
  const { e } = useDatos()
  const { ejecutar, motor, puede } = useApp()
  const [f, setF] = useState({
    sku: "",
    nombre: "",
    codigoBarras: "",
    categoriaId: e.categorias[0]?.id ?? "",
    marcaId: e.marcas[0]?.id ?? "",
    proveedorId: e.proveedores[0]?.id ?? "",
    unidad: "u" as Unidad,
    costo: "",
    iva: "21",
  })
  const costo = aCentavos(Number(f.costo.replace(",", ".")) || 0)
  const precios = e.listas.map((l) => ({ listaId: l.id, precio: precioParaMargen(costo, l.margenSugerido, Number(f.iva)) }))
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: ev.target.value })

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
          <DialogDescription>Los precios se sugieren con el margen de cada lista; después se pueden ajustar.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const id = motor.uuid()
            const cat = e.categorias.find((c) => c.id === f.categoriaId)
            const nuevo: Producto = {
              id,
              orgId: e.org.id,
              sku: f.sku.trim(),
              nombre: f.nombre.trim(),
              codigoBarras: f.codigoBarras.trim(),
              categoriaId: f.categoriaId,
              marcaId: f.marcaId,
              proveedorId: f.proveedorId,
              unidad: f.unidad,
              costo,
              iva: f.iva === "10.5" ? 10.5 : 21,
              ilustracion: cat?.ilustracion ?? "tornillo",
              activo: true,
              actualizadoEn: new Date().toISOString(),
            }
            const r = await ejecutar("producto.guardar", { productoId: id, nuevo, precios: puede("precios.editar") ? precios : [] }, null)
            if (!r.ok) return toast.error(r.error)
            toast.success("Producto creado")
            onCerrar()
            onCreado(id)
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="np-sku">SKU</Label>
            <Input id="np-sku" value={f.sku} onChange={set("sku")} required className="num" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-codigo">Código de barras</Label>
            <Input id="np-codigo" value={f.codigoBarras} onChange={set("codigoBarras")} inputMode="numeric" className="num" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="np-nombre">Nombre</Label>
            <Input id="np-nombre" value={f.nombre} onChange={set("nombre")} required minLength={2} />
          </div>
          {(
            [
              ["categoriaId", "Categoría", e.categorias],
              ["marcaId", "Marca", e.marcas],
              ["proveedorId", "Proveedor", e.proveedores],
            ] as const
          ).map(([k, nombre, opciones]) => (
            <div key={k} className="space-y-1.5">
              <Label>{nombre}</Label>
              <Select value={f[k]} onValueChange={(val) => setF({ ...f, [k]: val })}>
                <SelectTrigger className="w-full" aria-label={nombre}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opciones.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="np-costo">Costo sin IVA ($)</Label>
            <Input id="np-costo" value={f.costo} onChange={set("costo")} inputMode="decimal" required className="num" />
          </div>
          <div className="space-y-1.5">
            <Label>IVA</Label>
            <Select value={f.iva} onValueChange={(val) => setF({ ...f, iva: val })}>
              <SelectTrigger className="w-full" aria-label="IVA">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="21">21 %</SelectItem>
                <SelectItem value="10.5">10,5 %</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {costo > 0 && puede("precios.editar") && (
            <ul className="space-y-1 rounded-lg border border-linea p-3 text-sm sm:col-span-2">
              {precios.map((p) => (
                <li key={p.listaId} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {e.listas.find((l) => l.id === p.listaId)?.nombre} ({e.listas.find((l) => l.id === p.listaId)?.margenSugerido} %)
                  </span>
                  <span className="num font-semibold">{formatoPesos(p.precio)}</span>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">Crear producto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
