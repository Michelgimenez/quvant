import type { Ilustracion } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

/**
 * Ilustraciones neutras por tipo de producto (SVG de trazo, propias).
 * Nunca fotos de terceros. Heredan currentColor.
 */
const TRAZOS: Record<Ilustracion, React.ReactNode> = {
  taladro: (
    <>
      <path d="M8 14h22a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4H8z" />
      <path d="M34 17h6M34 21h8" />
      <path d="M14 24l-2 14h8l3-14" />
      <path d="M12 38h10" />
    </>
  ),
  amoladora: (
    <>
      <circle cx="13" cy="26" r="9" />
      <path d="M13 22v8M9 26h8" />
      <path d="M20 22h18a3 3 0 0 1 0 6H20" />
      <path d="M24 22v-5" />
    </>
  ),
  soldadora: (
    <>
      <rect x="8" y="14" width="28" height="22" rx="2" />
      <circle cx="17" cy="25" r="4" />
      <path d="M26 21h6M26 26h6M26 31h4" />
      <path d="M36 30c4 0 4 6 8 6" />
      <path d="M14 14v-3h16v3" />
    </>
  ),
  compresor: (
    <>
      <rect x="6" y="20" width="30" height="14" rx="7" />
      <path d="M14 20v-6h12v6" />
      <circle cx="12" cy="38" r="3" />
      <circle cx="30" cy="38" r="3" />
      <circle cx="40" cy="16" r="4" />
      <path d="M36 20l4-0" />
    </>
  ),
  generador: (
    <>
      <path d="M6 14h36v20H6z" />
      <path d="M6 34v4M42 34v4" />
      <rect x="11" y="19" width="12" height="10" rx="1" />
      <path d="M30 20l-3 5h4l-3 5" />
    </>
  ),
  hidrolavadora: (
    <>
      <rect x="8" y="10" width="16" height="22" rx="3" />
      <circle cx="12" cy="36" r="3" />
      <circle cx="22" cy="36" r="3" />
      <path d="M24 18c8 0 6 12 14 12h4" />
      <path d="M42 27v6" />
    </>
  ),
  sierra: (
    <>
      <circle cx="22" cy="26" r="11" />
      <path d="M22 15l2-3M33 26l3 2M22 37l-2 3M11 26l-3-2M30 18l3-1M14 34l-3 1" />
      <circle cx="22" cy="26" r="3" />
      <path d="M30 12h12v8" />
    </>
  ),
  llave: (
    <>
      <path d="M12 36l16-16" />
      <path d="M30 8a8 8 0 0 0-6 11l3 3a8 8 0 0 0 11-6l-5 1-3-3z" />
      <circle cx="12" cy="36" r="4" />
    </>
  ),
  disco: (
    <>
      <circle cx="24" cy="24" r="16" />
      <circle cx="24" cy="24" r="4" />
      <path d="M24 8v6M24 34v6M8 24h6M34 24h6" opacity=".6" />
    </>
  ),
  tornillo: (
    <>
      <path d="M17 8h14l3 6H14z" />
      <path d="M20 14v24l4 4 4-4V14" />
      <path d="M20 20l8-2M20 26l8-2M20 32l8-2" />
    </>
  ),
  casco: (
    <>
      <path d="M8 30a16 16 0 0 1 32 0" />
      <path d="M5 30h38v4H5z" />
      <path d="M20 15v8M28 15v8" />
    </>
  ),
  bomba: (
    <>
      <circle cx="18" cy="26" r="10" />
      <circle cx="18" cy="26" r="3" />
      <path d="M28 22h12v8H28" />
      <path d="M18 16V8h8" />
      <path d="M10 38h16" />
    </>
  ),
  medidor: (
    <>
      <rect x="8" y="12" width="32" height="24" rx="3" />
      <path d="M8 28h32" />
      <path d="M14 28v-4M20 28v-6M26 28v-4M32 28v-6" />
      <circle cx="36" cy="18" r="2" />
    </>
  ),
  cable: (
    <>
      <circle cx="20" cy="24" r="12" />
      <circle cx="20" cy="24" r="5" />
      <path d="M32 24c6 0 4 10 10 10" />
      <path d="M42 30v8" />
    </>
  ),
  lubricante: (
    <>
      <path d="M16 16h16v24H16z" />
      <path d="M20 16v-4h8v4" />
      <path d="M28 12l8-4" />
      <path d="M20 26h8" />
    </>
  ),
  escalera: (
    <>
      <path d="M14 42L22 6M34 42L26 6" />
      <path d="M17 32h14M19 24h10M21 16h6" />
    </>
  ),
}

export function IlustracionProducto({ tipo, className, titulo }: { tipo: Ilustracion; className?: string; titulo?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-10 text-muted-foreground", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      {TRAZOS[tipo] ?? TRAZOS.tornillo}
    </svg>
  )
}

/** Recuadro con la ilustración, para listas y fichas. */
export function MiniaturaProducto({ tipo, className }: { tipo: Ilustracion; className?: string }) {
  return (
    <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-linea bg-superficie-2", className)}>
      <IlustracionProducto tipo={tipo} className="size-7" />
    </span>
  )
}
