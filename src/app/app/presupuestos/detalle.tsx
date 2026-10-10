"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Check, MessageCircle, Pencil, Printer, ShoppingCart, X } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { Ficha } from "@/components/base/sellos"
import { AreaImpresion, Comprobante } from "@/components/comercial/ticket"
import { DialogoWhatsApp } from "@/components/comercial/whatsapp"
import { lanzarChispa } from "@/components/marca/momento-chispa"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatoCantidad, formatoPesos } from "@/dominio/dinero"
import { cajaAbierta } from "@/dominio/caja"
import { estadoVisible, mensajePresupuesto } from "@/dominio/presupuestos"
import type { Id, Pago } from "@/dominio/tipos"
import { subtotalItem } from "@/dominio/ventas"
import { DialogoCobro } from "../mostrador/cobro"
import { EstadoChip } from "./presupuestos"

export function DetallePresupuesto({ id, onCerrar }: { id: Id | null; onCerrar: () => void }) {
  const { e } = useDatos()
  const { puede, ejecutar, motor } = useApp()
  const p = id ? e.presupuestos[id] : null
  const [whatsapp, setWhatsapp] = useState(false)
  const [cobro, setCobro] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [imprimir, setImprimir] = useState(false)
  const botonConvertir = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!imprimir) return
    const t = window.setTimeout(() => {
      window.print()
      setImprimir(false)
    }, 100)
    return () => window.clearTimeout(t)
  }, [imprimir])

  if (!p) return <Sheet open={false} />
  const estado = estadoVisible(p, new Date().toISOString())
  const cliente = p.clienteId ? e.clientes[p.clienteId] : null
  const negocio = e.negocios.find((n) => n.id === p.negocioId)
  const venta = p.ventaId ? e.ventas[p.ventaId] : null
  const abierto = estado === "borrador" || estado === "enviado" || estado === "aceptado" || estado === "vencido"
  const vendedor = e.usuarios.find((u) => u.id === p.vendedorId)

  const convertir = async (pagos: Pago[]) => {
    setProcesando(true)
    const s = e.sucursales.find((x) => x.id === p.sucursalId)!
    const puesto = [...Array(s.puestos)].map((_, i) => i + 1).find((n) => cajaAbierta(e, s.id, n)) ?? 1
    const n = await motor.siguienteLocal(`venta:${s.codigo}${puesto}`)
    const r = await ejecutar(
      "presupuesto.convertir",
      {
        presupuestoId: p.id,
        venta: {
          id: motor.uuid(),
          sucursalId: p.sucursalId,
          puesto,
          numeroLocal: `${s.codigo}${puesto}-L${String(n).padStart(4, "0")}`,
          fecha: new Date().toISOString(),
          clienteId: p.clienteId,
          listaId: p.listaId,
          items: p.items,
          pagos,
          entrega: null,
        },
      },
      p.sucursalId,
    )
    setProcesando(false)
    if (!r.ok) return toast.error(r.error)
    setCobro(false)
    lanzarChispa({ desde: botonConvertir.current, mensaje: "Presupuesto → venta" })
    toast.success("Presupuesto convertido en venta", { description: r.avisos.find((a) => a.startsWith("presupuesto_vencido")) ? "Era un presupuesto vencido: revisá los precios." : undefined })
  }

  return (
    <>
      <Sheet open onOpenChange={(o) => !o && onCerrar()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl" data-testid="detalle-presupuesto">
          <SheetHeader className="border-b border-linea">
            <div className="flex items-center gap-2">
              <Ficha>Presupuesto {p.numero ? `#${p.numero}` : p.numeroLocal}</Ficha>
              <EstadoChip estado={estado} />
            </div>
            <SheetTitle className="text-xl">{p.clienteNombre}</SheetTitle>
            <SheetDescription>
              {new Date(p.fecha).toLocaleDateString("es-AR")} · vence {new Date(p.vencimiento).toLocaleDateString("es-AR")} · {vendedor?.nombre}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 p-4">
            <ul className="divide-y divide-linea rounded-lg border border-linea">
              {p.items.map((it, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="num w-12 shrink-0 text-muted-foreground">{formatoCantidad(it.cantidad)} ×</span>
                  <span className="min-w-0 flex-1 truncate">{it.descripcion}</span>
                  {it.descuentoPct > 0 && <span className="text-xs text-chispa-texto">−{it.descuentoPct}%</span>}
                  <span className="num font-medium">{formatoPesos(subtotalItem(it))}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-3xl font-semibold tracking-tight">{formatoPesos(p.total)}</span>
            </div>
            {p.notas && <p className="rounded-lg bg-superficie-2 p-3 text-sm text-muted-foreground">{p.notas}</p>}
            {venta && (
              <p className="rounded-lg border border-ok/40 bg-ok/10 p-3 text-sm">
                Convertido en la venta <span className="num font-semibold">{venta.numero ? `#${venta.numero}` : venta.numeroLocal}</span> el {new Date(venta.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {abierto && puede("mostrador.vender") && (
                <Button ref={botonConvertir} size="lg" onClick={() => setCobro(true)} data-testid="convertir-venta">
                  <ShoppingCart /> Convertir en venta
                </Button>
              )}
              {abierto && puede("presupuestos.editar") && (
                <>
                  <Button variant="outline" onClick={() => setWhatsapp(true)}>
                    <MessageCircle /> WhatsApp
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/app/presupuestos/nuevo?id=${p.id}`}>
                      <Pencil /> Editar
                    </Link>
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setImprimir(true)}>
                <Printer /> Imprimir
              </Button>
            </div>
            {abierto && puede("presupuestos.editar") && estado !== "aceptado" && (
              <div className="flex flex-wrap gap-2 border-t border-linea pt-4 text-sm">
                <span className="w-full text-xs text-muted-foreground">¿Qué respondió el cliente?</span>
                <Button size="sm" variant="ghost" onClick={async () => {
                  const r = await ejecutar("presupuesto.estado", { presupuestoId: p.id, estado: "aceptado" }, p.sucursalId)
                  if (!r.ok) toast.error(r.error)
                }}>
                  <Check /> Aceptó
                </Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  const r = await ejecutar("presupuesto.estado", { presupuestoId: p.id, estado: "rechazado" }, p.sucursalId)
                  if (!r.ok) toast.error(r.error)
                }}>
                  <X /> Rechazó
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {whatsapp && (
        <DialogoWhatsApp
          destinatario={p.clienteNombre}
          telefono={cliente?.whatsapp ?? ""}
          mensaje={mensajePresupuesto(p, negocio?.nombre ?? e.org.nombre)}
          onCerrar={() => setWhatsapp(false)}
          onEnviado={() => {
            if (p.estado === "borrador") void ejecutar("presupuesto.estado", { presupuestoId: p.id, estado: "enviado" }, p.sucursalId)
          }}
        />
      )}
      {cobro && <DialogoCobro total={p.total} clienteId={p.clienteId} procesando={procesando} onConfirmar={convertir} onCerrar={() => setCobro(false)} />}
      {imprimir && (
        <AreaImpresion>
          <Comprobante presupuesto={p} />
        </AreaImpresion>
      )}
    </>
  )
}
