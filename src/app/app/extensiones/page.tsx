import type { Metadata } from "next"
import { Extensiones } from "./extensiones"

export const metadata: Metadata = { title: "Extensiones" }

export default function PaginaExtensiones() {
  return <Extensiones />
}
