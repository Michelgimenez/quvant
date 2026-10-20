import { getImageProps } from "next/image"
import { EMPRESAS, EMPRESAS_ORDEN } from "@/demo/empresas"
import { cn } from "@/lib/utils"

const PARADAS = { kiosco: "Kiosco", ferreteria: "Comercio", distribuidora: "Distribuidora", grupo: "Empresa" } as const

/**
 * La escala quieta: lo que se ve mientras carga la escala viva (y sin JavaScript). Mismo armado y mismas medidas,
 * con la captura del tablero del kiosco (scripts/marca/capturar-sitio.mts, 1440 × 852), así no se mueve nada al cargar.
 */
export function EscalaQuieta() {
  const { props } = getImageProps({
    src: "/capturas/sitio/tablero-kiosco.png",
    alt: "El tablero de Kiosco La Esquina, una empresa ficticia de la demo",
    width: 1440,
    height: 852,
    sizes: "(min-width: 1152px) 1120px, 100vw",
    priority: true,
  })
  return (
    <div className="space-y-5" aria-busy>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="t-etiqueta text-acero">La escala · el mismo Quvant en cuatro negocios</p>
      </div>
      <div className="relative grid grid-cols-4" aria-hidden>
        <span className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[7px] h-px bg-gris-4" />
        {EMPRESAS_ORDEN.map((id, i) => (
          <span key={id} className="relative flex flex-col items-center gap-3 pb-1">
            <span className="relative flex size-[15px] items-center justify-center">
              <span className="block size-[6px] bg-gris-6" />
              {i === 0 && <span className="absolute block size-[11px] bg-blanco" />}
            </span>
            <span className={cn("t-etiqueta", i === 0 ? "text-blanco" : "text-acero")}>{PARADAS[id]}</span>
            <span className={cn("t-dato hidden sm:block", i === 0 ? "text-acero" : "text-gris-6")}>{EMPRESAS[id].escalaTexto}</span>
          </span>
        ))}
      </div>
      <div className="relative w-full overflow-hidden rounded-lg border border-gris-3 bg-background" style={{ aspectRatio: "1440 / 852" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- img nativo con props de next/image (alt incluido) */}
        <img {...props} className="block h-full w-full" />
      </div>
      <p className="t-texto-sm text-acero">
        <span className="text-blanco">{EMPRESAS.kiosco.nombre}</span> · {EMPRESAS.kiosco.tamano}. Empresa ficticia, datos de demostración.
      </p>
    </div>
  )
}
