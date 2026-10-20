import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ConQuvant } from "@/components/marca/con-quvant"
import { Firma, Isotipo } from "@/components/marca/quvant"
import { Grilla } from "@/components/marca/grilla"
import { EstadoFeatureBadge, Ficha, Sello, TextoConfig } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { SITIO } from "@/config/sitio"
import { DemoAnimaciones } from "./demo-animaciones"

export const metadata: Metadata = {
  title: "Marca",
  description: "La identidad de Quvant aplicada a la web y a la app: logo, color, tipografía y componentes base.",
  robots: { index: false },
}

const PALETA = [
  { token: "--negro", hex: "#0D0D0F", uso: "Fondo principal", clase: "bg-negro border border-gris-3" },
  { token: "--blanco", hex: "#ECECEE", uso: "Logo, títulos y textos sobre negro", clase: "bg-blanco" },
  { token: "--acero", hex: "#9C9CA3", uso: "Secundarios y bajadas, sobre negro", clase: "bg-acero" },
  { token: "--profundo", hex: "#26262B", uso: "Apoyo, bordes y grilla", clase: "bg-profundo" },
]

const ESTADOS = [
  { token: "--ok", uso: "Correcto, sincronizado", clase: "bg-ok" },
  { token: "--alerta", uso: "Pendiente, sin conexión", clase: "bg-alerta" },
  { token: "--error", uso: "Error, sin stock", clase: "bg-error" },
  { token: "--info", uso: "Aviso informativo", clase: "bg-info" },
]

export default function PaginaMarca() {
  return (
    <main className="min-h-dvh bg-background">
      <section className="dark relative overflow-hidden border-b border-gris-3 bg-negro text-blanco">
        <Grilla />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-8">
          <Firma alto={56} version="principal" bajada />
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/marca/sistema">
                La lámina del sistema aplicado <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/marca/sistema/titulares">Los titulares</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-8">
        <section className="space-y-4">
          <h2 className="t-etiqueta text-muted-foreground">La firma · manual, págs. 5 a 7</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="dark flex h-40 items-center justify-center border border-gris-3 bg-negro">
              <Firma alto={40} version="principal" />
            </div>
            <div className="flex h-40 items-center justify-center border border-gris-11 bg-blanco">
              <Firma alto={40} version="negativa" />
            </div>
            <div className="flex h-40 items-center justify-center gap-6 border border-border bg-card">
              <Isotipo lado={56} />
              <Isotipo lado={32} />
              <Isotipo lado={16} />
            </div>
          </div>
          <p className="t-texto-sm text-muted-foreground">
            Principal sobre negro, negativa sobre claro. Nunca rotar, estirar ni pegar el punto a la cola. El logotipo QUVANT es provisorio hasta tener el archivo oficial.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="t-etiqueta text-muted-foreground">Funciona con Quvant · para las webs de los clientes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-wrap items-center gap-3 border border-gris-11 bg-blanco p-6">
              <ConQuvant tema="claro" tamano="sm" />
              <ConQuvant tema="claro" />
              <ConQuvant tema="claro" tamano="lg" />
            </div>
            <div className="dark flex flex-wrap items-center gap-3 border border-gris-3 bg-negro p-6">
              <ConQuvant tema="oscuro" tamano="sm" />
              <ConQuvant tema="oscuro" />
              <ConQuvant tema="oscuro" tamano="lg" />
            </div>
          </div>
          <p className="t-dato text-muted-foreground">Versiones estáticas: /marca/con-quvant-claro.svg y /marca/con-quvant-oscuro.svg</p>
        </section>

        <section className="space-y-4">
          <h2 className="t-etiqueta text-muted-foreground">Color · manual, pág. 8</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {PALETA.map((c) => (
              <div key={c.token} className="space-y-2">
                <div className={`h-24 ${c.clase}`} />
                <p className="t-dato">
                  {c.token} · {c.hex}
                </p>
                <p className="t-texto-sm text-muted-foreground">{c.uso}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {ESTADOS.map((e) => (
              <p key={e.token} className="t-dato flex items-center gap-2">
                <span className={`size-2 ${e.clase}`} aria-hidden />
                {e.token} · <span className="text-muted-foreground">{e.uso}</span>
              </p>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="t-etiqueta text-muted-foreground">Tipografía · Michroma e IBM Plex Mono</h2>
          <div className="space-y-3 border border-border bg-card p-6">
            <p className="t-marca">Forja</p>
            <p className="t-hero">{SITIO.titular}</p>
            <p className="t-titulo">Cerrar la caja</p>
            <p className="t-texto max-w-2xl text-muted-foreground">{SITIO.descripcion}</p>
            <p className="t-numero-lg">$ 1.284.350</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="t-etiqueta text-muted-foreground">Componentes base</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Cerrar caja</Button>
            <Button variant="outline">Ver movimientos</Button>
            <Button variant="ghost">Cancelar</Button>
            <Sello />
            <Sello texto="PROPUESTA" />
            <EstadoFeatureBadge estado="disponible" />
            <EstadoFeatureBadge estado="demo" />
            <EstadoFeatureBadge estado="próximamente" />
            <Ficha>Venta #10482 · Mostrador 2</Ficha>
            <Kbd>⌘K</Kbd>
          </div>
          <p className="t-texto-sm text-muted-foreground">
            Donde falta un dato real: <TextoConfig texto="[COMPLETAR: dato con fuente]" />
          </p>
        </section>

        <DemoAnimaciones />
      </div>
    </main>
  )
}
