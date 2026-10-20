import { LOGOS_EMPRESAS } from "@/demo/logos-empresas"
import { EMPRESAS, type IdEmpresa } from "@/demo/empresas"
import { cn } from "@/lib/utils"

/**
 * El logo ficticio de una empresa de la demo: una palabra en una tipografía libre, en su color.
 * Es la marca de esa empresa, no la de Quvant. `tinta="color"` (por defecto) o `tinta="actual"` (hereda el texto).
 */
export function LogoEmpresa({ id, className, tinta = "color", titulo = true }: { id: IdEmpresa; className?: string; tinta?: "color" | "actual"; titulo?: boolean }) {
  const logo = LOGOS_EMPRESAS[id]
  const [, , w, h] = logo.viewBox.split(" ").map(Number)
  return (
    <svg
      viewBox={logo.viewBox}
      className={cn("block h-5 w-auto shrink-0", className)}
      style={{ aspectRatio: `${w} / ${h}`, color: tinta === "color" ? EMPRESAS[id].color : undefined }}
      role={titulo ? "img" : undefined}
      aria-label={titulo ? EMPRESAS[id].nombre : undefined}
      aria-hidden={titulo ? undefined : true}
      data-flip-id={`logo-${id}`}
    >
      <g fill="currentColor">
        {logo.letras.map((l, i) => (
          <g key={i} transform={`matrix(${l.t})`}>
            {l.p.map((p, j) => (
              <path key={j} transform={p.t ? `matrix(${p.t})` : undefined} d={p.d} />
            ))}
          </g>
        ))}
      </g>
    </svg>
  )
}
