/* eslint-disable @next/next/no-img-element -- logos subidos por cada organización (URL o data URL) */
import { cn } from "@/lib/utils"
import type { Organizacion } from "@/dominio/tipos"
import { textoSobre } from "@/lib/color"

type OrgMarca = Pick<Organizacion, "nombre" | "logo" | "logoNegativo" | "colorAcento">

/**
 * Logo de la organización cliente (co-branding). Usa la versión negativa en
 * modo oscuro si existe; si no hay logo, arma un monograma con su color.
 */
export function LogoOrg({ org, className, alto = "h-8" }: { org: OrgMarca; className?: string; alto?: string }) {
  if (org.logo) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <img src={org.logo} alt={org.nombre} className={cn(alto, "w-auto", org.logoNegativo && "dark:hidden")} />
        {org.logoNegativo && <img src={org.logoNegativo} alt={org.nombre} className={cn(alto, "hidden w-auto dark:block")} />}
      </span>
    )
  }
  const iniciales = org.nombre
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(alto, "inline-flex aspect-square items-center justify-center rounded-md font-display t-texto-sm font-bold")}
        style={{ background: org.colorAcento, color: textoSobre(org.colorAcento) }}
        aria-hidden
      >
        {iniciales || "·"}
      </span>
      <span className="font-display text-base font-bold leading-tight">{org.nombre}</span>
    </span>
  )
}
