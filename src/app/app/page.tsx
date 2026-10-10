import type { Metadata } from "next"
import { Tablero } from "@/components/app/tablero"

export const metadata: Metadata = { title: "Tablero" }

export default function PaginaTablero() {
  return <Tablero />
}
