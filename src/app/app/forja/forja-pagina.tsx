"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useApp } from "@/cliente/app-contexto"
import { Requiere } from "@/components/app/pagina"
import { MarcaForja } from "@/forja/ui/marca-forja"

/** Todo lo pesado de Forja (Three.js, MapLibre, deck.gl, GSAP) vive en este chunk. */
const UniversoForjaApp = dynamic(() => import("@/forja/ui/universo-app").then((m) => m.UniversoForjaApp), {
  ssr: false,
  loading: () => <Cargando />,
})

function Cargando() {
  return (
    <div className="dark flex h-full items-center justify-center bg-negro" role="status">
      <MarcaForja tamano={26} className="animate-pulse opacity-70" />
    </div>
  )
}

export function ForjaPagina() {
  return (
    <Requiere permiso="forja.ver">
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </Requiere>
  )
}

function Contenido() {
  const { extensionActiva, puede } = useApp()
  const params = useSearchParams()
  if (!extensionActiva("forja")) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-4 text-center">
        <div className="mx-auto w-fit rounded-xl bg-negro px-4 py-3">
          <MarcaForja tamano={26} />
        </div>
        <h1 className="text-xl font-bold">Forja no está activada</h1>
        <p className="t-texto-sm text-muted-foreground">Forja muestra las sucursales conectadas como un taller vivo, sobre los datos de Quvant.</p>
        {puede("extensiones.gestionar") ? (
          <Link href="/app/extensiones" className="t-texto-sm text-foreground underline-offset-4 hover:underline">
            Activarla en Extensiones
          </Link>
        ) : (
          <p className="t-texto-sm text-muted-foreground">Pedile a quien administra Quvant que la active.</p>
        )}
      </div>
    )
  }
  return (
    // Escena a pantalla completa dentro del marco de la app (siempre en oscuro). En celular
    // termina arriba de la barra de accesos; overflow-clip: nada la puede desplazar.
    <div className="dark -mx-3 -mb-24 -mt-4 h-[calc(100dvh-7.25rem-1px-env(safe-area-inset-bottom))] overflow-clip bg-negro text-blanco sm:-mx-5 sm:-mt-6 lg:-mb-10 lg:h-[calc(100dvh-3.75rem)]" data-testid="forja">
      <UniversoForjaApp activacion={params.get("activacion") === "1"} simulacion={params.get("simulacion") !== "0"} pieza={params.get("pieza")} />
    </div>
  )
}
