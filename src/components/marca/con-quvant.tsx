import { cn } from "@/lib/utils"
import { Isotipo, Logotipo } from "./quvant"

/**
 * Sello "Funciona con Quvant" para las webs y documentos de los clientes. Quvant acompaña a la marca del
 * cliente: el sello es chico, sobrio y en negro y blanco.
 *
 * - `tema="oscuro"`: para fondos oscuros (Q cromada, QUVANT en blanco).
 * - `tema="claro"`: para fondos claros (todo en negro, la versión negativa).
 *
 * Versiones estáticas para sitios que no usan React: /public/marca/con-quvant-claro.svg y con-quvant-oscuro.svg
 * (node scripts/generar-sellos.mjs).
 */
export function ConQuvant({
  tema = "oscuro",
  tamano = "md",
  href,
  className,
  texto = "Funciona con",
}: {
  tema?: "claro" | "oscuro"
  tamano?: "sm" | "md" | "lg"
  href?: string
  className?: string
  texto?: string
}) {
  const claro = tema === "claro"
  const caja = { sm: "h-7 gap-2 px-2.5", md: "h-9 gap-2.5 px-3.5", lg: "h-11 gap-3 px-4" }[tamano]
  const iso = { sm: 16, md: 18, lg: 22 }[tamano]
  const logotipo = { sm: "h-[9px]", md: "h-[10px]", lg: "h-3" }[tamano]
  const version = claro ? "negativa" : "principal"

  const contenido = (
    <>
      <span className={cn("t-etiqueta", claro ? "text-gris-6" : "text-acero")}>{texto}</span>
      <span className="inline-flex items-center gap-1.5">
        <Isotipo lado={iso} version={version} titulo={null} />
        <Logotipo version={version} className={logotipo} />
      </span>
    </>
  )

  const clases = cn(
    "inline-flex select-none items-center border leading-none transition-colors",
    caja,
    claro ? "border-gris-11 bg-blanco hover:border-gris-8" : "border-gris-3 bg-negro hover:border-gris-5",
    className,
  )

  if (href) {
    return (
      <a href={href} className={clases} aria-label={`${texto} Quvant`} target="_blank" rel="noopener">
        {contenido}
      </a>
    )
  }
  return (
    <span className={clases} role="img" aria-label={`${texto} Quvant`}>
      {contenido}
    </span>
  )
}

/** Firma discreta dentro de la app del cliente (manual, pág. 4: «by Quvant» en el ingreso y en el pie). */
export function ConQuvantDiscreto({ className }: { className?: string }) {
  return (
    <span className={cn("t-etiqueta inline-flex items-center gap-2 text-muted-foreground", className)}>
      <Isotipo lado={16} titulo={null} />
      <span>
        con <span className="text-foreground/85">Quvant</span>
      </span>
    </span>
  )
}
