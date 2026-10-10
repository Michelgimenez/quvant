import Link from "next/link"
import { Isotipo } from "@/components/marca/marca"

export default function NoEncontrado() {
  return (
    <main className="grilla-tecnica flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Isotipo className="h-10" />
      <p className="ficha">Error 404</p>
      <h1 className="text-3xl font-extrabold">Esta página no existe</h1>
      <p className="text-sm text-muted-foreground">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <div className="flex gap-4 text-sm">
        <Link href="/" className="text-enlace underline-offset-4 hover:underline">
          Ir al inicio
        </Link>
        <Link href="/app" className="text-enlace underline-offset-4 hover:underline">
          Ir a la app
        </Link>
      </div>
    </main>
  )
}
