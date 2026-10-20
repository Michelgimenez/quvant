import type { Metadata } from "next"
import { Suspense } from "react"
import { DemoQuvant } from "@/components/demo/demo-quvant"
import { esIdEmpresa } from "@/demo/empresas"

export const metadata: Metadata = {
  title: "Demo · un sistema, cuatro negocios",
  description: "El mismo Quvant en un kiosco, una ferretería, una distribuidora y un grupo de 40 sucursales. Empresas ficticias, datos de demostración.",
  robots: { index: false, follow: false },
}

/** /demo: pública, sin login y sin tocar la base. `?empresa=kiosco|ferreteria|distribuidora|grupo` abre una empresa directo; `?recorrido=1` arranca el recorrido guiado. */
export default function PaginaDemo({ searchParams }: PageProps<"/demo">) {
  return (
    <Suspense fallback={<div className="dark min-h-dvh bg-negro" aria-busy />}>
      <ContenidoDemo searchParams={searchParams} />
    </Suspense>
  )
}

async function ContenidoDemo({ searchParams }: { searchParams: PageProps<"/demo">["searchParams"] }) {
  const p = await searchParams
  const empresa = typeof p.empresa === "string" && esIdEmpresa(p.empresa) ? p.empresa : null
  return <DemoQuvant empresaInicial={empresa} filmando={p.film === "1"} recorrido={p.recorrido === "1"} />
}
