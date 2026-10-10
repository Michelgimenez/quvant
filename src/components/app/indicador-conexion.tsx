"use client"

import { useEffect, useRef, useState } from "react"
import { CloudOff, Loader2, RefreshCw, Unplug, Wifi } from "lucide-react"
import { useApp, useConexion } from "@/cliente/app-contexto"
import { corteSimulado, setCorteSimulado } from "@/cliente/red"
import { Punto } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const NOMBRE_OP: Record<string, string> = {
  "venta.crear": "Venta",
  "presupuesto.convertir": "Presupuesto → venta",
  "presupuesto.guardar": "Presupuesto",
  "stock.ajustar": "Ajuste de stock",
  "caja.cerrar": "Cierre de caja",
  "caja.abrir": "Apertura de caja",
  "conteo.registrar": "Conteo",
  "conteo.cerrar": "Cierre de conteo",
  "cliente.guardar": "Cliente",
  "servicio.estado": "Servicio técnico",
}

/** "Sincronizado" / "Sin conexión · 3 ventas en cola" + panel de la cola. */
export function IndicadorConexion({ compacto = false }: { compacto?: boolean }) {
  const { motor } = useApp()
  const { estado, pendientes, ultimaSincronizacion, sincronizar } = useConexion()
  const [corte, setCorte] = useState(corteSimulado())
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.dataset.indicadorConexion = "1"
  }, [])

  const ventas = motor.pendientes.filter((o) => o.tipo === "venta.crear" || o.tipo === "presupuesto.convertir").length
  const texto =
    estado === "sin_conexion"
      ? pendientes
        ? `Sin conexión · ${ventas ? `${ventas} ${ventas === 1 ? "venta" : "ventas"}` : `${pendientes} cambio${pendientes === 1 ? "" : "s"}`} en cola`
        : "Sin conexión"
      : estado === "sincronizando" || pendientes
        ? "Sincronizando"
        : "Sincronizado"
  const tono = estado === "sin_conexion" ? "chispa" : estado === "sincronizando" || pendientes ? "acero" : "ok"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          id="indicador-conexion"
          type="button"
          aria-label={`Estado de conexión: ${texto}`}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
            estado === "sin_conexion" ? "border-chispa/50 bg-chispa/10" : "border-linea bg-superficie-2 hover:border-acero/40",
          )}
        >
          {estado === "sincronizando" ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : <Punto tono={tono} pulso={estado === "sin_conexion"} />}
          <span className={cn(compacto && "sr-only sm:not-sr-only")} data-testid="estado-conexion">
            {texto}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 rounded-md p-1.5", estado === "sin_conexion" ? "bg-chispa/15 text-chispa-texto" : "bg-ok/15 text-ok-texto")}>
            {estado === "sin_conexion" ? <CloudOff className="size-4" /> : <Wifi className="size-4" />}
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{estado === "sin_conexion" ? "Trabajando sin conexión" : "Conectado"}</p>
            <p className="text-xs text-muted-foreground">
              {estado === "sin_conexion"
                ? "Podés seguir vendiendo. Todo queda guardado en este equipo y se sincroniza solo cuando vuelve internet."
                : ultimaSincronizacion
                  ? `Última sincronización: ${new Date(ultimaSincronizacion).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "Todavía no se sincronizó."}
            </p>
          </div>
        </div>

        <div>
          <p className="ficha mb-1.5">Cola · {pendientes} pendiente{pendientes === 1 ? "" : "s"}</p>
          {pendientes === 0 ? (
            <p className="text-xs text-muted-foreground">Nada pendiente.</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-auto text-xs">
              {motor.pendientes.map((op) => (
                <li key={op.id} className="flex justify-between gap-2 rounded bg-superficie-2 px-2 py-1">
                  <span>{NOMBRE_OP[op.tipo] ?? op.tipo}</span>
                  <span className="num text-muted-foreground">{new Date(op.creadaEn).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-linea p-2.5">
          <label htmlFor="corte-simulado" className="flex items-center gap-2 text-xs">
            <Unplug className="size-3.5 text-muted-foreground" />
            Simular corte de conexión
          </label>
          <Switch
            id="corte-simulado"
            checked={corte}
            onCheckedChange={(v) => {
              setCorte(v)
              setCorteSimulado(v)
            }}
          />
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={() => void sincronizar()} disabled={estado === "sincronizando"}>
          <RefreshCw /> Sincronizar ahora
        </Button>
      </PopoverContent>
    </Popover>
  )
}
