"use client"

import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import { cn } from "@/lib/utils"

/**
 * Piezas del tablero que leen el modelo de negocio (src/dominio/negocio.ts) y no saben de dónde salen los
 * datos: las usan la demo y la app. Tipografía cerrada (.t-*) y colores de la marca; el de la empresa, solo
 * en la serie principal (var(--serie-1)).
 */

export type Densidad = "amplia" | "media" | "densa"

export function Tarjeta({
  etiqueta,
  titulo,
  accion,
  children,
  className,
  densidad = "media",
  flip,
}: {
  etiqueta?: string
  titulo?: string
  accion?: React.ReactNode
  children: React.ReactNode
  className?: string
  densidad?: Densidad
  flip?: string
}) {
  return (
    <section
      className={cn("flex min-w-0 flex-col rounded-lg border border-linea bg-card", densidad === "amplia" ? "gap-4 p-6" : densidad === "media" ? "gap-3 p-5" : "gap-2.5 p-4", className)}
      data-flip-id={flip}
    >
      {(etiqueta || titulo || accion) && (
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {etiqueta && <p className="t-etiqueta truncate text-muted-foreground">{etiqueta}</p>}
            {titulo && <h2 className={cn("truncate", densidad === "amplia" ? "t-titulo-sm mt-1" : "t-texto mt-0.5 font-semibold")}>{titulo}</h2>}
          </div>
          {accion}
        </header>
      )}
      {children}
    </section>
  )
}

/** Variación porcentual con su signo y su dirección (ok si sube y subir es bueno). */
export function Variacion({ valor, contra, subirEsBueno = true, className }: { valor: number | null; contra: string; subirEsBueno?: boolean; className?: string }) {
  if (valor === null || !Number.isFinite(valor)) return <span className={cn("t-texto-sm text-muted-foreground", className)}>sin datos de {contra}</span>
  const bueno = Math.abs(valor) < 0.05 ? null : (valor > 0) === subirEsBueno
  const Icono = valor >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("t-dato inline-flex flex-wrap items-center gap-x-1.5", className)}>
      <span className={cn("inline-flex items-center font-semibold", bueno === null ? "text-muted-foreground" : bueno ? "text-ok" : "text-error")}>
        <Icono className="size-3.5" aria-hidden />
        {valor > 0 ? "+" : valor < 0 ? "−" : ""}
        {Math.abs(valor).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %
      </span>
      <span className="text-muted-foreground">vs {contra}</span>
    </span>
  )
}

/** Un número que manda: grande, tabular y con su etiqueta. `data-numero` lo usa el rodado de cifras (tanda 4). */
export function Numero({ valor, formato = "pesos", tamano = "lg", className, flip }: { valor: number; formato?: "pesos" | "pesos-corto" | "entero" | "porcentaje"; tamano?: "xl" | "lg" | "md" | "sm"; className?: string; flip?: string }) {
  const texto = formatear(valor, formato)
  return (
    <p
      className={cn(tamano === "xl" ? "t-numero-xl" : tamano === "lg" ? "t-numero-lg" : tamano === "md" ? "t-numero" : "t-dato font-semibold", className)}
      data-numero={valor}
      data-formato={formato}
      data-flip-id={flip}
    >
      {texto}
    </p>
  )
}

export function formatear(valor: number, formato: "pesos" | "pesos-corto" | "entero" | "porcentaje") {
  if (formato === "pesos") return formatoPesos(valor, { sinDecimales: true })
  if (formato === "pesos-corto") return Math.abs(valor) >= 1e11 ? `$ ${Math.round(valor / 1e8).toLocaleString("es-AR")} M` : formatoPesosCorto(valor)
  if (formato === "porcentaje") return `${(valor * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`
  return Math.round(valor).toLocaleString("es-AR")
}

/** Barra de avance (0 a 1+), en blanco/negro; la serie principal en el color de la empresa si `marca`. */
export function Avance({ valor, marca = false, className }: { valor: number; marca?: boolean; className?: string }) {
  const v = Math.max(0, Math.min(1, valor))
  return (
    <span className={cn("relative block h-1.5 w-full overflow-hidden bg-muted", className)} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(valor * 100)}>
      <span className={cn("absolute inset-y-0 left-0 origin-left", marca ? "bg-[var(--serie-1)]" : "bg-foreground")} style={{ width: `${v * 100}%` }} />
    </span>
  )
}

/** La etiqueta SIMULACIÓN: siempre a la vista donde hay eventos simulados. */
export function SelloSimulacion({ className }: { className?: string }) {
  return (
    <span className={cn("t-etiqueta inline-flex h-5 items-center gap-1.5 border border-gris-5 px-1.5 text-acero", className)} title="Eventos simulados en el navegador para que la demo se vea viva">
      <span className="relative inline-flex size-[6px]">
        <span className="absolute inset-0 animate-ping bg-ok opacity-60" />
        <span className="relative size-[6px] bg-ok" />
      </span>
      Simulación
    </span>
  )
}

/** Fila de dato: etiqueta a la izquierda, valor tabular a la derecha. */
export function Fila({ etiqueta, valor, fuerte, className }: { etiqueta: React.ReactNode; valor: React.ReactNode; fuerte?: boolean; className?: string }) {
  return (
    <div className={cn("t-dato flex items-baseline justify-between gap-3", className)}>
      <span className="min-w-0 truncate text-muted-foreground">{etiqueta}</span>
      <span className={cn("shrink-0 whitespace-nowrap", fuerte ? "font-semibold text-foreground" : "text-foreground")}>{valor}</span>
    </div>
  )
}
