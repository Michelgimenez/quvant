import { Suspense } from "react"
import { FormularioIngreso } from "./formulario-ingreso"

export default function PaginaIngreso() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold">Ingresá a tu cuenta</h1>
        <p className="t-texto-sm text-muted-foreground">Sistema de gestión · inventario, mostrador y más.</p>
      </div>
      <Suspense>
        <FormularioIngreso />
      </Suspense>
    </div>
  )
}
