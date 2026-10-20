"use client"

import { useRef, useState } from "react"
import { ArrowDownToLine, Lock, LockOpen, Wallet } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { lanzarSalto } from "@/components/marca/salto"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cajaAbierta, efectivoEsperado, resumenSesion } from "@/dominio/caja"
import { aCentavos, formatoPesos } from "@/dominio/dinero"
import type { Id, MedioPago, SesionCaja } from "@/dominio/tipos"
import { NOMBRE_MEDIO } from "@/dominio/ventas"
import { cn } from "@/lib/utils"

export function useCaja(sucursalId: Id, puesto: number) {
  const { e } = useDatos()
  return cajaAbierta(e, sucursalId, puesto)
}

/** Barra de estado de la caja del puesto, con abrir / movimiento / cerrar. */
export function BarraCaja({ sucursalId, puesto }: { sucursalId: Id; puesto: number }) {
  const { e } = useDatos()
  const caja = useCaja(sucursalId, puesto)
  const [dialogo, setDialogo] = useState<"abrir" | "cerrar" | "movimiento" | null>(null)
  const quien = caja ? e.usuarios.find((u) => u.id === caja.abiertaPor)?.nombre.split(" ")[0] : null
  return (
    <div className={cn("flex items-center gap-3 whitespace-nowrap rounded-lg border bg-card py-1.5 pl-3 pr-1.5", caja ? "border-linea" : "border-alerta/60")}>
      {caja ? <LockOpen className="size-4 shrink-0 text-ok" /> : <Lock className="size-4 shrink-0 text-alerta" />}
      <span className="min-w-0 flex-1 truncate">
        {caja ? (
          <>
            <span className="t-etiqueta">Caja abierta</span>
            <span className="t-dato text-muted-foreground">
              {" "}
              · {new Date(caja.apertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} · {quien}
            </span>
          </>
        ) : (
          <span className="t-etiqueta text-alerta">Caja cerrada en este puesto</span>
        )}
      </span>
      {caja ? (
        <>
          <Button size="icon-sm" variant="ghost" onClick={() => setDialogo("movimiento")} aria-label="Retiro o gasto" title="Retiro o gasto">
            <ArrowDownToLine />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialogo("cerrar")} data-testid="cerrar-caja">
            <Wallet /> Cerrar caja
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={() => setDialogo("abrir")}>
          <LockOpen /> Abrir caja
        </Button>
      )}
      {dialogo === "abrir" && <DialogoAbrir sucursalId={sucursalId} puesto={puesto} onCerrar={() => setDialogo(null)} />}
      {dialogo === "movimiento" && caja && <DialogoMovimiento caja={caja} onCerrar={() => setDialogo(null)} />}
      {dialogo === "cerrar" && caja && <DialogoCierre caja={caja} onCerrar={() => setDialogo(null)} />}
    </div>
  )
}

export function DialogoAbrir({ sucursalId, puesto, onCerrar }: { sucursalId: Id; puesto: number; onCerrar: () => void }) {
  const { ejecutar, motor } = useApp()
  const [monto, setMonto] = useState("50000")
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Abrir caja · puesto {puesto}</DialogTitle>
          <DialogDescription>Contá el efectivo con el que arrancás.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const r = await ejecutar("caja.abrir", { sesionId: motor.uuid(), sucursalId, puesto, montoInicial: aCentavos(Number(monto.replace(",", "."))) }, sucursalId)
            if (!r.ok) return toast.error(r.error)
            toast.success("Caja abierta")
            onCerrar()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="caja-inicial">Efectivo inicial ($)</Label>
            <Input id="caja-inicial" inputMode="decimal" value={monto} onChange={(ev) => setMonto(ev.target.value)} className="num h-11 text-lg" autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">Abrir caja</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogoMovimiento({ caja, onCerrar }: { caja: SesionCaja; onCerrar: () => void }) {
  const { ejecutar, motor } = useApp()
  const [tipo, setTipo] = useState<"retiro" | "gasto" | "ingreso">("retiro")
  const [monto, setMonto] = useState("")
  const [motivo, setMotivo] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Movimiento de caja</DialogTitle>
          <DialogDescription>Retiros a caja fuerte, gastos menores o ingresos de efectivo.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const r = await ejecutar("caja.movimiento", { movimientoId: motor.uuid(), sesionId: caja.id, tipo, importe: aCentavos(Number(monto.replace(",", "."))), motivo }, caja.sucursalId)
            if (!r.ok) return toast.error(r.error)
            toast.success("Movimiento registrado")
            onCerrar()
          }}
        >
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Tipo de movimiento">
            {(["retiro", "gasto", "ingreso"] as const).map((t) => (
              <Button key={t} type="button" variant={tipo === t ? "default" : "outline"} onClick={() => setTipo(t)} role="radio" aria-checked={tipo === t} className="capitalize">
                {t}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-monto">Importe ($)</Label>
            <Input id="mov-monto" inputMode="decimal" value={monto} onChange={(ev) => setMonto(ev.target.value)} className="num" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-motivo">Motivo</Label>
            <Input id="mov-motivo" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} required minLength={3} />
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

function DialogoCierre({ caja, onCerrar }: { caja: SesionCaja; onCerrar: () => void }) {
  const { e } = useDatos()
  const { ejecutar } = useApp()
  const ahora = new Date().toISOString()
  const esperado = efectivoEsperado(e, caja, ahora)
  const resumen = resumenSesion(e, caja, ahora)
  const [contado, setContado] = useState(String(esperado / 100))
  const boton = useRef<HTMLButtonElement>(null)
  const contadoC = aCentavos(Number(contado.replace(",", ".")) || 0)
  const diferencia = contadoC - esperado

  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar caja · puesto {caja.puesto}</DialogTitle>
          <DialogDescription>
            {resumen.ventas} ventas desde las {new Date(caja.apertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 rounded-lg border border-linea p-3 t-texto-sm">
          {Object.entries(resumen.porMedio).map(([m, v]) => (
            <li key={m} className="flex justify-between">
              <span className="text-muted-foreground">{NOMBRE_MEDIO[m as MedioPago]}</span>
              <span className="num">{formatoPesos(v)}</span>
            </li>
          ))}
          {Object.keys(resumen.porMedio).length === 0 && <li className="text-muted-foreground">Sin ventas en esta sesión.</li>}
        </ul>
        <div className="space-y-1.5">
          <div className="flex justify-between t-texto-sm">
            <span>Efectivo esperado</span>
            <span className="num font-semibold">{formatoPesos(esperado)}</span>
          </div>
          <Label htmlFor="caja-contado">Efectivo contado ($)</Label>
          <Input id="caja-contado" inputMode="decimal" value={contado} onChange={(ev) => setContado(ev.target.value)} className="num h-11 text-lg" autoFocus />
          <p className={cn("t-texto-sm", diferencia === 0 ? "text-ok" : "text-alerta")}>
            {diferencia === 0 ? "Coincide con lo esperado." : `Diferencia: ${formatoPesos(diferencia, { signo: true })}`}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            ref={boton}
            onClick={async () => {
              const r = await ejecutar("caja.cerrar", { sesionId: caja.id, montoContado: contadoC }, caja.sucursalId)
              if (!r.ok) return toast.error(r.error)
              lanzarSalto({ desde: boton.current, mensaje: "Caja cerrada" })
              toast.success("Caja cerrada", { description: diferencia === 0 ? "Sin diferencias." : `Diferencia registrada: ${formatoPesos(diferencia, { signo: true })}` })
              onCerrar()
            }}
          >
            Cerrar caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
