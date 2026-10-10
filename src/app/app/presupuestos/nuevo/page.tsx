import type { Metadata } from "next"
import { Suspense } from "react"
import { EditorPresupuesto } from "./editor"

export const metadata: Metadata = { title: "Presupuesto" }

export default function PaginaNuevoPresupuesto() {
  return (
    <Suspense>
      <EditorPresupuesto />
    </Suspense>
  )
}
