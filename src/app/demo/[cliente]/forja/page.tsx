import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CLIENTES, clienteDemo } from "@/config/clientes"
import { EscenarioForjaCliente } from "@/forja/ui/escenario-demo"

// Bloqueante a propósito: un prospecto sin demo de Forja responde 404 de verdad
export const instant = false

export function generateStaticParams() {
  return Object.values(CLIENTES)
    .filter((c) => c.forja)
    .map((c) => ({ cliente: c.slug }))
}

export async function generateMetadata({ params }: PageProps<"/demo/[cliente]/forja">): Promise<Metadata> {
  const c = clienteDemo((await params).cliente)
  return {
    title: c ? `Así se vería Forja en ${c.nombre}` : "Demo",
    robots: { index: false, follow: false },
  }
}

/**
 * Forja para un prospecto (PROPUESTA): embebible en un iframe desde los
 * orígenes de su configuración (CSP en next.config.ts, solo en esta ruta).
 */
export default async function PaginaForjaCliente({ params }: PageProps<"/demo/[cliente]/forja">) {
  const cliente = clienteDemo((await params).cliente)
  if (!cliente?.forja) notFound()
  return <EscenarioForjaCliente slug={cliente.slug} />
}
