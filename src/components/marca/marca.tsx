import { cn } from "@/lib/utils"
import {
  ISOTIPO_VIEWBOX,
  TRAZO_CHISPA,
  TRAZO_WORDMARK,
  TRAZO_YUNQUE,
  WORDMARK_VIEWBOX,
} from "./trazos"

/**
 * Piezas de identidad de Yunque como componentes (heredan `currentColor`).
 * Positivo (fondo claro): chispa azul temple. Negativo (fondo oscuro): chispa ámbar.
 * Con `tono="auto"` se resuelve por tema (`.dark`).
 */
type Tono = "auto" | "positivo" | "negativo"

function claseChispa(tono: Tono) {
  if (tono === "positivo") return "fill-temple"
  if (tono === "negativo") return "fill-chispa"
  return "fill-temple dark:fill-chispa"
}

export function Isotipo({
  className,
  tono = "auto",
  titulo = "Yunque",
}: {
  className?: string
  tono?: Tono
  titulo?: string | null
}) {
  return (
    <svg
      viewBox={ISOTIPO_VIEWBOX}
      className={cn("h-6 w-auto", className)}
      role={titulo ? "img" : undefined}
      aria-label={titulo ?? undefined}
      aria-hidden={titulo ? undefined : true}
    >
      <path d={TRAZO_YUNQUE} className="fill-current" />
      <path d={TRAZO_CHISPA} className={claseChispa(tono)} />
    </svg>
  )
}

export function Wordmark({ className, titulo = "yunque" }: { className?: string; titulo?: string | null }) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      className={cn("h-6 w-auto", className)}
      role={titulo ? "img" : undefined}
      aria-label={titulo ?? undefined}
      aria-hidden={titulo ? undefined : true}
    >
      <path d={TRAZO_WORDMARK} className="fill-current" />
    </svg>
  )
}

/** Isotipo + wordmark, mismas proporciones que yunque-logo.svg (799 × 143,34). */
export function Logo({ className, tono = "auto" }: { className?: string; tono?: Tono }) {
  return (
    <svg viewBox="0 0 799 143.34" className={cn("h-7 w-auto", className)} role="img" aria-label="yunque">
      <g transform="scale(1.18)">
        <path d={TRAZO_YUNQUE} className="fill-current" />
        <path d={TRAZO_CHISPA} className={claseChispa(tono)} />
      </g>
      <g transform="translate(148 1.48)">
        <path d={TRAZO_WORDMARK} className="fill-current" />
      </g>
    </svg>
  )
}

/** La chispa sola: estrella de 4 puntas. Recompensa visual, nunca decoración permanente. */
export function Chispa({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <svg
      viewBox="61 0 22 22"
      className={cn("size-4 fill-chispa", className)}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <path d={TRAZO_CHISPA} />
    </svg>
  )
}
