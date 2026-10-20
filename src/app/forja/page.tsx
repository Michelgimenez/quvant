import type { Metadata } from "next"
import { EscenarioForjaGenerico } from "@/forja/ui/escenario-demo"

export const metadata: Metadata = {
  title: "Forja · demo",
  description: "Forja, by Quvant, con la empresa de demostración: la red de sucursales en vivo, cada sucursal por dentro y la repetición del día.",
}

/** Demo pública de Forja con la empresa ficticia (sello DEMO): sin sesión ni base. */
export default function PaginaForjaDemo() {
  return <EscenarioForjaGenerico />
}
