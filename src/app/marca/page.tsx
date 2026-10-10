import type { Metadata } from "next"
import { ConYunque } from "@/components/marca/con-yunque"
import { Chispa, Isotipo, Logo, Wordmark } from "@/components/marca/marca"
import { EstadoFeatureBadge, Ficha, Sello, TextoConfig } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { DemoAnimaciones } from "./demo-animaciones"

export const metadata: Metadata = {
  title: "Sistema de marca",
  description: "Identidad, tokens y componentes base de Yunque.",
  robots: { index: false },
}

const PALETA = [
  { token: "--hierro", hex: "#0E1116", uso: "Fondo principal" },
  { token: "--forja", hex: "#1A1F27", uso: "Superficies" },
  { token: "--acero", hex: "#9AA3AE", uso: "Texto secundario" },
  { token: "--niebla", hex: "#EEF1F4", uso: "Texto sobre oscuro" },
  { token: "--temple", hex: "#3B6EF5", uso: "Acción, enlaces, foco" },
  { token: "--chispa", hex: "#FFB224", uso: "Destacados y logros" },
  { token: "--ok", hex: "#2FB36E", uso: "Correcto, sincronizado" },
  { token: "--error", hex: "#E5484D", uso: "Errores, sin stock" },
]

export default function PaginaMarca() {
  return (
    <main className="grilla-tecnica min-h-dvh">
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-8">
        <header className="flex items-center justify-between border-b border-linea pb-4">
          <Ficha>Yunque — identidad de producto</Ficha>
          <Ficha>v1 · 2026</Ficha>
        </header>

        <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="flex min-h-72 flex-col items-center justify-center gap-8 rounded-xl bg-forja p-10 text-niebla">
            <Logo className="h-16 sm:h-20" tono="negativo" />
            <p className="font-display text-2xl font-semibold">Firme, aunque todo se mueva.</p>
          </div>
          <div className="grid gap-4">
            <div className="flex items-center justify-center rounded-xl bg-niebla p-8 text-hierro">
              <Logo className="h-10" tono="positivo" />
            </div>
            <div className="flex items-center gap-6 rounded-xl bg-forja p-6 text-niebla">
              <Isotipo className="h-12" tono="negativo" />
              <Wordmark className="h-8" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold">Paleta</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {PALETA.map((c) => (
              <div key={c.token} className="space-y-2">
                <div className="h-20 rounded-lg border border-linea" style={{ background: c.hex }} />
                <div className="text-sm font-semibold">{c.token}</div>
                <Ficha as="div">{c.hex}</Ficha>
                <div className="text-xs text-muted-foreground">{c.uso}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-extrabold">Tipografía</h2>
          <p className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">Tu negocio, en un solo lugar.</p>
          <p className="max-w-2xl text-muted-foreground">
            Titulares en Inter Display (eje óptico 32). Texto en Inter. Datos, códigos y montos en JetBrains Mono.
          </p>
          <p className="num text-lg">VENTA #10482 · MOSTRADOR 2 · $ 1.284.500</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold">Componentes base</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">Nueva venta</Button>
            <Button size="lg" variant="outline">
              Ver stock <Kbd>⌘K</Kbd>
            </Button>
            <Sello />
            <Sello texto="PROPUESTA" />
            <EstadoFeatureBadge estado="disponible" />
            <EstadoFeatureBadge estado="demo" />
            <EstadoFeatureBadge estado="próximamente" />
            <Chispa className="size-5" titulo="Chispa" />
          </div>
          <p>
            <TextoConfig texto="Contacto: [COMPLETAR: email de contacto]" />
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold">Sello “funciona con yunque”</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-8">
              <ConYunque tema="claro" tamano="sm" />
              <ConYunque tema="claro" />
              <ConYunque tema="claro" tamano="lg" />
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#15171a] p-8">
              <ConYunque tema="oscuro" tamano="sm" />
              <ConYunque tema="oscuro" />
              <ConYunque tema="oscuro" tamano="lg" />
            </div>
          </div>
        </section>

        <DemoAnimaciones />
      </div>
    </main>
  )
}
