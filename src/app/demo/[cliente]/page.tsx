import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CLIENTES, clienteDemo } from "@/config/clientes"
import { DeckCliente } from "./deck"

export function generateStaticParams() {
  return Object.keys(CLIENTES).map((cliente) => ({ cliente }))
}

export async function generateMetadata({ params }: PageProps<"/demo/[cliente]">): Promise<Metadata> {
  const c = clienteDemo((await params).cliente)
  return {
    title: c ? `Así se vería Yunque en ${c.nombre}` : "Demo",
    robots: { index: false, follow: false },
  }
}

// params se espera fuera de <Suspense>: los prospectos configurados se generan en
// el build y cualquier otro slug responde 404 de verdad (no un 200 con la página de error).
export default async function PaginaDemoCliente({ params }: PageProps<"/demo/[cliente]">) {
  const cliente = clienteDemo((await params).cliente)
  if (!cliente) notFound()
  return <DeckCliente cliente={cliente} />
}
