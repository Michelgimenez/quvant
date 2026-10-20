import { cn } from "@/lib/utils"
import { FIRMA_PROPORCIONES } from "./q-geometria"

/**
 * El logo de Quvant con los archivos de public/marca/ (scripts/marca/generar-marca.mjs). No se redibuja:
 * son <img> de los originales. Versiones del manual (pág. 6):
 * - principal: la Q cromada y QUVANT en blanco, sobre negro (por defecto);
 * - negativa: todo en negro, sobre fondos claros;
 * - auto: principal en el modo oscuro y negativa en el claro.
 * Tamaños mínimos: isotipo 16 px, firma 96 px de ancho. El logotipo QUVANT es PROVISORIO (Michroma) hasta el archivo oficial.
 */
type Version = "principal" | "negativa" | "auto"

const BAJADA = "Software a la vanguardia de cada nicho."
const LADO_MINIMO_ISOTIPO = 16
const ANCHO_MINIMO_FIRMA = 96

function srcQ(tinta: "cromada" | "negra" | "blanca", lado: number) {
  const tamanos = tinta === "cromada" ? [64, 128, 256, 512, 1024] : [64, 256, 1024]
  return {
    src: `/marca/quvant-q-${tinta}-${tamanos.find((t) => t >= lado * 2) ?? tamanos.at(-1)}.png`,
    srcSet: tamanos.map((t) => `/marca/quvant-q-${tinta}-${t}.png ${t}w`).join(", "),
    sizes: `${lado}px`,
  }
}

function ImagenesPorVersion({
  version,
  principal,
  negativa,
}: {
  version: Version
  principal: React.ReactElement<{ className?: string }>
  negativa: React.ReactElement<{ className?: string }>
}) {
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
  lado = 24,
  version = "auto",
  tinta,
  className,
  titulo = "Quvant",
}: {
  lado?: number
  version?: Version
  tinta?: "blanca" | "negra"
  className?: string
  titulo?: string | null
}) {
  const l = Math.max(LADO_MINIMO_ISOTIPO, lado)
  const img = (t: "cromada" | "negra" | "blanca") => (
    // eslint-disable-next-line @next/next/no-img-element -- el logo es el archivo original, sin optimizar ni recortar
    <img {...srcQ(t, l)} alt="" width={l} height={l} draggable={false} className="block size-full select-none" />
  )
  return (
    <span
      role={titulo ? "img" : undefined}
      aria-label={titulo ?? undefined}
      aria-hidden={titulo ? undefined : true}
      className={cn("inline-block shrink-0", className)}
      style={{ width: l, height: l }}
    >
      {tinta ? img(tinta) : <ImagenesPorVersion version={version} principal={img("cromada")} negativa={img("negra")} />}
    </span>
  )
}

/**
 * La firma horizontal: la Q + QUVANT, con las proporciones medidas en el manual.
 * `alto` es el lado de la Q. Con `bajada`, va "Software a la vanguardia de cada nicho." alineada con el logotipo.
 * Con `resguardo`, deja libre el doble del lado del punto alrededor (manual, pág. 6).
 */
export function Firma({
  alto = 28,
  version = "auto",
  bajada = false,
  resguardo = false,
  className,
}: {
  alto?: number
  version?: Version
  bajada?: boolean
  resguardo?: boolean
  className?: string
}) {
  const p = FIRMA_PROPORCIONES
  const a = Math.max(alto, ANCHO_MINIMO_FIRMA / p.ancho)
  const ancho = a * p.ancho
  const logotipo = (tinta: "blanco" | "negro") => (
    // eslint-disable-next-line @next/next/no-img-element -- el logotipo es el archivo de marca
    <img
      src={`/marca/quvant-logotipo-${tinta}.svg`}
      alt=""
      draggable={false}
      className="absolute block max-w-none select-none"
      style={{ left: a * p.logotipo.x, top: a * p.logotipo.y, width: a * p.logotipo.ancho, height: a * p.logotipo.alto }}
    />
  )
  const q = (tinta: "cromada" | "negra") => (
    // eslint-disable-next-line @next/next/no-img-element -- el logo es el archivo original
    <img {...srcQ(tinta, a)} alt="" width={a} height={a} draggable={false} className="absolute left-0 top-0 block select-none" style={{ width: a, height: a }} />
  )
  return (
    <span
      role="img"
      aria-label={bajada ? `Quvant. ${BAJADA}` : "Quvant"}
      className={cn("inline-flex shrink-0 flex-col items-start", className)}
      style={resguardo ? { padding: a * p.resguardo } : undefined}
    >
      <span className="relative block" style={{ width: ancho, height: a }}>
        <ImagenesPorVersion
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
      </span>
      {bajada && (
        <span
          aria-hidden
          className={cn(
            "block whitespace-nowrap font-sans",
            version === "principal" && "text-acero",
            version === "negativa" && "text-gris-6",
            version === "auto" && "text-gris-6 dark:text-acero",
          )}
          style={{ marginLeft: a * p.logotipo.x, marginTop: a * 0.14, fontSize: a * 0.42, lineHeight: 1.3 }}
        >
          {BAJADA}
        </span>
      )}
    </span>
  )
}
