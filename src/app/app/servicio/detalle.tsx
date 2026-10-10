"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { IlustracionProducto } from "@/components/base/ilustracion"
import { Ficha } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { aCentavos, formatoPesos } from "@/dominio/dinero"
import { ESTADOS_CON_AVISO, NOMBRE_ESTADO_SERVICIO, TRANSICIONES_SERVICIO } from "@/dominio/servicio"
import type { EstadoServicio, Id } from "@/dominio/tipos"
import { ChipServicio } from "./servicio"

const ACCION: Partial<Record<EstadoServicio, string>> = {
  diagnostico: "Empezar diagnóstico",
  esperando_aprobacion: "Enviar presupuesto",
  en_reparacion: "Reparar",
  listo: "Marcar listo",
  entregado: "Entregar al cliente",
  sin_reparacion: "Sin reparación",
}

export function DetalleOrden({ id, onCerrar }: { id: Id | null; onCerrar: () => void }) {
  const { e } = useDatos()
  const { puede, ejecutar } = useApp()
  const o = id ? e.servicio[id] : null
  const [transicion, setTransicion] = useState<EstadoServicio | null>(null)
  if (!o) return <Sheet open={false} />
  const cliente = e.clientes[o.clienteId]
  const sucursal = e.sucursales.find((s) => s.id === o.sucursalId)
  const tecnicos = e.usuarios.filter((u) => u.rol === "tecnico" && u.activo)

  return (
    <Sheet open onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl" data-testid="detalle-orden">
        <SheetHeader className="border-b border-linea">
          <div className="flex items-center gap-2">
            <Ficha>
              ST {o.numero ? `#${o.numero}` : o.numeroLocal} · {sucursal?.codigo}
            </Ficha>
            <ChipServicio estado={o.estado} />
          </div>
          <div className="flex items-center gap-3">
            <IlustracionProducto tipo={o.equipo.tipo} className="size-10" />
            <div>
              <SheetTitle className="text-lg">
                {o.equipo.marca} {o.equipo.modelo}
              </SheetTitle>
              <SheetDescription>
                Serie {o.equipo.serie || "—"} · {o.accesorios}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="space-y-5 p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Cliente</dt>
              <dd className="font-medium">{cliente?.nombre}</dd>
              <dd className="num text-xs text-muted-foreground">{cliente?.whatsapp}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Prometido para</dt>
              <dd className="font-medium">{new Date(o.fechaPrometida).toLocaleDateString("es-AR")}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Falla informada</dt>
              <dd>{o.falla}</dd>
            </div>
            {o.diagnostico && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Diagnóstico</dt>
                <dd>{o.diagnostico}</dd>
              </div>
            )}
            {o.presupuestoReparacion !== null && (
              <div>
                <dt className="text-xs text-muted-foreground">Presupuesto de reparación</dt>
                <dd className="num font-semibold">{formatoPesos(o.presupuestoReparacion)}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted-foreground">Técnico</dt>
              <dd>
                {puede("servicio.editar") ? (
                  <Select
                    value={o.tecnicoId ?? "nadie"}
                    onValueChange={async (t) => {
                      const r = await ejecutar("servicio.asignar", { ordenId: o.id, tecnicoId: t === "nadie" ? null : t }, o.sucursalId)
                      if (!r.ok) toast.error(r.error)
                    }}
                  >
                    <SelectTrigger size="sm" className="mt-0.5 w-full" aria-label="Técnico asignado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nadie">Sin asignar</SelectItem>
                      {tecnicos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  e.usuarios.find((u) => u.id === o.tecnicoId)?.nombre ?? "Sin asignar"
                )}
              </dd>
            </div>
          </dl>

          {puede("servicio.editar") && TRANSICIONES_SERVICIO[o.estado].length > 0 && (
            <div className="flex flex-wrap gap-2">
              {TRANSICIONES_SERVICIO[o.estado].map((t, i) => (
                <Button key={t} variant={i === 0 ? "default" : "outline"} onClick={() => setTransicion(t)} data-testid={`servicio-${t}`}>
                  {ACCION[t] ?? NOMBRE_ESTADO_SERVICIO[t]}
                </Button>
              ))}
            </div>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold">Historial</h3>
            <ol className="relative space-y-4 border-l border-linea pl-4">
              {[...o.eventos].reverse().map((ev, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-background bg-acero" aria-hidden />
                  <p className="text-sm font-medium">{NOMBRE_ESTADO_SERVICIO[ev.estado]}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} · {e.usuarios.find((u) => u.id === ev.usuarioId)?.nombre ?? "—"}
                  </p>
                  {ev.nota && <p className="mt-1 text-sm">{ev.nota}</p>}
                  {ev.aviso && (
                    <div className="mt-2 rounded-lg bg-[#0b141a] p-2">
                      <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#8696a0]">
                        <MessageCircle className="size-3" /> WhatsApp · envío emulado
                      </p>
                      <p className="rounded-md bg-[#005c4b] px-2.5 py-1.5 text-xs text-[#e9edef]">{ev.aviso.mensaje}</p>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
        {transicion && <DialogoTransicion ordenId={o.id} hacia={transicion} onCerrar={() => setTransicion(null)} />}
      </SheetContent>
    </Sheet>
  )
}

function DialogoTransicion({ ordenId, hacia, onCerrar }: { ordenId: Id; hacia: EstadoServicio; onCerrar: () => void }) {
  const { e } = useDatos()
  const { ejecutar } = useApp()
  const o = e.servicio[ordenId]
  const [nota, setNota] = useState("")
  const [diagnostico, setDiagnostico] = useState(o.diagnostico)
  const [presupuesto, setPresupuesto] = useState(o.presupuestoReparacion ? String(o.presupuestoReparacion / 100) : "")
  const conAviso = ESTADOS_CON_AVISO.includes(hacia)
  const [avisar, setAvisar] = useState(conAviso)
  const pidePresupuesto = hacia === "esperando_aprobacion"

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ACCION[hacia] ?? NOMBRE_ESTADO_SERVICIO[hacia]}</DialogTitle>
          <DialogDescription>
            {o.equipo.marca} {o.equipo.modelo} · pasa a “{NOMBRE_ESTADO_SERVICIO[hacia]}”.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const r = await ejecutar(
              "servicio.estado",
              {
                ordenId,
                estado: hacia,
                nota,
                diagnostico: pidePresupuesto || hacia === "en_reparacion" ? diagnostico : undefined,
                presupuestoReparacion: pidePresupuesto ? aCentavos(Number(presupuesto.replace(",", "."))) : undefined,
                avisar,
              },
              o.sucursalId,
            )
            if (!r.ok) return toast.error(r.error)
            toast.success(avisar && conAviso ? "Estado actualizado · aviso por WhatsApp registrado (emulado)" : "Estado actualizado")
            onCerrar()
          }}
        >
          {(pidePresupuesto || hacia === "en_reparacion") && (
            <div className="space-y-1.5">
              <Label htmlFor="diag">Diagnóstico</Label>
              <Textarea id="diag" value={diagnostico} onChange={(ev) => setDiagnostico(ev.target.value)} rows={3} />
            </div>
          )}
          {pidePresupuesto && (
            <div className="space-y-1.5">
              <Label htmlFor="pres">Presupuesto de reparación ($)</Label>
              <Input id="pres" inputMode="decimal" value={presupuesto} onChange={(ev) => setPresupuesto(ev.target.value)} required className="num" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="nota">Nota interna</Label>
            <Input id="nota" value={nota} onChange={(ev) => setNota(ev.target.value)} placeholder="Opcional" />
          </div>
          {conAviso && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={avisar} onCheckedChange={(c) => setAvisar(Boolean(c))} />
              Avisar al cliente por WhatsApp
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">Confirmar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
