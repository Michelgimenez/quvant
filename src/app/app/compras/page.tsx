import type { Metadata } from "next"
import { Suspense } from "react"
import { Compras } from "./compras"

export const metadata: Metadata = { title: "Compras" }

export default function PaginaCompras() {
  return (
    <Suspense>
      <Compras />
    </Suspense>
  )
}
