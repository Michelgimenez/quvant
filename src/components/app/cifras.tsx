import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Sparkline } from "@/components/graficos/graficos"
import { cn } from "@/lib/utils"

/** Variación con signo, coloreada por dirección × si subir es bueno. */
export function Delta({ valor, periodo, subirEsBueno = true }: { valor: number | null; periodo: string; subirEsBueno?: boolean }) {
  if (valor === null || !Number.isFinite(valor)) return <span className="text-xs text-muted-foreground">sin datos de {periodo}</span>
  const bueno = valor === 0 ? null : (valor > 0) === subirEsBueno
  const Icono = valor >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 text-xs">
      <span className={cn("inline-flex items-center whitespace-nowrap font-semibold", bueno === null ? "text-muted-foreground" : bueno ? "text-ok-texto" : "text-error-texto")}>
        <Icono className="size-3.5" aria-hidden />
        {valor > 0 ? "+" : valor < 0 ? "−" : ""}
        {Math.abs(valor).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %
      </span>
      <span className="text-muted-foreground">vs {periodo}</span>
    </span>
  )
}

/** Tile de cifra: etiqueta · valor · delta · tendencia. */
export function Cifra({
  etiqueta,
  valor,
  delta,
  tendencia,
  pie,
  className,
}: {
  etiqueta: string
  valor: string
  delta?: React.ReactNode
  tendencia?: number[]
  pie?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-xl border border-linea bg-card p-4", className)}>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{valor}</p>
      {delta}
      {tendencia && tendencia.length > 1 && <Sparkline valores={tendencia} className="mt-1" />}
      {pie && <div className="mt-auto pt-1 text-xs text-muted-foreground">{pie}</div>}
    </div>
  )
}
