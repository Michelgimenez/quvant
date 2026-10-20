import { Isotipo } from "@/components/marca/quvant"
import { cn } from "@/lib/utils"

/**
 * La placa de Forja: "FORJA" en Michroma (una palabra, mayúsculas, espaciado amplio: manual, pág. 9) y la
 * firma «by Quvant» (manual, pág. 4: los productos llevan «by Quvant»). Todo en em a partir de `tamano`
 * (alto de las mayúsculas en px). Negro y blanco: la Q cromada es el único brillo.
 */
export function MarcaForja({ className, tamano = 28 }: { className?: string; tamano?: number; conBrasa?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.55em] text-blanco", className)} style={{ fontSize: tamano }} role="img" aria-label="Forja, by Quvant">
      <span aria-hidden className="font-marca text-[1em] uppercase leading-none tracking-[0.18em]">
        Forja
      </span>
      <span aria-hidden className="inline-flex items-center gap-[0.3em] border-l border-gris-4 pl-[0.55em] font-sans text-[0.36em] font-medium uppercase leading-none tracking-[0.2em] text-acero">
        by
        <Isotipo lado={Math.max(16, tamano * 0.5)} version="principal" titulo={null} />
        Quvant
      </span>
    </span>
  )
}
