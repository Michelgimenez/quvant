import { ArrowRight, Map, PlayCircle, Warehouse } from "lucide-react"
import { EstadoFeatureBadge } from "@/components/base/sellos"
import { FORJA } from "@/config/forja"
import { textoPrecioExtension } from "@/config/precios"
import { MarcaForja } from "@/forja/ui/marca-forja"
import { feature } from "@/showcase/features"
import { BotonSitio, Encabezado } from "./secciones"
import { VideoForja } from "./video-forja"

const PUNTOS = [
  { icono: Map, titulo: "Ver toda la red", texto: "Cada sucursal en el mapa con la actividad de la última hora, el stock crítico y las transferencias viajando entre ellas." },
  { icono: Warehouse, titulo: "Entrar a cada local", texto: "Por dentro, según el rubro: el mostrador y las góndolas de un kiosco, el depósito y el taller de un comercio, los andenes de una distribuidora." },
  { icono: PlayCircle, titulo: "Reproducir el día", texto: "La jornada completa en 30 segundos, para ver cómo fue el día de un vistazo." },
]

/** Forja: la extensión visual, con la toma genérica (empresa de demostración). */
export function SeccionForja() {
  const f = feature("forja")
  return (
    <section id="forja" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-forja">
      <Encabezado
        id="titulo-forja"
        ficha="Extensión · Forja, by Quvant"
        titulo={FORJA.frase}
        bajada="Forja convierte los datos de Quvant en un lugar que se recorre: la red de sucursales en el mapa, cada local por dentro y el día entero en un recorrido."
      />
      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-center">
        <figure className="space-y-2">
          <VideoForja etiqueta="Recorrido de Forja con la empresa de demostración" />
          <figcaption className="t-texto-sm text-acero">Empresa de demostración con datos simulados.</figcaption>
        </figure>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <MarcaForja tamano={26} />
            <EstadoFeatureBadge estado={f.estado} />
          </div>
          <ul className="space-y-4">
            {PUNTOS.map((p) => (
              <li key={p.titulo} className="flex gap-3">
                <p.icono className="mt-0.5 size-5 shrink-0 text-blanco" aria-hidden />
                <div>
                  <p className="t-titulo-sm text-blanco">{p.titulo}</p>
                  <p className="t-texto-sm text-acero">{p.texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4 border-t border-gris-3 pt-5">
            <BotonSitio href="/forja" className="h-11" testid="ver-demo-forja">
              Ver la demo <ArrowRight className="size-4" aria-hidden />
            </BotonSitio>
            <p className="t-texto-sm text-acero">
              Extensión de Quvant · <span className="font-semibold text-blanco">{textoPrecioExtension("forja")}</span>
            </p>
          </div>
          {f.nota && <p className="t-texto-sm text-gris-8">{f.nota}</p>}
        </div>
      </div>
    </section>
  )
}
