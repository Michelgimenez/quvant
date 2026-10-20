import { Suspense } from "react"
import { ShieldCheck } from "lucide-react"
import { FormularioCodigo } from "./formulario-codigo"

export default function PaginaVerificar() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-foreground/15 text-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <h1 className="text-3xl font-bold">Verificación en dos pasos</h1>
        <p className="t-texto-sm text-muted-foreground">
          Dueños y administración necesitan un código del autenticador además de la contraseña.
        </p>
      </div>
      <Suspense>
        <FormularioCodigo />
      </Suspense>
    </div>
  )
}
