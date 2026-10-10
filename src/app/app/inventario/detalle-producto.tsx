"use client"

import { useMemo, useState } from "react"
import { Minus, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { IlustracionProducto } from "@/components/base/ilustracion"
import { Ficha } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { aCentavos, formatoCantidad, formatoPesos, formatoPorcentaje } from "@/dominio/dinero"
import { claveStock, precioDe } from "@/dominio/estado"
import { estadoStock } from "@/dominio/indicadores"
import { margen } from "@/dominio/precios"
import type { Id } from "@/dominio/tipos"
import { CantidadStock } from "./inventario"

const NOMBRE_MOV: Record<string, string> = {
  venta: "Venta",
  anulacion: "Anulación",
  compra: "Compra",
  ajuste: "Ajuste",
  conteo: "Conteo",
  transferencia_salida: "Transferencia (sale)",
  transferencia_entrada: "Transferencia (entra)",
  servicio: "Servicio técnico",
  inicial: "Inicial / importación",
}

export function DetalleProducto({ productoId, onCerrar }: { productoId: Id | null; onCerrar: () => void }) {
  const { e, v } = useDatos()
  const { puede, usuario } = useApp()
  const p = productoId ? e.productos[productoId] : null
  const [ajuste, setAjuste] = useState<{ sucursalId: Id } | null>(null)
  const [precio, setPrecio] = useState<{ listaId: Id } | null>(null)

  const movimientos = useMemo(
    () => (p ? e.movimientos.filter((m) => m.productoId === p.id).slice(-25).reverse() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v, p?.id],
  )
  const sucursales = e.sucursales.filter((s) => usuario.sucursalIds === null || usuario.sucursalIds.includes(s.id))

  return (
    <Sheet open={Boolean(p)} onOpenChange={(o) => !o && onCerrar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl" data-testid="detalle-producto">
        {p && (
          <>
            <SheetHeader className="border-b border-linea">
              <div className="flex items-start gap-4">
                <span className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-linea bg-superficie-2">
                  <IlustracionProducto tipo={p.ilustracion} className="size-11" />
                </span>
                <div className="min-w-0 space-y-1">
                  <Ficha as="p">
                    {p.sku}
                    {p.codigoBarras && ` · ${p.codigoBarras}`}
                  </Ficha>
                  <SheetTitle className="text-lg leading-snug">{p.nombre}</SheetTitle>
                  <SheetDescription>
                    {e.marcas.find((m) => m.id === p.marcaId)?.nombre} · {e.categorias.find((c) => c.id === p.categoriaId)?.nombre} · IVA {p.iva} %
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6 p-4">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Stock por sucursal</h3>
                <ul className="divide-y divide-linea rounded-lg border border-linea">
                  {sucursales.map((s) => {
                    const st = e.stock[claveStock(s.id, p.id)]
                    return (
                      <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            <span className="num text-muted-foreground">{s.codigo}</span> {s.nombre}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {st ? `Mínimo ${formatoCantidad(st.minimo)}${st.ubicacion ? ` · ubicación ${st.ubicacion}` : ""}` : "No se trabaja en esta sucursal"}
                          </span>
                        </span>
                        <CantidadStock cantidad={st?.cantidad} estado={estadoStock(e, s.id, p.id)} />
                        {puede("stock.ajustar") && (
                          <Button size="sm" variant="outline" onClick={() => setAjuste({ sucursalId: s.id })}>
                            Ajustar
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Precios</h3>
                <ul className="divide-y divide-linea rounded-lg border border-linea">
                  {e.listas.map((l) => {
                    const pr = precioDe(e, l.id, p.id)
                    const m = margen(pr, p.costo, p.iva)
                    return (
                      <li key={l.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                        <span className="flex-1">{l.nombre}</span>
                        {puede("costos.ver") && <span className="text-xs text-muted-foreground">margen {m === null ? "—" : formatoPorcentaje(m, 0)}</span>}
                        <span className="num font-semibold">{formatoPesos(pr)}</span>
                        {puede("precios.editar") && (
                          <Button size="icon-sm" variant="ghost" aria-label={`Editar precio ${l.nombre}`} onClick={() => setPrecio({ listaId: l.id })}>
                            <Pencil />
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {puede("costos.ver") && <p className="text-xs text-muted-foreground">Costo de reposición sin IVA: <span className="num">{formatoPesos(p.costo)}</span></p>}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Últimos movimientos</h3>
                <ol className="space-y-1.5">
                  {movimientos.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 text-xs">
                      <span className="num w-20 shrink-0 text-muted-foreground">{new Date(m.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} {new Date(m.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="num w-8 shrink-0 text-muted-foreground">{e.sucursales.find((s) => s.id === m.sucursalId)?.codigo}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {NOMBRE_MOV[m.tipo]} · {m.motivo}
                      </span>
                      <span className={`num shrink-0 font-semibold ${m.cantidad < 0 ? "text-error-texto" : "text-ok-texto"}`}>
                        {m.cantidad > 0 ? "+" : ""}
                        {formatoCantidad(m.cantidad)}
                      </span>
                    </li>
                  ))}
                  {movimientos.length === 0 && <li className="text-xs text-muted-foreground">Sin movimientos.</li>}
                </ol>
              </section>
            </div>
            {ajuste && <DialogoAjuste productoId={p.id} sucursalId={ajuste.sucursalId} onCerrar={() => setAjuste(null)} />}
            {precio && <DialogoPrecio productoId={p.id} listaId={precio.listaId} onCerrar={() => setPrecio(null)} />}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DialogoAjuste({ productoId, sucursalId, onCerrar }: { productoId: Id; sucursalId: Id; onCerrar: () => void }) {
  const { e } = useDatos()
  const { ejecutar } = useApp()
  const [cantidad, setCantidad] = useState(1)
  const [signo, setSigno] = useState<1 | -1>(-1)
  const [motivo, setMotivo] = useState("")
  const s = e.sucursales.find((x) => x.id === sucursalId)!
  const actual = e.stock[claveStock(sucursalId, productoId)]?.cantidad ?? 0
  const MOTIVOS = signo < 0 ? ["Rotura", "Faltante", "Uso interno", "Devolución a proveedor"] : ["Ingreso sin remito", "Sobrante", "Devolución de cliente"]

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {e.productos[productoId].nombre} · {s.nombre}. Hoy: <span className="num">{formatoCantidad(actual)}</span>
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const r = await ejecutar("stock.ajustar", { sucursalId, productoId, cantidad: signo * cantidad, motivo }, sucursalId)
            if (!r.ok) return toast.error(r.error)
            toast.success(`Stock ajustado: ${signo > 0 ? "+" : "−"}${formatoCantidad(cantidad)}`)
            onCerrar()
          }}
        >
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de ajuste">
            <Button type="button" variant={signo < 0 ? "default" : "outline"} onClick={() => setSigno(-1)} role="radio" aria-checked={signo < 0}>
              <Minus /> Restar
            </Button>
            <Button type="button" variant={signo > 0 ? "default" : "outline"} onClick={() => setSigno(1)} role="radio" aria-checked={signo > 0}>
              <Plus /> Sumar
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aj-cantidad">Cantidad</Label>
            <Input id="aj-cantidad" type="number" min={0.001} step="any" value={cantidad} onChange={(ev) => setCantidad(Number(ev.target.value))} className="num" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aj-motivo">Motivo</Label>
            <Input id="aj-motivo" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} placeholder="Ej.: rotura en depósito" required minLength={3} />
            <div className="flex flex-wrap gap-1">
              {MOTIVOS.map((m) => (
                <button key={m} type="button" className="rounded-full border border-linea px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setMotivo(m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Queda en <span className="num font-semibold text-foreground">{formatoCantidad(actual + signo * cantidad)}</span>. El ajuste se registra en la auditoría.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!(cantidad > 0) || motivo.trim().length < 3}>
              Guardar ajuste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogoPrecio({ productoId, listaId, onCerrar }: { productoId: Id; listaId: Id; onCerrar: () => void }) {
  const { e } = useDatos()
  const { ejecutar, puede } = useApp()
  const p = e.productos[productoId]
  const actual = precioDe(e, listaId, productoId)
  const [valor, setValor] = useState(String(actual / 100))
  const nuevo = aCentavos(Number(valor.replace(",", ".")))
  const m = margen(nuevo, p.costo, p.iva)
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar precio</DialogTitle>
          <DialogDescription>
            {p.nombre} · {e.listas.find((l) => l.id === listaId)?.nombre}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const r = await ejecutar("precio.editar", { productoId, listaId, precio: nuevo }, null)
            if (!r.ok) return toast.error(r.error)
            toast.success("Precio actualizado")
            onCerrar()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="precio-nuevo">Precio final con IVA</Label>
            <Input id="precio-nuevo" inputMode="decimal" value={valor} onChange={(ev) => setValor(ev.target.value)} className="num text-lg" />
            <p className="text-xs text-muted-foreground">
              Antes: <span className="num">{formatoPesos(actual)}</span>
              {puede("costos.ver") && m !== null && <> · margen {formatoPorcentaje(m, 1)}</>}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!(nuevo >= 0) || nuevo === actual}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
