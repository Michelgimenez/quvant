import type { Metadata } from "next"
import { Configuracion } from "./configuracion"

export const metadata: Metadata = { title: "Configuración" }

export default function PaginaConfiguracion() {
  return <Configuracion />
}
