import { Wordmark } from "@/components/marca/marca"
import { cn } from "@/lib/utils"

/**
 * "yunque + forja": el wordmark de Yunque, y "forja" en Inter Display
 * ExtraBold, color sólido --niebla. La brasa es solo un punto de acento al lado
 * (nunca un degradé en las letras). Todo se mide en em a partir de `tamano`
 * (alto del wordmark en px) y usa tokens: se adapta cuando la identidad de
 * Yunque se renueve.
 */
export function MarcaForja({ className, tamano = 28, conBrasa = true }: { className?: string; tamano?: number; conBrasa?: boolean }) {
  return (
    <span className={cn("inline-flex items-baseline gap-[0.22em] text-niebla", className)} style={{ fontSize: tamano }} role="img" aria-label="yunque más forja">
      <Wordmark className="h-[1em] w-auto translate-y-[0.2em] self-center" titulo={null} />
      <span aria-hidden className="font-heading text-[0.86em] font-extrabold leading-none tracking-[-0.03em] opacity-80">
        +
      </span>
      <span aria-hidden className="font-heading text-[0.86em] font-extrabold leading-none tracking-[-0.04em]" style={{ fontVariationSettings: '"opsz" 32' }}>
        forja
      </span>
      {conBrasa && <span aria-hidden className="ml-[0.02em] inline-block size-[0.2em] rounded-full bg-brasa shadow-[0_0_0.5em_0.08em_rgb(255_106_31/0.6)]" />}
    </span>
  )
}
