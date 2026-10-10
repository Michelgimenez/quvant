"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Check, ClipboardCheck, ClipboardList, Plus } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { BuscadorProductos } from "@/components/app/buscador-productos"
import { EncabezadoPagina, Panel, Requiere, Vacio } from "@/components/app/pagina"
import { MiniaturaProducto } from "@/components/base/ilustracion"
import { Ficha } from "@/components/base/sellos"
import { lanzarChispa } from "@/components/marca/momento-chispa"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatoCantidad } from "@/dominio/dinero"
import { claveStock } from "@/dominio/estado"
import type { Conteo, Id } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

export function Conteos() {
  const params = useSearchParams()
  const id = params.get("id")
  return <Requiere permiso="conteo.realizar" modulo="inventario">{id ? <DetalleConteo id={id} /> : <ListaConteos />}</Requiere>
}

function ListaConteos() {
  const { e, v } = useDatos()
  const { usuario } = useApp()
  const router = useRouter()
  const [nuevo, setNuevo] = useState(false)
  const conteos = useMemo(
    () => Object.values(e.conteos).filter((c) => usuario.sucursalIds === null || usuario.sucursalIds.includes(c.sucursalId)).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v],
  )
  return (
    <>
      <EncabezadoPagina
        ficha="Inventario · conteos"
        titulo="Conteos"
        descripcion="Contar, comparar y ajustar sin planillas. Se puede contar con la cámara del celular."
        acciones={
          <Button onClick={() => setNuevo(true)}>
            <Plus /> Nuevo conteo
          </Button>
        }
      />
      {conteos.length === 0 ? (
        <Vacio icono={ClipboardList} titulo="Todavía no hay conteos" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {conteos.map((c) => (
            <TarjetaConteo key={c.id} c={c} onAbrir={() => router.push(`/app/inventario/conteos?id=${c.id}`)} />
          ))}
        </ul>
      )}
      {nuevo && <DialogoNuevoConteo onCerrar={() => setNuevo(false)} onCreado={(cid) => router.push(`/app/inventario/conteos?id=${cid}`)} />}
    </>
  )
}

function TarjetaConteo({ c, onAbrir }: { c: Conteo; onAbrir: () => void }) {
  const { e } = useDatos()
  const contados = c.items.filter((x) => x.contado !== null).length
  const diferencias = c.items.filter((x) => x.contado !== null && x.contado !== x.esperado).length
  const s = e.sucursales.find((x) => x.id === c.sucursalId)
  return (
    <li>
      <button type="button" onClick={onAbrir} className="w-full space-y-3 rounded-xl border border-linea bg-card p-4 text-left transition-colors hover:border-acero/40">
        <div className="flex items-center justify-between gap-2">
          <Ficha>
            {s?.codigo} · {new Date(c.fecha).toLocaleDateString("es-AR")}
          </Ficha>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", c.estado === "en_curso" ? "bg-chispa/15 text-chispa-texto" : "bg-muted text-muted-foreground")}>
            {c.estado === "en_curso" ? "En curso" : "Cerrado"}
          </span>
        </div>
        <p className="font-semibold">{c.nombre}</p>
        <Progress value={(contados / Math.max(1, c.items.length)) * 100} aria-label="Avance del conteo" />
        <p className="text-xs text-muted-foreground">
          {contados} de {c.items.length} contados
          {c.estado === "cerrado" && ` · ${diferencias === 0 ? "sin diferencias" : `${diferencias} diferencia(s)`}`}
        </p>
      </button>
    </li>
  )
}

function DialogoNuevoConteo({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (id: Id) => void }) {
  const { e } = useDatos()
  const { ejecutar, motor, sucursalId, sucursalesPermitidas } = useApp()
  const [suc, setSuc] = useState(sucursalId)
  const [categoria, setCategoria] = useState(e.categorias[0]?.id ?? "")
  const productos = Object.values(e.productos).filter((p) => p.categoriaId === categoria && e.stock[claveStock(suc, p.id)])
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo conteo</DialogTitle>
          <DialogDescription>Se toma el stock actual como esperado. Después se compara con lo contado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Sucursal</Label>
            <Select value={suc} onValueChange={setSuc}>
              <SelectTrigger className="w-full" aria-label="Sucursal">
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
          <div className="space-y-1.5">
            <Label>Categoría a contar</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-full" aria-label="Categoría">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {e.categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{productos.length} productos para contar.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!productos.length}
            onClick={async () => {
              const conteoId = motor.uuid()
              const nombre = `Conteo ${e.categorias.find((c) => c.id === categoria)?.nombre}`
              const r = await ejecutar("conteo.crear", { conteoId, sucursalId: suc, nombre, productoIds: productos.map((p) => p.id) }, suc)
              if (!r.ok) return toast.error(r.error)
              onCerrar()
              onCreado(conteoId)
            }}
          >
            Empezar a contar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetalleConteo({ id }: { id: Id }) {
  const { e } = useDatos()
  const { ejecutar } = useApp()
  const c = e.conteos[id]
  const [foco, setFoco] = useState<Id | null>(null)
  const refs = useRef<Record<Id, HTMLInputElement | null>>({})
  const botonCerrar = useRef<HTMLButtonElement>(null)

  if (!c) return <Vacio icono={ClipboardList} titulo="El conteo no existe" accion={<Link className="text-sm text-enlace" href="/app/inventario/conteos">Volver</Link>} />
  const s = e.sucursales.find((x) => x.id === c.sucursalId)!
  const contados = c.items.filter((x) => x.contado !== null).length
  const abierto = c.estado === "en_curso"
  const diferencias = c.items.filter((x) => x.contado !== null && x.contado !== (abierto ? (e.stock[claveStock(c.sucursalId, x.productoId)]?.cantidad ?? 0) : x.esperado))

  const registrar = async (productoId: Id, contado: number) => {
    const r = await ejecutar("conteo.registrar", { conteoId: c.id, productoId, contado }, c.sucursalId)
    if (!r.ok) toast.error(r.error)
  }

  return (
    <>
      <EncabezadoPagina
        ficha={`Conteo · ${s.codigo} · ${new Date(c.fecha).toLocaleDateString("es-AR")}`}
        titulo={c.nombre}
        descripcion={abierto ? "Escaneá o buscá cada producto y cargá lo que hay en la góndola." : `Cerrado el ${new Date(c.cerradoEn ?? c.fecha).toLocaleString("es-AR")}.`}
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link href="/app/inventario/conteos">
                <ArrowLeft /> Conteos
              </Link>
            </Button>
            {abierto && (
              <Button
                ref={botonCerrar}
                disabled={contados === 0}
                onClick={async () => {
                  const r = await ejecutar("conteo.cerrar", { conteoId: c.id }, c.sucursalId)
                  if (!r.ok) return toast.error(r.error)
                  const dif = Number(r.asignado?.diferencias ?? 0)
                  if (dif === 0) {
                    lanzarChispa({ desde: botonCerrar.current, mensaje: "Conteo sin diferencias" })
                    toast.success("Conteo cerrado sin diferencias.")
                  } else toast.success(`Conteo cerrado. Se ajustaron ${dif} producto(s).`)
                }}
              >
                <ClipboardCheck /> Cerrar conteo
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {abierto && (
            <BuscadorProductos
              sucursalId={c.sucursalId}
              placeholder="Escaneá o buscá el producto que estás contando…"
              onElegir={(p) => {
                if (!c.items.some((x) => x.productoId === p.id)) void registrar(p.id, 0)
                setFoco(p.id)
                window.setTimeout(() => refs.current[p.id]?.select(), 50)
              }}
            />
          )}
          <ul className="divide-y divide-linea rounded-xl border border-linea bg-card">
            {c.items.map((it) => {
              const p = e.productos[it.productoId]
              const actual = abierto ? (e.stock[claveStock(c.sucursalId, it.productoId)]?.cantidad ?? 0) : it.esperado
              const dif = it.contado === null ? null : it.contado - actual
              return (
                <li key={it.productoId} className={cn("flex flex-wrap items-center gap-3 px-3 py-2.5", foco === it.productoId && "bg-temple/10")}>
                  <MiniaturaProducto tipo={p.ilustracion} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{p.nombre}</span>
                    <span className="ficha">
                      {p.sku} · sistema {formatoCantidad(actual)}
                    </span>
                  </span>
                  {dif !== null && dif !== 0 && <span className={cn("num text-xs font-semibold", dif < 0 ? "text-error-texto" : "text-ok-texto")}>{dif > 0 ? "+" : ""}{formatoCantidad(dif)}</span>}
                  {dif === 0 && <Check className="size-4 text-ok-texto" aria-label="Coincide" />}
                  {abierto ? (
                    <Input
                      ref={(el) => {
                        refs.current[it.productoId] = el
                      }}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      defaultValue={it.contado ?? ""}
                      placeholder="—"
                      aria-label={`Contado de ${p.nombre}`}
                      className="num h-9 w-24 text-right"
                      onBlur={(ev) => {
                        const n = ev.target.value === "" ? null : Number(ev.target.value)
                        if (n !== null && n !== it.contado && n >= 0) void registrar(it.productoId, n)
                      }}
                      onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
                    />
                  ) : (
                    <span className="num w-16 text-right text-sm">{it.contado === null ? "—" : formatoCantidad(it.contado)}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <Panel titulo="Resumen" className="h-fit lg:sticky lg:top-20">
          <Progress value={(contados / Math.max(1, c.items.length)) * 100} aria-label="Avance" />
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Contados</dt>
              <dd className="num">
                {contados} / {c.items.length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Con diferencias</dt>
              <dd className={cn("num", diferencias.length && "font-semibold text-chispa-texto")}>{diferencias.length}</dd>
            </div>
          </dl>
          {abierto && <p className="mt-3 text-xs text-muted-foreground">Al cerrar, el stock de los productos contados queda igual a lo contado y cada diferencia se registra como movimiento de conteo.</p>}
        </Panel>
      </div>
    </>
  )
}
