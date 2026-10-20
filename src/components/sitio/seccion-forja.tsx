import Link from "next/link"
import { ArrowRight, Map, PlayCircle, Warehouse } from "lucide-react"
import { EstadoFeatureBadge } from "@/components/base/sellos"
import { textoPrecioExtension } from "@/config/precios"
import { MarcaForja } from "@/forja/ui/marca-forja"
import { feature } from "@/showcase/features"
import { Encabezado } from "./secciones"
import { VideoForja } from "./video-forja"

const PUNTOS = [
  { icono: Map, titulo: "Ver toda la red", texto: "Cada sucursal en el mapa con el calor de sus ventas, el stock crítico y las transferencias viajando entre ellas." },
  { icono: Warehouse, titulo: "Entrar a cada sucursal", texto: "El mostrador, el depósito rack por rack, los bancos de servicio técnico y el muelle, con los datos de Quvant." },
  { icono: PlayCircle, titulo: "Reproducir el día", texto: "La jornada completa en 30 segundos, para ver cómo fue el día de un vistazo." },
]

/** Forja (oculta hasta la tanda 10): la extensión visual, con la toma genérica (empresa de demostración). */
export function SeccionForja() {
  const f = feature("forja")
  return (
    <section id="forja" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-20" aria-labelledby="titulo-forja">
      <Encabezado
        id="titulo-forja"
        ficha="Extensión · Forja, by Quvant"
        titulo="Todo el negocio, en vivo."
        bajada="Forja convierte los datos de Quvant en un taller que se ve: la red de sucursales, cada una por dentro y el día entero en un recorrido."
      />
      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-center">
        <figure className="space-y-2">
          <VideoForja etiqueta="Recorrido de Forja con la empresa de demostración" />
          <figcaption className="text-xs text-acero">Empresa de demostración con datos simulados.</figcaption>
        </figure>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <MarcaForja tamano={26} />
            <EstadoFeatureBadge estado={f.estado} />
          </div>
          <ul className="space-y-4">
            {PUNTOS.map((p) => (
              <li key={p.titulo} className="flex gap-3">
                <p.icono className="mt-0.5 size-5 shrink-0 text-brasa" aria-hidden />
                <div>
                  <p className="font-semibold text-blanco">{p.titulo}</p>
                  <p className="text-sm text-acero">{p.texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-5">
            <Link href="/forja" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90" data-testid="ver-demo-forja">
              Ver la demo <ArrowRight className="size-4" aria-hidden />
            </Link>
            <p className="text-sm text-acero">
              Extensión de Quvant · <span className="font-semibold text-blanco">{textoPrecioExtension("forja")}</span>
            </p>
          </div>
          {f.nota && <p className="text-xs text-acero">{f.nota}</p>}
        </div>
      </div>
    </section>
  )
}
