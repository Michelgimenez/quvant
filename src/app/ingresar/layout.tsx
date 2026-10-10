import type { Metadata } from "next"
import Link from "next/link"
import { LogoOrg } from "@/components/base/logo-org"
import { Sello } from "@/components/base/sellos"
import { ConYunqueDiscreto } from "@/components/marca/con-yunque-discreto"
import { COLOR_DEMO } from "@/datos/demo/catalogo"
import { ES_DEMO } from "@/lib/modo"
import { UsuariosDemo } from "./usuarios-demo"

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false },
}

const ORG_DEMO = {
  nombre: "Ferretería Industrial Demo",
  logo: "/demo/ferreteria-industrial-demo-claro.svg",
  logoNegativo: "/demo/ferreteria-industrial-demo-oscuro.svg",
  colorAcento: COLOR_DEMO,
}

export default function LayoutIngreso({ children }: LayoutProps<"/ingresar">) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_460px]">
      <section className="grilla-tecnica flex min-h-dvh flex-col justify-between gap-10 px-4 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center gap-3">
          <LogoOrg org={ORG_DEMO} alto="h-10" />
          {ES_DEMO && <Sello />}
        </header>
        <div className="mx-auto w-full max-w-sm">{children}</div>
        <footer className="flex flex-wrap items-center justify-between gap-3">
          <ConYunqueDiscreto />
          <Link href="/estado" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Estado del sistema
          </Link>
        </footer>
      </section>
      {ES_DEMO && (
        <aside className="border-t border-linea bg-superficie-2 px-4 py-8 sm:px-10 lg:border-l lg:border-t-0">
          <UsuariosDemo />
        </aside>
      )}
    </main>
  )
}
