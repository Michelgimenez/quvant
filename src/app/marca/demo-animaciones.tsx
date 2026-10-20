"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IsotipoAnimado } from "@/components/marca/isotipo-animado"
import { Grilla } from "@/components/marca/grilla"
import { CapaSaltos, lanzarSalto } from "@/components/marca/salto"

/** El movimiento de la marca: la Q que se arma y el salto como recompensa. */
export function DemoAnimaciones() {
  const [vuelta, setVuelta] = useState(0)
  return (
    <section className="space-y-4">
      <h2 className="t-etiqueta text-muted-foreground">Movimiento</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="dark relative flex flex-col items-center gap-6 overflow-hidden border border-gris-3 bg-negro p-10">
          <Grilla />
          <div className="relative">
            <IsotipoAnimado key={vuelta} lado={160} />
          </div>
          <Button variant="outline" className="relative" onClick={() => setVuelta((v) => v + 1)}>
            <RotateCcw /> Armar de nuevo
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 border border-border bg-card p-10 text-center">
          <p className="t-texto-sm max-w-sm text-muted-foreground">
            El salto aparece solo cuando algo cierra justo: caja sin diferencias, conteo que coincide, cola sincronizada, presupuesto que pasa a venta, aprobación completa.
          </p>
          <Button onClick={(e) => lanzarSalto({ desde: e.currentTarget, mensaje: "Cola sincronizada · 3 ventas" })}>Probar el salto</Button>
          <CapaSaltos />
        </div>
      </div>
    </section>
  )
}
