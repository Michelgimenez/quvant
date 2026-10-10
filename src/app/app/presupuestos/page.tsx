import type { Metadata } from "next"
import { Suspense } from "react"
import { Presupuestos } from "./presupuestos"

export const metadata: Metadata = { title: "Presupuestos" }

export default function PaginaPresupuestos() {
  return (
    <Suspense>
      <Presupuestos />
    </Suspense>
  )
}
