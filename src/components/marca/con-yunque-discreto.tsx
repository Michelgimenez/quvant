import { cn } from "@/lib/utils"
import { Isotipo } from "./marca"

/** Firma discreta dentro de la app del cliente: isotipo + "con yunque". */
export function ConYunqueDiscreto({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Isotipo className="h-3.5" titulo={null} />
      <span>
        con <span className="font-display font-extrabold tracking-tight text-foreground/80">yunque</span>
      </span>
    </span>
  )
}
