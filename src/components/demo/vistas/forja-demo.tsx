"use client"

import dynamic from "next/dynamic"
import type { IdForjaDemo } from "@/demo/forja-demo"
import { MarcaForja } from "@/forja/ui/marca-forja"

function Cargando() {
  return (
    <div className="flex h-full items-center justify-center" role="status">
      <MarcaForja tamano={26} className="animate-pulse opacity-70" />
    </div>
  )
}

/** Todo lo pesado de Forja (mapa, 3D, deck.gl) se descarga recién al abrir el módulo. */
const Universo = dynamic(() => import("./forja-universo").then((m) => m.ForjaUniversoDemo), { ssr: false, loading: () => <Cargando /> })

/** Forja en la barra lateral del grupo y de la distribuidora: a sangre, siempre en oscuro. */
export function ForjaDemo({ empresa }: { empresa: IdForjaDemo }) {
  return (
    <div className="dark h-full overflow-clip bg-negro text-blanco" data-testid="forja-demo">
      <Universo key={empresa} empresa={empresa} />
    </div>
  )
}
