"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Save, Send } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { BuscadorProductos } from "@/components/app/buscador-productos"
import { EncabezadoPagina, Requiere } from "@/components/app/pagina"
import { Carrito } from "@/components/comercial/carrito"
import { SelectorCliente } from "@/components/comercial/selector-cliente"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatoPesos } from "@/dominio/dinero"
import { listaDefault } from "@/dominio/estado"
import type { Id, ItemComercial } from "@/dominio/tipos"
import { agregarAlCarrito, itemDesdeProducto, totalItems } from "@/dominio/ventas"

export function EditorPresupuesto() {
  return (
    <Requiere permiso="presupuestos.editar" modulo="presupuestos">
      <Editor />
    </Requiere>
  )
}

function Editor() {
  const { e } = useDatos()
  const { ejecutar, motor, sucursalId } = useApp()
  const params = useSearchParams()
  const router = useRouter()
  const existente = params.get("id") ? e.presupuestos[params.get("id")!] : null
  const [clienteId, setClienteId] = useState<Id | null>(existente?.clienteId ?? null)
  const [clienteNombre, setClienteNombre] = useState(existente && !existente.clienteId ? existente.clienteNombre : "")
  const [listaId, setListaId] = useState(existente?.listaId ?? listaDefault(e).id)
  const [items, setItems] = useState<ItemComercial[]>(existente?.items ?? [])
  const [dias, setDias] = useState("15")
  const [notas, setNotas] = useState(existente?.notas ?? "Precios sujetos a disponibilidad de stock.")
  const [guardando, setGuardando] = useState(false)
  const suc = existente?.sucursalId ?? sucursalId
  const s = e.sucursales.find((x) => x.id === suc)!

  const guardar = async (estado: "borrador" | "enviado") => {
    setGuardando(true)
    const id = existente?.id ?? motor.uuid()
    const numeroLocal = existente?.numeroLocal ?? `P${s.codigo}-L${String(await motor.siguienteLocal(`presupuesto:${s.codigo}`)).padStart(4, "0")}`
    const ahora = new Date()
    const r = await ejecutar(
      "presupuesto.guardar",
      {
        presupuesto: {
          id,
          sucursalId: suc,
          numeroLocal,
          fecha: existente?.fecha ?? ahora.toISOString(),
          vencimiento: new Date(ahora.getTime() + Number(dias) * 86_400_000).toISOString(),
          clienteId,
          clienteNombre: clienteId ? e.clientes[clienteId].nombre : clienteNombre,
          listaId,
          items,
          notas,
          estado,
        },
      },
      suc,
    )
    setGuardando(false)
    if (!r.ok) return toast.error(r.error)
    toast.success(estado === "enviado" ? "Presupuesto guardado. Enviá el WhatsApp desde el detalle." : "Borrador guardado")
    router.push(`/app/presupuestos?id=${id}`)
  }

  const valido = items.length > 0 && (clienteId || clienteNombre.trim().length > 1)

  return (
    <>
      <EncabezadoPagina
        ficha={`Presupuesto · ${s.codigo}${existente ? ` · ${existente.numero ? `#${existente.numero}` : existente.numeroLocal}` : ""}`}
        titulo={existente ? "Editar presupuesto" : "Nuevo presupuesto"}
        acciones={
          <Button variant="outline" asChild>
            <Link href="/app/presupuestos">
              <ArrowLeft /> Presupuestos
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <BuscadorProductos sucursalId={suc} listaId={listaId} onElegir={(p) => setItems((xs) => agregarAlCarrito(xs, itemDesdeProducto(e, p, listaId)))} />
          <Carrito items={items} onCambiar={setItems} sucursalId={suc} listaId={listaId} controlStock={false} vacio="Agregá los productos del presupuesto." />
        </div>
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-3 rounded-xl border border-linea bg-card p-4">
            <Label>Cliente</Label>
            <SelectorCliente
              valor={clienteId}
              onCambio={(id) => {
                setClienteId(id)
                if (id) {
                  const nueva = e.clientes[id].listaId
                  setListaId(nueva)
                  setItems((xs) => xs.map((it) => ({ ...it, precioUnitario: e.precios[`${nueva}:${it.productoId}`]?.precio ?? it.precioUnitario })))
                }
              }}
            />
            {!clienteId && <Input value={clienteNombre} onChange={(ev) => setClienteNombre(ev.target.value)} placeholder="Nombre del cliente (sin ficha)" aria-label="Nombre del cliente" />}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Lista</Label>
                <Select value={listaId} onValueChange={setListaId}>
                  <SelectTrigger className="w-full" aria-label="Lista de precios">
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
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="validez">
                  Validez (días)
                </Label>
                <Input id="validez" type="number" min={1} max={90} value={dias} onChange={(ev) => setDias(ev.target.value)} className="num" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="notas">
                Notas para el cliente
              </Label>
              <Textarea id="notas" value={notas} onChange={(ev) => setNotas(ev.target.value)} rows={3} />
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-linea bg-card p-4">
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-3xl font-semibold tracking-tight">{formatoPesos(totalItems(items))}</span>
            </div>
            <Button size="lg" className="w-full" disabled={!valido || guardando} onClick={() => guardar("enviado")} data-testid="guardar-presupuesto">
              <Send /> Guardar para enviar
            </Button>
            <Button variant="outline" className="w-full" disabled={!valido || guardando} onClick={() => guardar("borrador")}>
              <Save /> Guardar borrador
            </Button>
          </div>
        </aside>
      </div>
    </>
  )
}
