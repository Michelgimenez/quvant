"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ES_DEMO } from "@/lib/modo"
import { verificarCodigo, type EstadoVerificacion } from "../acciones"

type CodigoDemo = { codigo: string; segundosRestantes: number }

export function FormularioCodigo() {
  const params = useSearchParams()
  const [estado, accion, pendiente] = useActionState<EstadoVerificacion, FormData>(verificarCodigo, {})
  const [demo, setDemo] = useState<CodigoDemo | null>(null)

  // Modo demo: el "autenticador" está emulado y muestra el código vigente.
  useEffect(() => {
    if (!ES_DEMO) return
    let activo = true
    let temporizador: number | undefined
    const cargar = async () => {
      const r = await fetch("/api/ingreso/codigo-demo", { cache: "no-store" })
      if (!activo) return
      if (r.ok) {
        const datos = (await r.json()) as CodigoDemo
        setDemo(datos)
        temporizador = window.setTimeout(cargar, (datos.segundosRestantes + 1) * 1000)
      }
    }
    cargar()
    return () => {
      activo = false
      window.clearTimeout(temporizador)
    }
  }, [])

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="siguiente" value={params.get("siguiente") ?? "/app"} />
      {params.get("enrolar") && (
        <p className="rounded-md border border-chispa/40 bg-chispa/10 px-3 py-2 text-sm">
          Tu cuenta todavía no tiene un autenticador configurado. Pedile a quien administra Yunque en tu empresa que active el doble
          factor para tu usuario.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="codigo">Código de 6 dígitos</Label>
        <Input
          id="codigo"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className="num h-12 text-center text-2xl tracking-[0.4em]"
          aria-invalid={Boolean(estado.error) || undefined}
          aria-describedby={estado.error ? "error-codigo" : undefined}
        />
      </div>
      {estado.error && (
        <p id="error-codigo" role="alert" className="text-sm font-medium text-error-texto">
          {estado.error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11 w-full text-[15px]" disabled={pendiente}>
        {pendiente && <Loader2 className="animate-spin" />}
        Verificar
      </Button>
      {ES_DEMO && (
        <div className="rounded-lg border border-dashed border-chispa/60 bg-chispa/5 p-3 text-sm">
          <p className="ficha mb-1">Autenticador emulado · solo demo</p>
          {demo ? (
            <p>
              Código actual: <span data-testid="codigo-demo" className="num text-lg font-bold text-chispa-texto">{demo.codigo.replace(/(\d{3})(\d{3})/, "$1 $2")}</span>
              <span className="text-muted-foreground"> · cambia en {demo.segundosRestantes} s</span>
            </p>
          ) : (
            <p className="text-muted-foreground">Cargando código…</p>
          )}
        </div>
      )}
      <Link href="/ingresar" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Volver
      </Link>
    </form>
  )
}
