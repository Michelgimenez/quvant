import Link from "next/link"
import { Logo } from "@/components/marca/marca"

// Página provisoria: el sitio del producto se construye en la fase 5.
export default function Inicio() {
  return (
    <main className="grilla-tecnica flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo className="h-14" tono="negativo" />
      <p className="font-display text-2xl font-semibold">Firme, aunque todo se mueva.</p>
      <Link href="/marca" className="text-enlace underline underline-offset-4">
        Sistema de marca
      </Link>
    </main>
  )
}
