import type { Metadata } from "next"
import { Precios } from "./precios"

export const metadata: Metadata = { title: "Precios" }

export default function PaginaPrecios() {
  return <Precios />
}
