import type { Metadata } from "next"
import { Importar } from "./importar"

export const metadata: Metadata = { title: "Importar datos" }

export default function PaginaImportar() {
  return <Importar />
}
