"use client"

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import { useDatos } from "@/cliente/app-contexto"
import { MiniaturaProducto } from "@/components/base/ilustracion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { formatoCantidad, formatoPesos } from "@/dominio/dinero"
import { claveStock, precioDe } from "@/dominio/estado"
import type { Id, ItemComercial } from "@/dominio/tipos"
import { subtotalItem } from "@/dominio/ventas"
import { cn } from "@/lib/utils"

/** Ítems de una venta o presupuesto: cantidad, descuento, subtotal. */
export function Carrito({
  items,
  onCambiar,
  sucursalId,
  listaId,
  vacio = "Escaneá o buscá productos para empezar.",
  controlStock = true,
}: {
  items: ItemComercial[]
  onCambiar: (items: ItemComercial[]) => void
  sucursalId: Id
  listaId: Id
  vacio?: string
  controlStock?: boolean
}) {
  const { e } = useDatos()
  const cambiar = (i: number, cambios: Partial<ItemComercial>) => onCambiar(items.map((x, k) => (k === i ? { ...x, ...cambios } : x)))
  const quitar = (i: number) => onCambiar(items.filter((_, k) => k !== i))

  if (items.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-linea p-8 text-center">
        <ShoppingCart className="size-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{vacio}</p>
        <p className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
          <span><Kbd>F2</Kbd> buscar</span>
          <span><Kbd>F4</Kbd> cliente</span>
          <span><Kbd>F8</Kbd> cobrar</span>
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-linea rounded-xl border border-linea bg-card" aria-label="Ítems" data-testid="carrito">
      {items.map((it, i) => {
        const p = e.productos[it.productoId]
        const disponible = e.stock[claveStock(sucursalId, it.productoId)]?.cantidad ?? 0
        const sinStock = controlStock && it.cantidad > disponible
        const lista = precioDe(e, listaId, it.productoId)
        const paso = p?.unidad === "m" || p?.unidad === "kg" || p?.unidad === "l" ? 0.5 : 1
        return (
          <li key={`${it.productoId}-${i}`} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto]">
            <MiniaturaProducto tipo={p?.ilustracion ?? "tornillo"} className="size-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{it.descripcion}</p>
              <p className="ficha truncate">
                {p?.sku} · {formatoPesos(it.precioUnitario)} {p?.unidad !== "u" ? `/${p?.unidad}` : ""}
                {lista !== it.precioUnitario && lista > 0 && <span className="text-chispa-texto"> · lista {formatoPesos(lista, { sinDecimales: true })}</span>}
              </p>
              {sinStock && <p className="text-[11px] font-medium text-chispa-texto">Hay {formatoCantidad(disponible)} en esta sucursal</p>}
            </div>
            <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
              <Button size="icon-sm" variant="outline" onClick={() => (it.cantidad - paso <= 0 ? quitar(i) : cambiar(i, { cantidad: Math.round((it.cantidad - paso) * 1000) / 1000 }))} aria-label={`Restar ${it.descripcion}`}>
                <Minus />
              </Button>
              <Input
                type="number"
                min={0}
                step="any"
                value={it.cantidad}
                onChange={(ev) => cambiar(i, { cantidad: Math.max(0, Number(ev.target.value)) })}
                className="num h-8 w-16 text-center"
                aria-label={`Cantidad de ${it.descripcion}`}
              />
              <Button size="icon-sm" variant="outline" onClick={() => cambiar(i, { cantidad: Math.round((it.cantidad + paso) * 1000) / 1000 })} aria-label={`Sumar ${it.descripcion}`}>
                <Plus />
              </Button>
              <div className="ml-auto flex items-center gap-1 sm:hidden">
                <span className="num text-sm font-semibold">{formatoPesos(subtotalItem(it))}</span>
                <Button size="icon-sm" variant="ghost" onClick={() => quitar(i)} aria-label={`Quitar ${it.descripcion}`}>
                  <Trash2 />
                </Button>
              </div>
            </div>
            <label className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              Desc.
              <Input
                type="number"
                min={0}
                max={100}
                value={it.descuentoPct}
                onChange={(ev) => cambiar(i, { descuentoPct: Math.min(100, Math.max(0, Number(ev.target.value))) })}
                className={cn("num h-8 w-14 text-right", it.descuentoPct > 0 && "border-chispa/60")}
                aria-label={`Descuento de ${it.descripcion}`}
              />
              %
            </label>
            <span className="num hidden w-28 text-right text-sm font-semibold sm:block">{formatoPesos(subtotalItem(it))}</span>
            <Button size="icon-sm" variant="ghost" className="hidden sm:inline-flex" onClick={() => quitar(i)} aria-label={`Quitar ${it.descripcion}`}>
              <Trash2 />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
