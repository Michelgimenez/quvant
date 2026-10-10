"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { IlustracionProducto } from "@/components/base/ilustracion"
import { SelectorCliente } from "@/components/comercial/selector-cliente"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Id, Ilustracion } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

const TIPOS: { id: Ilustracion; nombre: string }[] = [
  { id: "taladro", nombre: "Taladro" },
  { id: "amoladora", nombre: "Amoladora" },
  { id: "soldadora", nombre: "Soldadora" },
  { id: "compresor", nombre: "Compresor" },
  { id: "generador", nombre: "Generador" },
  { id: "hidrolavadora", nombre: "Hidrolavadora" },
  { id: "sierra", nombre: "Sierra" },
  { id: "bomba", nombre: "Bomba" },
]

/** Ingreso de un equipo al taller. */
export function DialogoIngreso({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: (id: Id) => void }) {
  const { e } = useDatos()
  const { ejecutar, motor, sucursalId } = useApp()
  const [clienteId, setClienteId] = useState<Id | null>(null)
  const [tipo, setTipo] = useState<Ilustracion>("taladro")
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [serie, setSerie] = useState("")
  const [falla, setFalla] = useState("")
  const [accesorios, setAccesorios] = useState("Sin accesorios")
  const [prioridad, setPrioridad] = useState<"normal" | "urgente">("normal")
  const [tecnicoId, setTecnicoId] = useState<string>("nadie")
  const [dias, setDias] = useState("7")
  const s = e.sucursales.find((x) => x.id === sucursalId)!

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ingresar equipo al taller</DialogTitle>
          <DialogDescription>{s.nombre}. Al guardar se puede imprimir el comprobante de ingreso.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (ev) => {
            ev.preventDefault()
            if (!clienteId) return toast.error("Elegí el cliente")
            const id = motor.uuid()
            const n = await motor.siguienteLocal("servicio:ST")
            const ahora = new Date()
            const r = await ejecutar(
              "servicio.crear",
              {
                orden: {
                  id,
                  sucursalId,
                  numeroLocal: `ST-L${String(n).padStart(4, "0")}`,
                  fechaIngreso: ahora.toISOString(),
                  fechaPrometida: new Date(ahora.getTime() + Number(dias) * 86_400_000).toISOString(),
                  clienteId,
                  equipo: { tipo, marca, modelo, serie },
                  falla,
                  accesorios,
                  prioridad,
                  tecnicoId: tecnicoId === "nadie" ? null : tecnicoId,
                },
              },
              sucursalId,
            )
            if (!r.ok) return toast.error(r.error)
            toast.success("Equipo ingresado")
            onCerrar()
            onCreada(id)
          }}
        >
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <SelectorCliente valor={clienteId} onCambio={setClienteId} permitirFinal={false} />
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Tipo de equipo</legend>
            <div className="grid grid-cols-4 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  aria-pressed={tipo === t.id}
                  className={cn("flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px]", tipo === t.id ? "border-primary bg-primary/10" : "border-linea hover:border-acero/50")}
                >
                  <IlustracionProducto tipo={t.id} className="size-7" />
                  {t.nombre}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" value={marca} onChange={(ev) => setMarca(ev.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" value={modelo} onChange={(ev) => setModelo(ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="serie">N.º de serie</Label>
              <Input id="serie" value={serie} onChange={(ev) => setSerie(ev.target.value)} className="num" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="falla">Falla que informa el cliente</Label>
            <Textarea id="falla" value={falla} onChange={(ev) => setFalla(ev.target.value)} rows={2} required minLength={3} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="acc">Accesorios</Label>
              <Input id="acc" value={accesorios} onChange={(ev) => setAccesorios(ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Prioridad</Label>
              <Select value={prioridad} onValueChange={(p) => setPrioridad(p as "normal" | "urgente")}>
                <SelectTrigger className="w-full" aria-label="Prioridad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dias">Días prometidos</Label>
              <Input id="dias" type="number" min={1} max={60} value={dias} onChange={(ev) => setDias(ev.target.value)} className="num" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Técnico</Label>
            <Select value={tecnicoId} onValueChange={setTecnicoId}>
              <SelectTrigger className="w-full" aria-label="Técnico">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nadie">Asignar después</SelectItem>
                {e.usuarios
                  .filter((u) => u.rol === "tecnico")
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">Ingresar equipo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
