"use client"

import { useEffect } from "react"
import { RotateCcw } from "lucide-react"
import { Isotipo } from "@/components/marca/quvant"
import { Button } from "@/components/ui/button"
import { reportarError } from "@/lib/monitoreo"

/** Pantalla de error: avisa claro, reporta al monitoreo y permite reintentar. */
export function PantallaError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportarError(error, { digest: error.digest })
  }, [error])
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
      <Isotipo className="h-9" />
      <h1 className="text-2xl font-bold">Algo falló en esta pantalla</h1>
      <p className="max-w-md t-texto-sm text-muted-foreground">
        Tus datos están a salvo: lo que hiciste quedó guardado en este equipo. Ya registramos el error. Probá de nuevo.
      </p>
      {error.digest && <p className="ficha">Referencia {error.digest}</p>}
      <Button onClick={() => retry()}>
        <RotateCcw /> Reintentar
      </Button>
    </div>
  )
}
