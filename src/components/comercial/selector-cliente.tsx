"use client"

import { forwardRef, useImperativeHandle, useState } from "react"
import { Check, ChevronDown, UserPlus, UserRound } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatoPesos } from "@/dominio/dinero"
import { listaDefault, saldoCliente } from "@/dominio/estado"
import type { Id } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

export type SelectorClienteRef = { abrir: () => void }

/** Elegir cliente (o consumidor final). Muestra saldo y límite de cuenta corriente. */
export const SelectorCliente = forwardRef<SelectorClienteRef, { valor: Id | null; onCambio: (id: Id | null) => void; permitirFinal?: boolean }>(function SelectorCliente(
  { valor, onCambio, permitirFinal = true },
  ref,
) {
  const { e } = useDatos()
  const { puede } = useApp()
  const [abierto, setAbierto] = useState(false)
  const [alta, setAlta] = useState(false)
  useImperativeHandle(ref, () => ({ abrir: () => setAbierto(true) }))
  const c = valor ? e.clientes[valor] : null
  const saldo = c ? saldoCliente(e, c.id) : 0

  return (
    <div className="space-y-1.5">
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-auto min-h-11 w-full justify-between py-2 text-left font-normal" aria-label="Cliente" data-testid="selector-cliente">
            <span className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c ? c.nombre : "Consumidor final"}</span>
                {c && (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {c.cuit || c.condicionIva} · {e.listas.find((l) => l.id === c.listaId)?.nombre}
                  </span>
                )}
              </span>
            </span>
            <ChevronDown className="opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(92vw,380px)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Nombre o CUIT…" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {permitirFinal && (
                  <CommandItem
                    value="consumidor final"
                    onSelect={() => {
                      onCambio(null)
                      setAbierto(false)
                    }}
                  >
                    <Check className={cn("size-4", valor === null ? "opacity-100" : "opacity-0")} /> Consumidor final
                  </CommandItem>
                )}
                {Object.values(e.clientes)
                  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
                  .map((x) => (
                    <CommandItem
                      key={x.id}
                      value={`${x.nombre} ${x.cuit}`}
                      onSelect={() => {
                        onCambio(x.id)
                        setAbierto(false)
                      }}
                    >
                      <Check className={cn("size-4", valor === x.id ? "opacity-100" : "opacity-0")} />
                      <span className="min-w-0 flex-1 truncate">{x.nombre}</span>
                      {x.limiteCredito > 0 && <span className="text-[10px] text-muted-foreground">Cta. cte.</span>}
                    </CommandItem>
                  ))}
              </CommandGroup>
              {puede("clientes.editar") && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      value="nuevo cliente"
                      onSelect={() => {
                        setAbierto(false)
                        setAlta(true)
                      }}
                    >
                      <UserPlus /> Nuevo cliente
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {c && c.limiteCredito > 0 && (
        <p className="flex justify-between px-1 text-[11px] text-muted-foreground">
          <span>Saldo {formatoPesos(saldo, { sinDecimales: true })}</span>
          <span className={cn(saldo > c.limiteCredito && "font-semibold text-error-texto")}>Disponible {formatoPesos(Math.max(0, c.limiteCredito - saldo), { sinDecimales: true })}</span>
        </p>
      )}
      {alta && <AltaRapida onCerrar={() => setAlta(false)} onCreado={onCambio} />}
    </div>
  )
})

function AltaRapida({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (id: Id) => void }) {
  const { e } = useDatos()
  const { ejecutar, motor } = useApp()
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [cuit, setCuit] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>Alta rápida. El resto de los datos se completa en Clientes.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const id = motor.uuid()
            const r = await ejecutar(
              "cliente.guardar",
              {
                clienteId: id,
                nuevo: {
                  id,
                  orgId: e.org.id,
                  nombre,
                  cuit: cuit.trim(),
                  condicionIva: cuit.trim() ? "RI" : "CF",
                  telefono,
                  whatsapp: telefono,
                  email: "",
                  direccion: "",
                  listaId: listaDefault(e).id,
                  limiteCredito: 0,
                  notas: "",
                  creadoEn: new Date().toISOString(),
                },
              },
              null,
            )
            if (!r.ok) return toast.error(r.error)
            onCreado(id)
            onCerrar()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ac-nombre">Nombre o razón social</Label>
            <Input id="ac-nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} required minLength={2} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-tel">WhatsApp / teléfono</Label>
            <Input id="ac-tel" value={telefono} onChange={(ev) => setTelefono(ev.target.value)} inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-cuit">CUIT (opcional)</Label>
            <Input id="ac-cuit" value={cuit} onChange={(ev) => setCuit(ev.target.value)} placeholder="30-12345678-9" className="num" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">Crear</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
