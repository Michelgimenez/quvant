import type { Metadata } from "next"
import { ForjaPagina } from "./forja-pagina"

export const metadata: Metadata = { title: "Forja" }

export default function PaginaForja() {
  return <ForjaPagina />
}
