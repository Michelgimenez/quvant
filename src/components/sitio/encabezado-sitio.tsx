import Link from "next/link"
import { Menu } from "lucide-react"
import { Firma } from "@/components/marca/quvant"

const ENLACES = [
  ["#cuatro-negocios", "Negocios"],
  ["#modulos", "Módulos"],
  ["#planes", "Planes"],
  ["#a-medida", "A medida"],
  ["#preguntas", "Preguntas"],
] as const

/** Encabezado del sitio sin JavaScript: el menú del celular usa <details>. */
export function EncabezadoSitio() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-gris-3 bg-negro/95">
      <a href="#contenido-sitio" className="t-texto-sm sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:bg-blanco focus:px-3 focus:py-2 focus:text-negro">
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
        <Link href="/" prefetch={false} aria-label="Quvant, inicio" className="shrink-0 text-blanco">
          <Firma alto={26} version="principal" />
        </Link>
        <nav className="hidden flex-1 items-center gap-6 lg:flex" aria-label="Secciones">
          {ENLACES.map(([href, n]) => (
            <a key={href} href={href} className="t-texto-sm whitespace-nowrap text-acero transition-colors hover:text-blanco">
              {n}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/demo" prefetch={false} className="t-texto-sm hidden h-9 items-center whitespace-nowrap px-3 text-acero transition-colors hover:text-blanco sm:inline-flex">
            Probar la demo
          </Link>
          <a href="#pedir-demo" className="t-texto-sm inline-flex h-9 items-center whitespace-nowrap rounded-md bg-blanco px-4 font-semibold text-negro transition-colors hover:bg-gris-11">
            Pedir una demo
          </a>
          <details className="group relative lg:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center text-blanco [&::-webkit-details-marker]:hidden" aria-label="Menú">
              <Menu className="size-5" />
            </summary>
            <nav className="absolute right-0 top-11 w-56 rounded-lg border border-gris-3 bg-superficie-1 p-2" aria-label="Secciones (menú)">
              {ENLACES.map(([href, n]) => (
                <a key={href} href={href} className="t-texto-sm block px-3 py-2.5 text-blanco hover:bg-superficie-2">
                  {n}
                </a>
              ))}
              <Link href="/demo" prefetch={false} className="t-texto-sm block px-3 py-2.5 text-acero hover:bg-superficie-2">
                Probar la demo
              </Link>
              <a href="/ingresar" className="t-texto-sm block px-3 py-2.5 text-acero hover:bg-superficie-2">
                Ingresar
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}
