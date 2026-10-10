import type { Metadata } from "next"
import { Mostrador } from "./mostrador"

export const metadata: Metadata = { title: "Mostrador" }

export default function PaginaMostrador() {
  return <Mostrador />
}
