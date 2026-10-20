"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, CheckCircle2, Copy, MapPin, Phone, Truck, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { EncabezadoPagina, Requiere, Vacio } from "@/components/app/pagina"
import { Ficha } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { claveDia, diaART, sumarDias } from "@/datos/demo/tiempo"
import { formatoCantidad, formatoPesos } from "@/dominio/dinero"
import { diaDe } from "@/dominio/indicadores"
import type { Entrega, EstadoEntrega, Id } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

const NOMBRE: Record<EstadoEntrega, string> = { pendiente: "Pendiente", en_camino: "En camino", entregada: "Entregada", fallida: "No se pudo" }
const TONO: Record<EstadoEntrega, string> = {
  pendiente: "bg-muted text-muted-foreground",
  en_camino: "bg-foreground/15 text-foreground",
  entregada: "bg-ok/15 text-ok",
  fallida: "bg-error/15 text-error",
}

export function Entregas() {
  const { e, v } = useDatos()
  const { usuario } = useApp()
  const hoy = claveDia(diaART(new Date()))
  const manana = claveDia(sumarDias(diaART(new Date()), 1))
  const enAlcance = (x: Entrega) => usuario.sucursalIds === null || usuario.sucursalIds.includes(x.sucursalId)

  const grupos = useMemo(() => {
    const todas = Object.values(e.entregas).filter(enAlcance)
    const abiertas = todas.filter((x) => x.estado === "pendiente" || x.estado === "en_camino").sort((a, b) => a.orden - b.orden)
    return {
      hoy: abiertas.filter((x) => diaDe(x.fechaProgramada) <= hoy),
      proximas: abiertas.filter((x) => diaDe(x.fechaProgramada) > hoy),
      historial: todas.filter((x) => x.estado === "entregada" || x.estado === "fallida").sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn)).slice(0, 60),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (
    <Requiere permiso="entregas.ver" modulo="entregas">
      <EncabezadoPagina ficha={`Entregas · ${grupos.hoy.length} para hoy`} titulo="Hoja de ruta" descripcion="Lo que sale hoy, en orden de reparto. Se usa desde el celular del chofer, con o sin señal." />
      <Tabs defaultValue="hoy">
        <TabsList className="mb-3">
          <TabsTrigger value="hoy">Hoy ({grupos.hoy.length})</TabsTrigger>
          <TabsTrigger value="proximas">Próximas ({grupos.proximas.length})</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="hoy">
          <ListaRuta entregas={grupos.hoy} ordenable />
        </TabsContent>
        <TabsContent value="proximas">
          <ListaRuta entregas={grupos.proximas} etiquetaFecha={(x) => (diaDe(x.fechaProgramada) === manana ? "Mañana" : new Date(x.fechaProgramada).toLocaleDateString("es-AR", { weekday: "long", day: "numeric" }))} />
        </TabsContent>
        <TabsContent value="historial">
          <ListaRuta entregas={grupos.historial} soloLectura />
        </TabsContent>
      </Tabs>
    </Requiere>
  )
}

function ListaRuta({ entregas, ordenable, soloLectura, etiquetaFecha }: { entregas: Entrega[]; ordenable?: boolean; soloLectura?: boolean; etiquetaFecha?: (x: Entrega) => string }) {
  const { e } = useDatos()
  const { puede, ejecutar } = useApp()
  const [fallida, setFallida] = useState<Id | null>(null)
  if (!entregas.length) return <Vacio icono={Truck} titulo="No hay entregas acá" />

  const mover = async (i: number, delta: number) => {
    const ids = entregas.map((x) => x.id)
    const j = i + delta
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    const r = await ejecutar("entrega.orden", { entregaIds: ids }, null)
    if (!r.ok) toast.error(r.error)
  }
  const estado = async (id: Id, nuevo: EstadoEntrega, nota = "") => {
    const x = e.entregas[id]
    const r = await ejecutar("entrega.estado", { entregaId: id, estado: nuevo, nota }, x.sucursalId)
    if (!r.ok) return toast.error(r.error)
    toast.success(`${x.destinatario}: ${NOMBRE[nuevo].toLowerCase()}`)
  }

  return (
    <ol className="space-y-3">
      {entregas.map((x, i) => {
        const venta = e.ventas[x.ventaId]
        return (
          <li key={x.id} className="rounded-xl border border-linea bg-card p-4" data-testid="entrega">
            <div className="flex items-start gap-3">
              {!soloLectura && <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-muted t-texto-sm font-semibold">{i + 1}</span>}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{x.destinatario}</p>
                  <span className={cn("rounded-full px-2 py-0.5 t-texto-sm font-medium", TONO[x.estado])}>{NOMBRE[x.estado]}</span>
                  {etiquetaFecha && <Ficha className="capitalize">{etiquetaFecha(x)}</Ficha>}
                  <Ficha>{x.franja}</Ficha>
                </div>
                <p className="flex items-center gap-1.5 t-texto-sm">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" /> {x.direccion}
                  <button
                    type="button"
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    aria-label="Copiar dirección"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(x.direccion)
                        toast.success("Dirección copiada")
                      } catch {
                        /* nada */
                      }
                    }}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </p>
                {x.telefono && (
                  <p className="flex items-center gap-1.5 t-texto-sm text-muted-foreground">
                    <Phone className="size-3.5" /> <span className="num">{x.telefono}</span>
                  </p>
                )}
                {venta && (
                  <p className="t-texto-sm text-muted-foreground">
                    Venta {venta.numero ? `#${venta.numero}` : venta.numeroLocal} · {venta.items.map((it) => `${formatoCantidad(it.cantidad)} × ${it.descripcion}`).join(", ")} · {formatoPesos(venta.total, { sinDecimales: true })}
                  </p>
                )}
                {x.notas && <p className="t-texto-sm text-alerta">{x.notas}</p>}
                {x.chofer && <p className="t-texto-sm text-muted-foreground">{x.chofer}</p>}
              </div>
              {ordenable && puede("entregas.editar") && (
                <div className="flex flex-col gap-1">
                  <Button size="icon-sm" variant="ghost" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir en la ruta">
                    <ArrowUp />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => mover(i, 1)} disabled={i === entregas.length - 1} aria-label="Bajar en la ruta">
                    <ArrowDown />
                  </Button>
                </div>
              )}
            </div>
            {!soloLectura && puede("entregas.editar") && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button variant={x.estado === "en_camino" ? "secondary" : "outline"} className="h-11" onClick={() => estado(x.id, "en_camino")} disabled={x.estado === "en_camino"}>
                  <Truck /> En camino
                </Button>
                <Button className="h-11" onClick={() => estado(x.id, "entregada")}>
                  <CheckCircle2 /> Entregada
                </Button>
                <Button variant="outline" className="h-11" onClick={() => setFallida(x.id)}>
                  <XCircle /> No se pudo
                </Button>
              </div>
            )}
          </li>
        )
      })}
      {fallida && <DialogoFallida onCerrar={() => setFallida(null)} onConfirmar={(nota) => estado(fallida, "fallida", nota).then(() => setFallida(null))} />}
    </ol>
  )
}

function DialogoFallida({ onCerrar, onConfirmar }: { onCerrar: () => void; onConfirmar: (nota: string) => void }) {
  const [nota, setNota] = useState("")
  const MOTIVOS = ["No había nadie", "Dirección incorrecta", "El cliente reprogramó", "Vehículo sin lugar"]
  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>No se pudo entregar</DialogTitle>
          <DialogDescription>Contá qué pasó para reprogramar.</DialogDescription>
        </DialogHeader>
        <Input value={nota} onChange={(ev) => setNota(ev.target.value)} placeholder="Motivo" aria-label="Motivo" />
        <div className="flex flex-wrap gap-1">
          {MOTIVOS.map((m) => (
            <button key={m} type="button" onClick={() => setNota(m)} className="rounded-full border border-linea px-2 py-0.5 t-texto-sm text-muted-foreground hover:text-foreground">
              {m}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirmar(nota)} disabled={nota.trim().length < 3}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
