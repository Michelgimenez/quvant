import { ArrowRight } from "lucide-react"
import { Firma } from "@/components/marca/quvant"
import { Grilla } from "@/components/marca/grilla"
import { SITIO } from "@/config/sitio"
import { EscalaPerezosa } from "./interactivos"
import { BotonSitio } from "./secciones"

/**
 * El hero: la firma de Quvant con la bajada de la marca, el titular de src/config/sitio.ts y, debajo, la escala
 * (un control de kiosco a empresa que transforma en vivo una vista del tablero, con el salto del punto).
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-28 sm:pt-32" aria-labelledby="titulo-hero">
      <Grilla />
      <div className="relative mx-auto max-w-6xl px-4">
        <Firma alto={40} version="principal" bajada />
        <div className="mt-14 grid items-end gap-x-12 gap-y-8 lg:grid-cols-[1.25fr_1fr]">
          <h1 id="titulo-hero" className="t-hero text-blanco">
            {SITIO.titular}
          </h1>
          <div className="space-y-6">
            <p className="t-texto text-acero">{SITIO.bajadaTitular}</p>
            <div className="flex flex-wrap items-center gap-3">
              <BotonSitio href="/demo">
                Probar la demo <ArrowRight className="size-4" />
              </BotonSitio>
              <BotonSitio href="#pedir-demo" variante="borde">
                Pedir una demo
              </BotonSitio>
            </div>
          </div>
        </div>
        <p className="t-etiqueta mt-8 inline-flex items-center gap-2 text-acero">
          <span className="size-[7px] bg-alerta" aria-hidden />
          {SITIO.estado}
        </p>
        <div className="mt-16">
          <EscalaPerezosa />
        </div>
      </div>
    </section>
  )
}
