import type { Metadata } from "next"
import { Entregas } from "./entregas"

export const metadata: Metadata = { title: "Entregas" }

export default function PaginaEntregas() {
  return <Entregas />
}
