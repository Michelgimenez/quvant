"use client"

import { useEffect, useState } from "react"
import { AumentoMasivo } from "@/components/precios/aumento-masivo"
import { generarEmpresaDemo } from "@/datos/demo/generar"
import type { EstadoEmpresa } from "@/dominio/estado"

/** El aumento masivo de la app, sobre el catálogo de la empresa demo (no aplica nada). */
export function PreciosAlDia() {
  const [e, setE] = useState<EstadoEmpresa | null>(null)
  useEffect(() => {
    const t = window.setTimeout(() => setE(generarEmpresaDemo({ dias: 7 })), 0)
    return () => window.clearTimeout(t)
  }, [])
  if (!e) return null
  const torkan = e.marcas.find((m) => m.nombre === "Torkan")
  return (
    <div className="dark rounded-2xl border border-white/10 bg-superficie/60 p-4 text-foreground sm:p-6" data-testid="precios-al-dia">
      <AumentoMasivo e={e} verCostos inicial={{ marcaIds: torkan ? [torkan.id] : [], porcentaje: 8 }} />
      <p className="mt-3 text-xs text-acero">Catálogo de la empresa de demostración (marcas y precios ficticios). En la app, un clic aplica el aumento y queda en el historial para revertirlo.</p>
    </div>
  )
}
