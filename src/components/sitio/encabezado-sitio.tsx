import Link from "next/link"
import { Menu } from "lucide-react"
import { Logo } from "@/components/marca/marca"

const ENLACES = [
  ["#problema", "El problema"],
  ["#nunca-se-cae", "Nunca se cae"],
  ["#forja", "Forja"],
  ["#modulos", "Módulos"],
  ["#precios", "Precios"],
  ["#socios", "Socios fundadores"],
  ["#preguntas", "Preguntas"],
] as const

/** Encabezado del sitio sin JavaScript: el menú del celular usa <details>. */
export function EncabezadoSitio() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-hierro/90">
      <a href="#contenido-sitio" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded focus:bg-[var(--temple-accion)] focus:px-3 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" prefetch={false} aria-label="Yunque, inicio" className="text-niebla">
          <Logo className="h-7" tono="negativo" />
        </Link>
        <nav className="hidden flex-1 items-center gap-5 text-sm text-acero lg:flex" aria-label="Secciones">
          {ENLACES.map(([href, n]) => (
            <a key={href} href={href} className="transition-colors hover:text-niebla">
              {n}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href="/ingresar" className="hidden h-9 items-center rounded-lg px-3 text-sm text-acero hover:text-niebla sm:inline-flex">
            Ingresar
          </a>
          <a href="#pedir-demo" className="inline-flex h-9 items-center rounded-lg bg-[var(--temple-accion)] px-4 text-sm font-semibold text-white hover:bg-[#2c5ae0]">
            Pedir una demo
          </a>
          <details className="group relative lg:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg text-niebla [&::-webkit-details-marker]:hidden" aria-label="Menú">
              <Menu className="size-5" />
            </summary>
            <nav className="absolute right-0 top-11 w-56 rounded-xl border border-white/10 bg-superficie p-2 shadow-xl" aria-label="Secciones (menú)">
              {ENLACES.map(([href, n]) => (
                <a key={href} href={href} className="block rounded-md px-3 py-2.5 text-sm text-niebla hover:bg-white/5">
                  {n}
                </a>
              ))}
              <a href="/ingresar" className="block rounded-md px-3 py-2.5 text-sm text-acero hover:bg-white/5">
                Ingresar a la demo
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}
