import type { Metadata } from "next"
import { Chispa } from "@/components/marca/marca"
import { TextoConfig } from "@/components/base/sellos"
import { EncabezadoSitio } from "@/components/sitio/encabezado-sitio"
import { FormularioDemo } from "@/components/sitio/formulario-demo"
import { Hero } from "@/components/sitio/hero"
import { DemoConexionPerezosa, PreciosAlDiaPerezoso } from "@/components/sitio/interactivos"
import { Encabezado, EstadoProducto, Modulos, ParaQuien, PieSitio, Precios, Preguntas, Problema, Seguridad } from "@/components/sitio/secciones"
import { PRECIOS } from "@/config/precios"
import { SITIO } from "@/config/sitio"

export const metadata: Metadata = {
  title: { absolute: `Yunque · ${SITIO.tagline}` },
  description: SITIO.descripcion,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Yunque",
    title: `Yunque · ${SITIO.tagline}`,
    description: SITIO.descripcion,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: `Yunque · ${SITIO.tagline}`, description: SITIO.descripcion },
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITIO.url}/#organizacion`,
      name: "Yunque",
      url: SITIO.url,
      logo: `${SITIO.url}/marca/yunque-app-icon-1024.png`,
      slogan: SITIO.tagline,
      address: { "@type": "PostalAddress", addressLocality: "Buenos Aires", addressCountry: "AR" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Yunque",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS, Windows, macOS",
      description: SITIO.descripcion,
      inLanguage: "es-AR",
      publisher: { "@id": `${SITIO.url}/#organizacion` },
      offers: {
        "@type": "Offer",
        price: String(PRECIOS.desdePorNegocio),
        priceCurrency: "USD",
        description: "Desde, por mes por negocio. Implementación cotizada aparte.",
      },
    },
  ],
}

export default function Inicio() {
  return (
    <div className="dark min-h-dvh bg-hierro text-niebla">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
      <EncabezadoSitio />
      <main id="contenido-sitio">
        <Hero />
        <Problema />

        <section id="nunca-se-cae" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-20" aria-labelledby="titulo-nunca">
          <Encabezado
            id="titulo-nunca"
            ficha="02 · Nunca se cae"
            titulo="Se corta internet. El mostrador sigue vendiendo."
            bajada="Probalo acá: vendé algo, cortá la conexión con el interruptor, seguí vendiendo y volvé a conectar. La cola se sincroniza sola. Es el mismo motor que usa la app."
          />
          <DemoConexionPerezosa />
        </section>

        <Modulos />

        <section id="precios-al-dia" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-20" aria-labelledby="titulo-precios-dia">
          <Encabezado
            id="titulo-precios-dia"
            ficha="04 · Precios al día"
            titulo="Llega la lista del proveedor. La cargás en minutos."
            bajada="Elegí una marca y un porcentaje: antes de aplicar ves cuántos productos cambian, el aumento real después del redondeo, qué márgenes quedan bajos y cuánto sube tu stock valorizado."
          />
          <PreciosAlDiaPerezoso />
        </section>

        <ParaQuien />
        <Seguridad />
        <Precios />

        <section id="socios" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-20" aria-labelledby="titulo-socios">
          <div className="grid gap-10 rounded-3xl border border-chispa/30 bg-gradient-to-br from-superficie to-hierro p-6 sm:p-10 lg:grid-cols-2">
            <div className="space-y-5">
              <p className="ficha flex items-center gap-2 text-chispa">
                <Chispa className="size-3" /> 08 · Programa de socios fundadores
              </p>
              <h2 id="titulo-socios" className="text-balance text-3xl font-extrabold sm:text-4xl">
                Los primeros negocios construyen Yunque con nosotros.
              </h2>
              <p className="text-acero">
                {PRECIOS.sociosFundadores.cupos} cupos · <span className="text-niebla">{PRECIOS.sociosFundadores.estado}</span>
              </p>
              <ul className="space-y-2">
                {PRECIOS.sociosFundadores.condiciones.map((c) => (
                  <li key={c} className="flex gap-2 text-niebla">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-chispa" aria-hidden /> {c}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-acero">A cambio: {PRECIOS.sociosFundadores.aCambio}</p>
            </div>
            <div>
              <h3 className="mb-4 text-lg font-semibold">Quiero ser socio fundador</h3>
              <FormularioDemo origen="socios" boton="Postularme" />
            </div>
          </div>
        </section>

        <EstadoProducto />
        <Preguntas />

        <section id="pedir-demo" className="diferida mx-auto max-w-3xl scroll-mt-24 px-4 py-20" aria-labelledby="titulo-pedir">
          <Encabezado id="titulo-pedir" ficha="10 · Pedir una demo" titulo="Te mostramos Yunque con tus productos." bajada="Media hora, por videollamada o en tu negocio. Sin compromiso." centrado />
          <div className="rounded-2xl border border-white/10 bg-superficie/70 p-6 sm:p-8">
            <FormularioDemo origen="sitio" />
          </div>
          <p className="mt-4 text-center text-sm text-acero">
            ¿Preferís escribirnos? <TextoConfig texto={SITIO.contacto.whatsapp} />
          </p>
        </section>
      </main>
      <PieSitio />
    </div>
  )
}
