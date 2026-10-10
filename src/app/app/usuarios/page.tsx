import type { Metadata } from "next"
import { Usuarios } from "./usuarios"

export const metadata: Metadata = { title: "Usuarios y permisos" }

export default function PaginaUsuarios() {
  return <Usuarios />
}
