import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Sparkline } from "@/components/graficos/graficos"
import { cn } from "@/lib/utils"

/** Variación con signo, coloreada por dirección × si subir es bueno. */
export function Delta({ valor, periodo, subirEsBueno = true }: { valor: number | null; periodo: string; subirEsBueno?: boolean }) {
  if (valor === null || !Number.isFinite(valor)) return <span className="t-texto-sm text-muted-foreground">sin datos de {periodo}</span>
  const bueno = valor === 0 ? null : (valor > 0) === subirEsBueno
  const Icono = valor >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className="t-dato inline-flex flex-wrap items-center gap-x-1.5">
      <span className={cn("inline-flex items-center whitespace-nowrap font-semibold", bueno === null ? "text-muted-foreground" : bueno ? "text-ok" : "text-error")}>
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
    <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-lg border border-linea bg-card p-4", className)}>
      <p className="t-etiqueta truncate text-muted-foreground">{etiqueta}</p>
      <p className="t-numero-lg truncate">{valor}</p>
      {delta}
      {tendencia && tendencia.length > 1 && <Sparkline valores={tendencia} className="mt-1" />}
      {pie && <div className="t-texto-sm mt-auto pt-1 text-muted-foreground">{pie}</div>}
    </div>
  )
}
