import { cn } from "@/lib/utils"
import { FIRMA_PROPORCIONES } from "./q-geometria"

/**
 * El logo de Quvant con los archivos de public/marca/ (scripts/marca/generar-marca.mjs). No se redibuja:
 * son <img> de los originales. Versiones del manual (pág. 6):
 * - principal: la Q cromada y QUVANT en blanco, sobre negro (por defecto);
 * - negativa: todo en negro, sobre fondos claros;
 * - auto: principal en el modo oscuro y negativa en el claro.
 * El tamaño va por `alto`/`lado` (px) o por una clase de altura (`className="h-7"`): adentro todo se ubica
 * en porcentajes de las proporciones medidas en el manual.
 * Tamaños mínimos: isotipo 16 px, firma 96 px de ancho. El logotipo QUVANT es PROVISORIO (Michroma) hasta el archivo oficial.
 */
export type VersionLogo = "principal" | "negativa" | "auto"

export const BAJADA = "Software a la vanguardia de cada nicho."
const P = FIRMA_PROPORCIONES
const pct = (n: number) => `${(n * 100).toFixed(3)}%`

function srcQ(tinta: "cromada" | "negra" | "blanca", lado = 64) {
  const tamanos = tinta === "cromada" ? [64, 128, 256, 512, 1024] : [64, 256, 1024]
  return {
    src: `/marca/quvant-q-${tinta}-${tamanos.find((t) => t >= lado * 2) ?? tamanos.at(-1)}.png`,
    srcSet: tamanos.map((t) => `/marca/quvant-q-${tinta}-${t}.png ${t}w`).join(", "),
    sizes: `${Math.max(16, Math.round(lado))}px`,
  }
}

function PorVersion({ version, principal, negativa }: { version: VersionLogo; principal: React.ReactNode; negativa: React.ReactNode }) {
  if (version === "principal") return principal
  if (version === "negativa") return negativa
  return (
    <>
      <span className="hidden dark:contents">{principal}</span>
      <span className="contents dark:hidden">{negativa}</span>
    </>
  )
}

/** La Q sola (aro, cola y punto). `tinta` fuerza una sola tinta (blanca o negra) en vez de la versión. */
export function Isotipo({
  lado,
  version = "auto",
  tinta,
  className,
  titulo = "Quvant",
}: {
  lado?: number
  version?: VersionLogo
  tinta?: "blanca" | "negra"
  className?: string
  titulo?: string | null
}) {
  const l = lado === undefined ? undefined : Math.max(16, lado)
  const img = (t: "cromada" | "negra" | "blanca") => (
    // eslint-disable-next-line @next/next/no-img-element -- el logo es el archivo original, sin optimizar ni recortar
    <img {...srcQ(t, l ?? 48)} alt="" draggable={false} className="absolute inset-0 block size-full select-none" />
  )
  return (
    <span
      role={titulo ? "img" : undefined}
      aria-label={titulo ?? undefined}
      aria-hidden={titulo ? undefined : true}
      className={cn("relative inline-block aspect-square min-h-4 shrink-0", l === undefined && "h-6", className)}
      style={l === undefined ? undefined : { width: l, height: l }}
    >
      {tinta ? img(tinta) : <PorVersion version={version} principal={img("cromada")} negativa={img("negra")} />}
    </span>
  )
}

/** Solo el logotipo QUVANT (sin la Q), para lugares donde la Q ya está o no entra. */
export function Logotipo({ version = "auto", className }: { version?: VersionLogo; className?: string }) {
  const img = (tinta: "blanco" | "negro") => (
    // eslint-disable-next-line @next/next/no-img-element -- el logotipo es el archivo de marca
    <img src={`/marca/quvant-logotipo-${tinta}.svg`} alt="" draggable={false} className="absolute inset-0 block size-full select-none" />
  )
  return (
    <span role="img" aria-label="Quvant" className={cn("relative inline-block h-4 shrink-0", className)} style={{ aspectRatio: P.logotipo.ancho / P.logotipo.alto }}>
      <PorVersion version={version} principal={img("blanco")} negativa={img("negro")} />
    </span>
  )
}

/**
 * La firma horizontal: la Q + QUVANT, con las proporciones medidas en el manual. `alto` es el lado de la Q.
 * Con `bajada` va "Software a la vanguardia de cada nicho." alineada con el logotipo (pide `alto`).
 * Con `resguardo`, deja libre el doble del lado del punto alrededor (manual, pág. 6).
 */
export function Firma({
  alto,
  version = "auto",
  bajada = false,
  resguardo = false,
  className,
}: {
  alto?: number
  version?: VersionLogo
  bajada?: boolean
  resguardo?: boolean
  className?: string
}) {
  const a = alto === undefined ? undefined : Math.max(alto, 96 / P.ancho)
  const ladoQ = a ?? 32
  const logotipo = (tinta: "blanco" | "negro") => (
    // eslint-disable-next-line @next/next/no-img-element -- el logotipo es el archivo de marca
    <img
      src={`/marca/quvant-logotipo-${tinta}.svg`}
      alt=""
      draggable={false}
      className="absolute block max-w-none select-none"
      style={{ left: pct(P.logotipo.x / P.ancho), top: pct(P.logotipo.y), width: pct(P.logotipo.ancho / P.ancho), height: pct(P.logotipo.alto) }}
    />
  )
  const q = (tinta: "cromada" | "negra") => (
    // eslint-disable-next-line @next/next/no-img-element -- el logo es el archivo original
    <img {...srcQ(tinta, ladoQ)} alt="" draggable={false} className="absolute left-0 top-0 block h-full select-none" style={{ width: pct(1 / P.ancho) }} />
  )
  const contenido = (
    <PorVersion
      version={version}
      principal={
        <>
          {q("cromada")}
          {logotipo("blanco")}
        </>
      }
      negativa={
        <>
          {q("negra")}
          {logotipo("negro")}
        </>
      }
    />
  )
  const estiloCaja = { aspectRatio: `${P.ancho} / 1`, ...(a === undefined ? {} : { height: a }) }
  if (!bajada && !resguardo)
    return (
      <span role="img" aria-label="Quvant" className={cn("relative inline-block min-h-[17px] shrink-0", a === undefined && "h-7", className)} style={estiloCaja}>
        {contenido}
      </span>
    )
  const caja = (
    <span className="relative block min-h-[17px] shrink-0" style={{ ...estiloCaja, height: ladoQ }}>
      {contenido}
    </span>
  )
  return (
    <span
      role="img"
      aria-label={bajada ? `Quvant. ${BAJADA}` : "Quvant"}
      className={cn("inline-flex shrink-0 flex-col items-start", className)}
      style={resguardo ? { padding: ladoQ * P.resguardo } : undefined}
    >
      {caja}
      {bajada && (
        <span
          aria-hidden
          className={cn(
            "block whitespace-nowrap font-sans",
            version === "principal" && "text-acero",
            version === "negativa" && "text-gris-6",
            version === "auto" && "text-gris-6 dark:text-acero",
          )}
          style={{ marginLeft: ladoQ * P.logotipo.x, marginTop: ladoQ * 0.14, fontSize: ladoQ * 0.42, lineHeight: 1.3 }}
        >
          {BAJADA}
        </span>
      )}
    </span>
  )
}

/** El punto cuadrado del logo, para piezas gráficas y destacados (no en el texto corrido). */
export function Punto({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-[0.42em] shrink-0 bg-current", className)} />
}
