import { cn } from "@/lib/utils"
import { ES_COMPLETAR } from "@/config/sitio"
import { ETIQUETA_ESTADO, type EstadoFeature } from "@/showcase/features"

/** Sello visible para datos ficticios (DEMO) o propuestas comerciales (PROPUESTA). */
export function Sello({
  texto = "DEMO",
  className,
  titulo,
}: {
  texto?: "DEMO" | "PROPUESTA" | "PILOTO" | string
  className?: string
  titulo?: string
}) {
  return (
    <span
      title={titulo ?? (texto === "DEMO" ? "Datos ficticios de demostración" : undefined)}
      className={cn(
        "inline-flex h-5 shrink-0 items-center border border-dashed border-alerta px-1.5 font-mono text-[10px] font-semibold leading-none tracking-[0.2em] text-alerta",
        className,
      )}
    >
      {texto}
    </span>
  )
}

/** Etiqueta mono tipo ficha técnica: `VENTA #10482 · MOSTRADOR 2`. */
export function Ficha({ children, className, as: Tag = "span" }: { children: React.ReactNode; className?: string; as?: "span" | "p" | "div" }) {
  return <Tag className={cn("ficha", className)}>{children}</Tag>
}

/** Une partes con " · " como en las fichas. */
export function partes(...p: (string | number | null | undefined | false)[]) {
  return p.filter((x) => x !== null && x !== undefined && x !== false && x !== "").join(" · ")
}

const COLOR_ESTADO: Record<EstadoFeature, string> = {
  disponible: "bg-ok",
  demo: "bg-chispa",
  "próximamente": "bg-acero",
}

/** Sello de estado del registro de funcionalidades. */
export function EstadoFeatureBadge({ estado, className }: { estado: EstadoFeature; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-linea bg-superficie-2 px-2.5 font-mono text-[10.5px] uppercase tracking-wider text-foreground/85",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", COLOR_ESTADO[estado])} aria-hidden />
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}

/**
 * Renderiza un texto de configuración resaltando los [COMPLETAR ...]
 * para que nunca pasen por datos reales.
 */
export function TextoConfig({ texto, className }: { texto: string; className?: string }) {
  if (!ES_COMPLETAR.test(texto)) return <span className={className}>{texto}</span>
  const trozos = texto.split(/(\[COMPLETAR[^\]]*\])/g)
  return (
    <span className={className}>
      {trozos.map((t, i) =>
        ES_COMPLETAR.test(t) ? (
          <mark
            key={i}
            className="rounded-[3px] border border-dashed border-chispa/70 bg-chispa/10 px-1 font-mono text-[0.85em] text-chispa-texto"
          >
            {t}
          </mark>
        ) : (
          <span key={i}>{t}</span>
        ),
      )}
    </span>
  )
}

/** Punto de estado (conexión, sincronización). */
export function Punto({ tono, pulso, className }: { tono: "ok" | "chispa" | "error" | "acero"; pulso?: boolean; className?: string }) {
  const color = { ok: "bg-ok", chispa: "bg-chispa", error: "bg-error", acero: "bg-acero" }[tono]
  return (
    <span className={cn("relative inline-flex size-2", className)} aria-hidden>
      {pulso && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", color)} />}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  )
}
