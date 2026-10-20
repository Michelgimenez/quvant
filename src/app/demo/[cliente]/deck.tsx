"use client"

import { useCallback, useState } from "react"
import { crearDemoEmbebida, type DemoEmbebida } from "@/cliente/demo-embebida"
import { ProveedoresInterfaz } from "@/components/base/proveedores-interfaz"
import { ESCENAS_CLIENTE, ProveedorDemoCliente } from "@/components/presentacion/escenas-cliente"
import { Presentacion } from "@/components/presentacion/motor"
import type { ClienteDemo } from "@/config/clientes"

export function DeckCliente({ cliente }: { cliente: ClienteDemo }) {
  const [demo, setDemo] = useState<DemoEmbebida | null>(null)
  // La empresa demo de siempre (datos ficticios) vestida con la marca del prospecto
  const preparar = useCallback(async () => {
    setDemo(
      await crearDemoEmbebida({
        email: "dueno@demo.quvant.app",
        org: { nombre: cliente.nombre, slug: cliente.slug, colorAcento: cliente.color, logo: cliente.logo, logoNegativo: cliente.logoNegativo },
      }),
    )
  }, [cliente])
  const recursos = [cliente.logo, cliente.logoNegativo, ...(cliente.isotipo ? [cliente.isotipo] : [])]
  return (
    <ProveedoresInterfaz>
      <ProveedorDemoCliente value={{ cliente, demo }}>
        <Presentacion nombre={`Así se vería Quvant en ${cliente.nombre} · propuesta`} escenas={ESCENAS_CLIENTE} recursos={recursos} preparar={preparar} pie="Propuesta" />
      </ProveedorDemoCliente>
    </ProveedoresInterfaz>
  )
}
