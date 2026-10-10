import type { Metadata } from "next"
import { Suspense } from "react"
import { PuertaClave } from "@/components/presentacion/puerta-clave"
import { CONTACTO_INVERSORES, EQUIPO, INVERSION } from "@/config/inversion"
import { ACCESO_INVERSORES } from "@/lib/auth/presentaciones"
import { entrarInversores } from "./acciones"
import { DeckInversores } from "./deck"

export const metadata: Metadata = {
  title: "Inversores",
  robots: { index: false, follow: false },
}

export default function PaginaInversores() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-hierro" />}>
      <Contenido />
    </Suspense>
  )
}

async function Contenido() {
  if (!(await ACCESO_INVERSORES.tiene())) {
    return (
      <PuertaClave
        titulo="Presentación para inversores"
        bajada="Contenido confidencial. Ingresá la clave que te compartimos."
        accion={entrarInversores}
        habilitada={ACCESO_INVERSORES.clave() !== null}
      />
    )
  }
  // Los datos sensibles viajan recién acá, después de validar la clave.
  return <DeckInversores datos={{ inversion: INVERSION, equipo: EQUIPO, contacto: CONTACTO_INVERSORES }} />
}
