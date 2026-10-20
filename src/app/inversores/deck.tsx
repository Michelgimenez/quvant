"use client"

import { ProveedoresInterfaz } from "@/components/base/proveedores-interfaz"
import { ESCENAS_INVERSORES, ProveedorDatosInversores, type DatosInversores } from "@/components/presentacion/escenas-inversores"
import { Presentacion } from "@/components/presentacion/motor"

/** Lo que se precarga antes de empezar: la imagen de la escala quieta (la escena estrella). */
const RECURSOS = ["/capturas/sitio/tablero-kiosco.png"]

export function DeckInversores({ datos }: { datos: DatosInversores }) {
  return (
    <ProveedoresInterfaz>
      <ProveedorDatosInversores value={{ datos }}>
        <Presentacion nombre="Quvant · presentación para inversores" escenas={ESCENAS_INVERSORES} recursos={RECURSOS} pie="Confidencial" />
      </ProveedorDatosInversores>
    </ProveedoresInterfaz>
  )
}
