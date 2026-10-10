import type { Metadata } from "next"
import { Suspense } from "react"
import { Conteos } from "./conteos"

export const metadata: Metadata = { title: "Conteos" }

export default function PaginaConteos() {
  return (
    <Suspense>
      <Conteos />
    </Suspense>
  )
}
