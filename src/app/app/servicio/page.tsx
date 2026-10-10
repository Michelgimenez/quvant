import type { Metadata } from "next"
import { Suspense } from "react"
import { Servicio } from "./servicio"

export const metadata: Metadata = { title: "Servicio técnico" }

export default function PaginaServicio() {
  return (
    <Suspense>
      <Servicio />
    </Suspense>
  )
}
