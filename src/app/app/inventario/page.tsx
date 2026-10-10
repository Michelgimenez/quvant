import type { Metadata } from "next"
import { Suspense } from "react"
import { Inventario } from "./inventario"

export const metadata: Metadata = { title: "Inventario" }

export default function PaginaInventario() {
  return (
    <Suspense>
      <Inventario />
    </Suspense>
  )
}
