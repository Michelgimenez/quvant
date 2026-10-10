import type { Metadata } from "next"
import { Suspense } from "react"
import { Clientes } from "./clientes"

export const metadata: Metadata = { title: "Clientes" }

export default function PaginaClientes() {
  return (
    <Suspense>
      <Clientes />
    </Suspense>
  )
}
