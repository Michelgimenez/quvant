import type { Metadata } from "next"
import { TextoConfig } from "@/components/base/sellos"
import { EncabezadoSitio } from "@/components/sitio/encabezado-sitio"
import { FormularioDemo } from "@/components/sitio/formulario-demo"
import { Hero } from "@/components/sitio/hero"
import { SeccionForja } from "@/components/sitio/seccion-forja"
import { DemoConexionPerezosa, PreciosAlDiaPerezoso } from "@/components/sitio/interactivos"
import { CuatroNegocios, DesarrolloAMedida, Encabezado, EstadoProducto, Modulos, PieSitio, Planes, Preguntas, Problema, Seguridad } from "@/components/sitio/secciones"
import { PRECIOS } from "@/config/precios"
import { SITIO } from "@/config/sitio"

export const metadata: Metadata = {
  title: { absolute: `Quvant · ${SITIO.tagline}` },
  description: SITIO.descripcion,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Quvant",
    title: `Quvant · ${SITIO.titular}`,
    description: SITIO.descripcion,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: `Quvant · ${SITIO.titular}`, description: SITIO.descripcion },
}

// Sin precio en los datos estructurados mientras los planes digan "Consultá" (nada de números inventados).
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITIO.url}/#organizacion`,
      name: "Quvant",
      url: SITIO.url,
      logo: `${SITIO.url}/marca/quvant-icono-1024.png`,
      slogan: SITIO.tagline,
      address: { "@type": "PostalAddress", addressLocality: "Buenos Aires", addressCountry: "AR" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Quvant",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS, Windows, macOS",
      description: SITIO.descripcion,
      inLanguage: "es-AR",
      publisher: { "@id": `${SITIO.url}/#organizacion` },
    },
  ],
}

export default function Inicio() {
  return (
    <div className="dark min-h-dvh bg-negro text-blanco">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
      <EncabezadoSitio />
      <main id="contenido-sitio">
        <Hero />
        <Problema />

        <section id="nunca-se-cae" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-nunca">
          <Encabezado
            id="titulo-nunca"
            ficha="02 · Nunca se cae"
            titulo="Se corta internet. El mostrador sigue vendiendo."
            bajada="Probalo acá: vendé algo, cortá la conexión con el interruptor, seguí vendiendo y volvé a conectar. La cola se sincroniza sola. Es el mismo motor que usa la app."
          />
          <DemoConexionPerezosa />
        </section>

        <CuatroNegocios />
        <Modulos />

        <section id="precios-al-dia" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-precios-dia">
          <Encabezado
            id="titulo-precios-dia"
            ficha="05 · Precios al día"
            titulo="Llega la lista del proveedor. La cargás en minutos."
            bajada="Elegí una marca y un porcentaje: antes de aplicar ves cuántos productos cambian, el aumento real después del redondeo, qué márgenes quedan bajos y cuánto sube tu stock valorizado."
          />
          <PreciosAlDiaPerezoso />
        </section>

        <SeccionForja />

        <Seguridad />
        <Planes />
        <DesarrolloAMedida />

        <section id="socios" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-socios">
          <div className="grid gap-12 rounded-lg border border-gris-3 p-6 sm:p-10 lg:grid-cols-2">
            <div className="space-y-6">
              <Encabezado id="titulo-socios" ficha="09 · Socios fundadores" titulo="Los primeros negocios construyen Quvant con nosotros." bajada={`Programa ${PRECIOS.sociosFundadores.estado.toLowerCase()}. Condiciones especiales para quienes empiezan primero.`} />
              <ul className="lista-punto t-texto -mt-6 space-y-2.5 text-blanco">
                {PRECIOS.sociosFundadores.condiciones.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="t-texto-sm text-acero">A cambio: {PRECIOS.sociosFundadores.aCambio.charAt(0).toLowerCase() + PRECIOS.sociosFundadores.aCambio.slice(1)}</p>
            </div>
            <div>
              <h3 className="t-titulo-sm mb-5 text-blanco">Quiero ser socio fundador</h3>
              <FormularioDemo origen="socios" boton="Postularme" />
            </div>
          </div>
        </section>

        <EstadoProducto />
        <Preguntas />

        <section id="pedir-demo" className="diferida mx-auto max-w-3xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-pedir">
          <Encabezado id="titulo-pedir" ficha="11 · Pedir una demo" titulo="Te mostramos Quvant con tus productos." bajada="Media hora, por videollamada o en tu negocio. Sin compromiso." centrado />
          <div className="rounded-lg border border-gris-3 bg-superficie-1 p-6 sm:p-8">
            <FormularioDemo origen="sitio" />
          </div>
          <p className="t-texto-sm mt-4 text-center text-acero">
            ¿Preferís escribirnos? <TextoConfig texto={SITIO.contacto.whatsapp} />
          </p>
        </section>
      </main>
      <PieSitio />
    </div>
  )
}
