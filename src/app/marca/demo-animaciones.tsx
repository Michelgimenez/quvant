"use client"

import { useState } from "react"
import { RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { YunqueArmado } from "@/components/marca/yunque-armado"
import { CapaSaltos, lanzarSalto } from "@/components/marca/salto"

export function DemoAnimaciones() {
  const [vuelta, setVuelta] = useState(0)
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-extrabold">Movimiento</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col items-center gap-4 rounded-xl bg-hierro p-8">
          <YunqueArmado key={vuelta} className="h-40 w-auto" />
          <Button variant="outline" onClick={() => setVuelta((v) => v + 1)}>
            <RotateCcw /> Armar de nuevo
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-linea bg-card p-8 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            La chispa aparece solo en logros: cola sincronizada, presupuesto convertido, cierre de caja, conteo sin diferencias.
          </p>
          <Button onClick={(e) => lanzarSalto({ desde: e.currentTarget, mensaje: "Cola sincronizada · 3 ventas" })}>
            <Sparkles /> Probar momento chispa
          </Button>
          <CapaSaltos />
        </div>
      </div>
    </section>
  )
}
