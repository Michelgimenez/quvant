"use client"

import { useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { Banknote, CheckCircle2, CircleDollarSign, CreditCard, Landmark, QrCode, SplitSquareHorizontal, UserRound } from "lucide-react"
import { useDatos } from "@/cliente/app-contexto"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { aCentavos, formatoPesos } from "@/dominio/dinero"
import { saldoCliente } from "@/dominio/estado"
import type { Centavos, Id, MedioPago, Pago } from "@/dominio/tipos"
import { NOMBRE_MEDIO, totalPagos, vuelto } from "@/dominio/ventas"
import { cn } from "@/lib/utils"

const ICONO: Record<MedioPago, React.ComponentType<{ className?: string }>> = {
  efectivo: Banknote,
  debito: CreditCard,
  credito: CreditCard,
  transferencia: Landmark,
  mercadopago: QrCode,
  cuenta_corriente: UserRound,
}

/**
 * Cobro: uno o varios medios de pago. Mercado Pago y la factura están
 * EMULADOS en la demo (se ve y se marca así).
 */
export function DialogoCobro({
  total,
  clienteId,
  onConfirmar,
  onCerrar,
  procesando,
}: {
  total: Centavos
  clienteId: Id | null
  onConfirmar: (pagos: Pago[]) => void
  onCerrar: () => void
  procesando: boolean
}) {
  const { e } = useDatos()
  const cliente = clienteId ? e.clientes[clienteId] : null
  const conCuenta = Boolean(cliente && cliente.limiteCredito > 0)
  const [dividido, setDividido] = useState(false)
  const [pagos, setPagos] = useState<Pago[]>([{ medio: "efectivo", importe: total }])
  const [recibido, setRecibido] = useState("")
  const [mpAprobado, setMpAprobado] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  const medios: MedioPago[] = ["efectivo", "debito", "credito", "transferencia", "mercadopago", ...(conCuenta ? (["cuenta_corriente"] as const) : [])]
  const pagado = totalPagos(pagos)
  const falta = total - pagado
  const efectivo = pagos.filter((p) => p.medio === "efectivo").reduce((t, p) => t + p.importe, 0)
  const recibidoC = aCentavos(Number(recibido.replace(",", ".")) || 0)
  const usaMp = pagos.some((p) => p.medio === "mercadopago")
  const enCuenta = pagos.filter((p) => p.medio === "cuenta_corriente").reduce((t, p) => t + p.importe, 0)
  const disponible = cliente ? cliente.limiteCredito - saldoCliente(e, cliente.id) : 0

  const montoMp = pagos.filter((p) => p.medio === "mercadopago").reduce((t, p) => t + p.importe, 0)
  useEffect(() => {
    if (!usaMp) return
    QRCode.toDataURL(`YUNQUE-DEMO|cobro-emulado|${montoMp}`, { margin: 1, width: 180, color: { dark: "#0e1116", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null))
  }, [usaMp, montoMp])

  const elegir = (medio: MedioPago) => {
    setMpAprobado(false)
    if (!dividido) return setPagos([{ medio, importe: total }])
    setPagos((xs) => [...xs, { medio, importe: Math.max(0, total - totalPagos(xs)) }])
  }

  const puedeConfirmar = falta === 0 && pagos.every((p) => p.importe > 0) && (!usaMp || mpAprobado) && !procesando
  const confirmar = () => puedeConfirmar && onConfirmar(pagos.filter((p) => p.importe > 0))

  const vueltoTxt = useMemo(() => (recibidoC > 0 ? formatoPesos(vuelto(efectivo, recibidoC)) : null), [recibidoC, efectivo])

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg" onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLElement).tagName !== "BUTTON" && confirmar()}>
        <DialogHeader>
          <DialogTitle>Cobrar</DialogTitle>
          <DialogDescription>{cliente ? cliente.nombre : "Consumidor final"}</DialogDescription>
        </DialogHeader>
        <p className="text-4xl font-semibold tracking-tight" data-testid="total-cobro">
          {formatoPesos(total)}
        </p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Medio de pago">
          {medios.map((m) => {
            const I = ICONO[m]
            const activo = !dividido && pagos[0]?.medio === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => elegir(m)}
                aria-pressed={activo}
                className={cn("flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs transition-colors", activo ? "border-primary bg-primary/15 font-semibold" : "border-linea hover:border-acero/50")}
              >
                <I className="size-5" />
                {NOMBRE_MEDIO[m]}
              </button>
            )
          })}
        </div>
        <button type="button" className="inline-flex items-center gap-1.5 self-start text-xs text-enlace hover:underline" onClick={() => setDividido((d) => !d)}>
          <SplitSquareHorizontal className="size-3.5" /> {dividido ? "Un solo medio" : "Dividir el pago"}
        </button>

        {dividido && (
          <ul className="space-y-2">
            {pagos.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-32 text-sm">{NOMBRE_MEDIO[p.medio]}</span>
                <Input
                  inputMode="decimal"
                  value={p.importe / 100}
                  onChange={(ev) => setPagos((xs) => xs.map((x, k) => (k === i ? { ...x, importe: aCentavos(Number(ev.target.value.replace(",", ".")) || 0) } : x)))}
                  className="num h-9"
                  aria-label={`Importe ${NOMBRE_MEDIO[p.medio]}`}
                />
                <Button size="sm" variant="ghost" onClick={() => setPagos((xs) => xs.filter((_, k) => k !== i))}>
                  Quitar
                </Button>
              </li>
            ))}
            <p className={cn("text-xs", falta === 0 ? "text-ok-texto" : "text-chispa-texto")}>{falta === 0 ? "Pagos completos." : falta > 0 ? `Falta asignar ${formatoPesos(falta)}` : `Sobra ${formatoPesos(-falta)}`}</p>
          </ul>
        )}

        {efectivo > 0 && (
          <div className="flex items-end gap-3 rounded-lg border border-linea p-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="recibido">Recibido en efectivo</Label>
              <Input id="recibido" inputMode="decimal" value={recibido} onChange={(ev) => setRecibido(ev.target.value)} placeholder={String(efectivo / 100)} className="num" />
            </div>
            <div className="pb-1 text-right">
              <p className="text-xs text-muted-foreground">Vuelto</p>
              <p className="num text-lg font-semibold">{vueltoTxt ?? "—"}</p>
            </div>
          </div>
        )}

        {usaMp && (
          <div className="flex items-center gap-4 rounded-lg border border-dashed border-chispa/60 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- QR generado en el navegador (data URL) */}
            {qr ? <img src={qr} alt="Código QR de cobro (emulado)" className="size-28 rounded bg-white p-1" /> : <div className="size-28 rounded bg-muted" />}
            <div className="space-y-2 text-sm">
              <p className="ficha">Cobro emulado · demo</p>
              <p className="text-muted-foreground">En producción el QR lo genera Mercado Pago y la acreditación llega sola.</p>
              {mpAprobado ? (
                <p className="inline-flex items-center gap-1 font-medium text-ok-texto">
                  <CheckCircle2 className="size-4" /> Pago acreditado (simulado)
                </p>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setMpAprobado(true)}>
                  <CircleDollarSign /> Simular pago acreditado
                </Button>
              )}
            </div>
          </div>
        )}

        {enCuenta > 0 && cliente && (
          <p className={cn("rounded-lg border px-3 py-2 text-sm", enCuenta > disponible ? "border-error/50 bg-error/10" : "border-linea")}>
            Cuenta corriente: disponible {formatoPesos(Math.max(0, disponible))}.
            {enCuenta > disponible && " Supera el límite: la venta queda marcada para revisar."}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Volver
          </Button>
          <Button size="lg" onClick={confirmar} disabled={!puedeConfirmar} data-testid="confirmar-venta">
            Confirmar venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
