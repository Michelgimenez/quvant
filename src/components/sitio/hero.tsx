import { ArrowRight } from "lucide-react"
import { Firma } from "@/components/marca/quvant"
import { Grilla } from "@/components/marca/grilla"
import { SITIO } from "@/config/sitio"

/**
 * Héroe del sitio (interino de la tanda 2: la tanda 7 lo rehace con la escala de kiosco a empresa).
 * La firma de Quvant con la bajada, el titular de src/config/sitio.ts y los dos llamados.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-36" aria-labelledby="titulo-hero">
      <Grilla />
      <div className="relative mx-auto flex max-w-5xl flex-col items-start px-4">
        <Firma alto={40} version="principal" bajada className="aparecer" />
        <h1 id="titulo-hero" className="t-hero aparecer mt-12 text-blanco" style={{ animationDelay: "0.15s" }}>
          {SITIO.titular}
        </h1>
        <p className="t-texto aparecer mt-5 max-w-2xl text-acero" style={{ animationDelay: "0.3s" }}>
          {SITIO.descripcion}
        </p>
        <div className="aparecer mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.45s" }}>
          <a href="/demo" className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            Probar la demo <ArrowRight className="size-4" />
          </a>
          <a href="#pedir-demo" className="inline-flex h-12 items-center gap-2 rounded-lg border border-gris-4 px-5 text-blanco transition-colors hover:border-gris-7">
            Pedir una demo
          </a>
        </div>
        <p className="t-etiqueta aparecer mt-8 inline-flex items-center gap-2 text-acero" style={{ animationDelay: "0.6s" }}>
          <span className="size-[7px] bg-alerta" aria-hidden />
          {SITIO.estado}
        </p>
      </div>
    </section>
  )
}
