import type { Metadata } from "next"
import { Suspense } from "react"
import { Reportes } from "./reportes"

export const metadata: Metadata = { title: "Reportes" }

export default function PaginaReportes() {
  return (
    <Suspense>
      <Reportes />
    </Suspense>
  )
}
