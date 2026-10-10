import { cn } from "@/lib/utils"
import { Isotipo, Wordmark } from "./marca"

/**
 * Sello "funciona con yunque" para las webs y documentos de los clientes.
 * Yunque acompaña a la marca del cliente: el sello es chico y sobrio.
 *
 * - `tema="claro"`: para fondos claros (chispa azul temple).
 * - `tema="oscuro"`: para fondos oscuros (chispa ámbar).
 *
 * También hay versiones estáticas en /public/marca/con-yunque-claro.svg y
 * con-yunque-oscuro.svg para sitios que no usan React.
 */
export function ConYunque({
  tema = "oscuro",
  tamano = "md",
  href,
  className,
  texto = "funciona con",
}: {
  tema?: "claro" | "oscuro"
  tamano?: "sm" | "md" | "lg"
  href?: string
  className?: string
  texto?: string
}) {
  const claro = tema === "claro"
  const alto = { sm: "h-7 gap-1.5 px-2.5 text-[11px]", md: "h-9 gap-2 px-3.5 text-xs", lg: "h-11 gap-2.5 px-4 text-sm" }[tamano]
  const iso = { sm: "h-3.5", md: "h-4", lg: "h-5" }[tamano]
  const wm = { sm: "h-3", md: "h-3.5", lg: "h-4" }[tamano]

  const contenido = (
    <>
      <span className={cn("font-medium", claro ? "text-[#4a525d]" : "text-[#b4bbc4]")}>{texto}</span>
      <span className="inline-flex items-center gap-1">
        <Isotipo className={iso} tono={claro ? "positivo" : "negativo"} titulo={null} />
        <Wordmark className={wm} titulo={null} />
      </span>
    </>
  )

  const clases = cn(
    "inline-flex select-none items-center rounded-full border font-sans leading-none transition-colors",
    alto,
    claro
      ? "border-[#d5dae0] bg-white text-[#0e1116] hover:border-[#9aa3ae]"
      : "border-white/10 bg-[#0e1116] text-[#eef1f4] hover:border-white/25",
    className,
  )

  if (href) {
    return (
      <a href={href} className={clases} aria-label={`${texto} yunque`} target="_blank" rel="noopener">
        {contenido}
      </a>
    )
  }
  return (
    <span className={clases} role="img" aria-label={`${texto} yunque`}>
      {contenido}
    </span>
  )
}
