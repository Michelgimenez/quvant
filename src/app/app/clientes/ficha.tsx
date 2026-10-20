"use client"

import { useMemo, useState } from "react"
import { Banknote, Pencil } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { Ficha } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { aCentavos, formatoPesos } from "@/dominio/dinero"
import { listaDefault, saldoCliente } from "@/dominio/estado"
import { NOMBRE_ESTADO_PRESUPUESTO } from "@/dominio/presupuestos"
import { NOMBRE_ESTADO_SERVICIO } from "@/dominio/servicio"
import type { Cliente, CondicionIva, Id, MedioPago } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

export function FichaCliente({ id, onCerrar }: { id: Id | null; onCerrar: () => void }) {
  const { e, v } = useDatos()
  const { puede } = useApp()
  const c = id ? e.clientes[id] : null
  const [editar, setEditar] = useState(false)
  const [pago, setPago] = useState(false)

  const datos = useMemo(() => {
    if (!c) return null
    let acumulado = 0
    const movimientos = e.movimientosCuenta
      .filter((m) => m.clienteId === c.id)
      .map((m) => ({ ...m, saldo: (acumulado += m.importe) }))
      .reverse()
    return {
      movimientos,
      ventas: Object.values(e.ventas)
        .filter((x) => x.clienteId === c.id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .slice(0, 20),
      presupuestos: Object.values(e.presupuestos).filter((p) => p.clienteId === c.id).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 10),
      servicio: Object.values(e.servicio).filter((o) => o.clienteId === c.id).sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso)).slice(0, 10),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, c?.id])

  if (!c || !datos) return <Sheet open={false} />
  const saldo = saldoCliente(e, c.id)

  return (
    <Sheet open onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl" data-testid="ficha-cliente">
        <SheetHeader className="border-b border-linea">
          <Ficha>
            {c.condicionIva}
            {c.cuit && ` · CUIT ${c.cuit}`}
          </Ficha>
          <SheetTitle className="text-xl">{c.nombre}</SheetTitle>
          <SheetDescription>
            {c.direccion} · <span className="num">{c.whatsapp}</span>
          </SheetDescription>
          <div className="flex flex-wrap gap-2 pt-1">
            {puede("clientes.editar") && (
              <Button size="sm" variant="outline" onClick={() => setEditar(true)}>
                <Pencil /> Editar
              </Button>
            )}
            {puede("cuentas.cobrar") && c.limiteCredito > 0 && (
              <Button size="sm" onClick={() => setPago(true)}>
                <Banknote /> Registrar pago
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="p-4">
          {c.limiteCredito > 0 && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                ["Saldo", saldo, saldo > c.limiteCredito],
                ["Límite", c.limiteCredito, false],
                ["Disponible", Math.max(0, c.limiteCredito - saldo), false],
              ].map(([nombre, valor, alerta]) => (
                <div key={String(nombre)} className={cn("rounded-lg border p-3", alerta ? "border-error/50 bg-error/10" : "border-linea")}>
                  <p className="t-texto-sm text-muted-foreground">{nombre}</p>
                  <p className="text-lg font-semibold">{formatoPesos(Number(valor), { sinDecimales: true })}</p>
                </div>
              ))}
            </div>
          )}
          <Tabs defaultValue={c.limiteCredito > 0 ? "cuenta" : "compras"}>
            <TabsList className="mb-3">
              {c.limiteCredito > 0 && <TabsTrigger value="cuenta">Cuenta corriente</TabsTrigger>}
              <TabsTrigger value="compras">Compras</TabsTrigger>
              <TabsTrigger value="presupuestos">Presupuestos</TabsTrigger>
              <TabsTrigger value="servicio">Taller</TabsTrigger>
            </TabsList>
            <TabsContent value="cuenta">
              <ul className="divide-y divide-linea rounded-lg border border-linea t-texto-sm">
                {datos.movimientos.slice(0, 40).map((m) => (
                  <li key={m.id} className="grid grid-cols-[80px_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2">
                    <span className="num t-texto-sm text-muted-foreground">{new Date(m.fecha).toLocaleDateString("es-AR")}</span>
                    <span className="truncate">{m.descripcion}</span>
                    <span className={cn("num text-right", m.importe < 0 ? "text-ok" : "")}>{formatoPesos(m.importe, { sinDecimales: true, signo: true })}</span>
                    <span className="num w-24 text-right t-texto-sm text-muted-foreground">{formatoPesos(m.saldo, { sinDecimales: true })}</span>
                  </li>
                ))}
                {datos.movimientos.length === 0 && <li className="px-3 py-4 text-center text-muted-foreground">Sin movimientos.</li>}
              </ul>
            </TabsContent>
            <TabsContent value="compras">
              <ul className="divide-y divide-linea rounded-lg border border-linea t-texto-sm">
                {datos.ventas.map((x) => (
                  <li key={x.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="num w-20 t-texto-sm text-muted-foreground">{new Date(x.fecha).toLocaleDateString("es-AR")}</span>
                    <span className="ficha">{x.numero ? `#${x.numero}` : x.numeroLocal}</span>
                    <span className="flex-1 truncate text-muted-foreground">{x.items.map((it) => it.descripcion).join(", ")}</span>
                    <span className="num">{formatoPesos(x.total, { sinDecimales: true })}</span>
                  </li>
                ))}
                {datos.ventas.length === 0 && <li className="px-3 py-4 text-center text-muted-foreground">Sin compras.</li>}
              </ul>
            </TabsContent>
            <TabsContent value="presupuestos">
              <ul className="divide-y divide-linea rounded-lg border border-linea t-texto-sm">
                {datos.presupuestos.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="ficha">{p.numero ? `#${p.numero}` : p.numeroLocal}</span>
                    <span className="flex-1 t-texto-sm text-muted-foreground">{NOMBRE_ESTADO_PRESUPUESTO[p.estado]}</span>
                    <span className="num">{formatoPesos(p.total, { sinDecimales: true })}</span>
                  </li>
                ))}
                {datos.presupuestos.length === 0 && <li className="px-3 py-4 text-center text-muted-foreground">Sin presupuestos.</li>}
              </ul>
            </TabsContent>
            <TabsContent value="servicio">
              <ul className="divide-y divide-linea rounded-lg border border-linea t-texto-sm">
                {datos.servicio.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="ficha">ST {o.numero ? `#${o.numero}` : o.numeroLocal}</span>
                    <span className="flex-1 truncate">
                      {o.equipo.marca} {o.equipo.modelo}
                    </span>
                    <span className="t-texto-sm text-muted-foreground">{NOMBRE_ESTADO_SERVICIO[o.estado]}</span>
                  </li>
                ))}
                {datos.servicio.length === 0 && <li className="px-3 py-4 text-center text-muted-foreground">Sin equipos en el taller.</li>}
              </ul>
            </TabsContent>
          </Tabs>
          {c.notas && <p className="mt-4 rounded-lg bg-superficie-2 p-3 t-texto-sm text-muted-foreground">{c.notas}</p>}
        </div>
        {editar && <DialogoCliente cliente={c} onCerrar={() => setEditar(false)} />}
        {pago && <DialogoPago clienteId={c.id} onCerrar={() => setPago(false)} />}
      </SheetContent>
    </Sheet>
  )
}

export function DialogoCliente({ cliente, onCerrar, onGuardado }: { cliente?: Cliente; onCerrar: () => void; onGuardado?: (id: Id) => void }) {
  const { e } = useDatos()
  const { ejecutar, motor, puede } = useApp()
  const [f, setF] = useState({
    nombre: cliente?.nombre ?? "",
    cuit: cliente?.cuit ?? "",
    condicionIva: (cliente?.condicionIva ?? "CF") as CondicionIva,
    telefono: cliente?.telefono ?? "",
    whatsapp: cliente?.whatsapp ?? "",
    email: cliente?.email ?? "",
    direccion: cliente?.direccion ?? "",
    listaId: cliente?.listaId ?? listaDefault(e).id,
    limite: cliente ? String(cliente.limiteCredito / 100) : "0",
    notas: cliente?.notas ?? "",
  })
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: ev.target.value })
  const puedeLimite = puede("config.editar")

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>Los cambios se registran en la auditoría.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const datos = {
              nombre: f.nombre,
              cuit: f.cuit.trim(),
              condicionIva: f.condicionIva,
              telefono: f.telefono,
              whatsapp: f.whatsapp,
              email: f.email.trim(),
              direccion: f.direccion,
              listaId: f.listaId,
              limiteCredito: aCentavos(Number(f.limite.replace(",", ".")) || 0),
              notas: f.notas,
            }
            if (cliente) {
              const cambios = Object.fromEntries(Object.entries(datos).filter(([k, val]) => (cliente as unknown as Record<string, unknown>)[k] !== val))
              if (!Object.keys(cambios).length) return onCerrar()
              const antes = Object.fromEntries(Object.keys(cambios).map((k) => [k, (cliente as unknown as Record<string, unknown>)[k]]))
              const r = await ejecutar("cliente.guardar", { clienteId: cliente.id, cambios, antes }, null)
              if (!r.ok) return toast.error(r.error)
              r.avisos.forEach((a) => toast.warning(a.split(": ").slice(1).join(": ")))
              toast.success("Cliente actualizado")
              onCerrar()
            } else {
              const id = motor.uuid()
              const r = await ejecutar("cliente.guardar", { clienteId: id, nuevo: { ...datos, id, orgId: e.org.id, creadoEn: new Date().toISOString() } }, null)
              if (!r.ok) return toast.error(r.error)
              toast.success("Cliente creado")
              onCerrar()
              onGuardado?.(id)
            }
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="cl-nombre">Nombre o razón social</Label>
            <Input id="cl-nombre" value={f.nombre} onChange={set("nombre")} required minLength={2} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cl-cuit">CUIT</Label>
            <Input id="cl-cuit" value={f.cuit} onChange={set("cuit")} placeholder="30-12345678-9" className="num" />
          </div>
          <div className="space-y-1">
            <Label>Condición frente al IVA</Label>
            <Select value={f.condicionIva} onValueChange={(c) => setF({ ...f, condicionIva: c as CondicionIva })}>
              <SelectTrigger className="w-full" aria-label="Condición IVA">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RI">Responsable inscripto</SelectItem>
                <SelectItem value="MT">Monotributo</SelectItem>
                <SelectItem value="CF">Consumidor final</SelectItem>
                <SelectItem value="EX">Exento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cl-wa">WhatsApp</Label>
            <Input id="cl-wa" value={f.whatsapp} onChange={set("whatsapp")} inputMode="tel" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cl-tel">Teléfono</Label>
            <Input id="cl-tel" value={f.telefono} onChange={set("telefono")} inputMode="tel" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="cl-email">Email</Label>
            <Input id="cl-email" type="email" value={f.email} onChange={set("email")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="cl-dir">Dirección</Label>
            <Input id="cl-dir" value={f.direccion} onChange={set("direccion")} />
          </div>
          <div className="space-y-1">
            <Label>Lista de precios</Label>
            <Select value={f.listaId} onValueChange={(l) => setF({ ...f, listaId: l })}>
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
            <Label htmlFor="cl-limite">Límite de cuenta corriente ($)</Label>
            <Input id="cl-limite" inputMode="decimal" value={f.limite} onChange={set("limite")} disabled={!puedeLimite} className="num" />
            {!puedeLimite && <p className="t-texto-sm text-muted-foreground">Solo administración otorga crédito.</p>}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="cl-notas">Notas</Label>
            <Textarea id="cl-notas" value={f.notas} onChange={set("notas")} rows={2} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogoPago({ clienteId, onCerrar }: { clienteId: Id; onCerrar: () => void }) {
  const { e } = useDatos()
  const { ejecutar, motor } = useApp()
  const saldo = saldoCliente(e, clienteId)
  const [importe, setImporte] = useState(String(Math.max(0, saldo) / 100))
  const [medio, setMedio] = useState<MedioPago>("transferencia")
  const [referencia, setReferencia] = useState("")
  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {e.clientes[clienteId].nombre} · saldo {formatoPesos(saldo)}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const r = await ejecutar("cuenta.pago", { movimientoId: motor.uuid(), clienteId, importe: aCentavos(Number(importe.replace(",", "."))), medio, referencia }, null)
            if (!r.ok) return toast.error(r.error)
            toast.success("Pago registrado")
            onCerrar()
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="pago-imp">Importe ($)</Label>
            <Input id="pago-imp" inputMode="decimal" value={importe} onChange={(ev) => setImporte(ev.target.value)} className="num h-11 text-lg" required />
          </div>
          <div className="space-y-1">
            <Label>Medio</Label>
            <Select value={medio} onValueChange={(m) => setMedio(m as MedioPago)}>
              <SelectTrigger className="w-full" aria-label="Medio de pago">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pago-ref">Referencia</Label>
            <Input id="pago-ref" value={referencia} onChange={(ev) => setReferencia(ev.target.value)} placeholder="N.º de transferencia o cheque" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">Registrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
