"use client"

import { useCallback, useState } from "react"
import { crearDemoEmbebida, type DemoEmbebida } from "@/cliente/demo-embebida"
import { ProveedoresInterfaz } from "@/components/base/proveedores-interfaz"
import { ESCENAS_INVERSORES, ProveedorDatosInversores, type DatosInversores } from "@/components/presentacion/escenas-inversores"
import { Presentacion } from "@/components/presentacion/motor"

const RECURSOS = ["/demo/ferreteria-industrial-demo-oscuro.svg", "/demo/ferreteria-industrial-demo-claro.svg"]

export function DeckInversores({ datos }: { datos: DatosInversores }) {
  const [demo, setDemo] = useState<DemoEmbebida | null>(null)
  const preparar = useCallback(async () => {
    setDemo(await crearDemoEmbebida())
  }, [])
  return (
    <ProveedoresInterfaz>
      <ProveedorDatosInversores value={{ datos, demo }}>
        <Presentacion nombre="Yunque · presentación para inversores" escenas={ESCENAS_INVERSORES} recursos={RECURSOS} preparar={preparar} pie="Confidencial" />
      </ProveedorDatosInversores>
    </ProveedoresInterfaz>
  )
}
