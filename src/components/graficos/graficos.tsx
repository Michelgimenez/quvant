"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Table2, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Gráficos de Quvant (SVG propio, sin dependencias).
 * Specs de dataviz: barras ≤ 24 px con punta redondeada de 4 px y base recta,
 * 2 px de separación entre segmentos, grilla hairline sólida y recesiva,
 * leyenda para 2+ series, tooltip con todas las series, vista de tabla.
 * Los colores de serie salen de --serie-1..4 (validados en ambos modos).
 */

export type Serie = { nombre: string; color: string }

export const SERIES = ["var(--serie-1)", "var(--serie-2)", "var(--serie-3)", "var(--serie-4)"]

function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [ancho, setAncho] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, ancho] as const
}

/** Marcas de eje "limpias": 0, 250k, 500k… */
export function ticksLimpios(max: number, cantidad = 4) {
  if (max <= 0) return [0]
  const bruto = max / cantidad
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto
  const ticks: number[] = []
  for (let v = 0; v <= max + paso * 0.001; v += paso) ticks.push(v)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + paso)
  return ticks
}

/** Rectángulo con las esquinas superiores redondeadas (punta de dato) y base recta. */
function columna(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return ""
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`
}

export function Leyenda({ series, forma = "rect" }: { series: Serie[]; forma?: "rect" | "linea" }) {
  if (series.length < 2) return null
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((s) => (
        <li key={s.nombre} className="inline-flex items-center gap-1.5">
          {forma === "rect" ? (
            <span className="size-2.5 rounded-[2px]" style={{ background: s.color }} aria-hidden />
          ) : (
            <span className="h-0.5 w-3 rounded" style={{ background: s.color }} aria-hidden />
          )}
          {s.nombre}
        </li>
      ))}
    </ul>
  )
}

type Punto = { etiqueta: string; detalle?: string; valores: number[] }

/** Columnas en el tiempo; con varias series se apilan. */
export function GraficoColumnas({
  datos,
  series,
  formato,
  formatoEje,
  alto = 220,
  titulo,
  className,
  cadaEtiqueta,
}: {
  datos: Punto[]
  series: Serie[]
  formato: (n: number) => string
  formatoEje?: (n: number) => string
  alto?: number
  titulo: string
  className?: string
  /** Mostrar una etiqueta del eje X cada N columnas. */
  cadaEtiqueta?: number
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>()
  const [activo, setActivo] = useState<number | null>(null)
  const [tabla, setTabla] = useState(false)
  const id = useId()
  const izq = 52
  const abajo = 22
  const arriba = 8
  const totales = datos.map((d) => d.valores.reduce((a, b) => a + b, 0))
  const ticks = ticksLimpios(Math.max(0, ...totales))
  const max = ticks[ticks.length - 1] || 1
  const util = Math.max(0, ancho - izq - 4)
  const banda = datos.length ? util / datos.length : 0
  const grosor = Math.max(2, Math.min(24, banda * 0.66))
  const y = (v: number) => arriba + (alto - arriba - abajo) * (1 - v / max)
  const salto = cadaEtiqueta ?? Math.max(1, Math.ceil(datos.length / Math.max(1, Math.floor(util / 56))))

  return (
    <figure className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Leyenda series={series} />
        <BotonTabla tabla={tabla} setTabla={setTabla} />
      </div>
      {tabla ? (
        <TablaDatos titulo={titulo} columnas={["", ...series.map((s) => s.nombre), ...(series.length > 1 ? ["Total"] : [])]} filas={datos.map((d, i) => [d.detalle ?? d.etiqueta, ...d.valores.map(formato), ...(series.length > 1 ? [formato(totales[i])] : [])])} />
      ) : (
        <div ref={ref} className="relative" style={{ height: alto }} onPointerLeave={() => setActivo(null)}>
          {ancho > 0 && (
            <svg width={ancho} height={alto} role="img" aria-labelledby={`${id}-t`} className="overflow-visible">
              <title id={`${id}-t`}>{titulo}</title>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={izq} x2={ancho} y1={y(t)} y2={y(t)} stroke="var(--linea)" strokeWidth={1} />
                  <text x={izq - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground num text-[10.5px]">
                    {(formatoEje ?? formato)(t)}
                  </text>
                </g>
              ))}
              {datos.map((d, i) => {
                const x = izq + i * banda + (banda - grosor) / 2
                let acumulado = 0
                const total = totales[i]
                return (
                  <g
                    key={i}
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${d.detalle ?? d.etiqueta}: ${formato(total)}`}
                    onPointerEnter={() => setActivo(i)}
                    onFocus={() => setActivo(i)}
                    onBlur={() => setActivo(null)}
                    className="outline-none"
                  >
                    <rect x={izq + i * banda} y={arriba} width={banda} height={alto - arriba - abajo} fill="transparent" />
                    {activo === i && <rect x={izq + i * banda} y={arriba} width={banda} height={alto - arriba - abajo} fill="var(--foreground)" opacity={0.04} />}
                    {d.valores.map((v, s) => {
                      if (v <= 0) return null
                      const y0 = y(acumulado)
                      acumulado += v
                      const y1 = y(acumulado)
                      const esUltimo = d.valores.slice(s + 1).every((w) => w <= 0)
                      const h = Math.max(0, y0 - y1 - (s > 0 ? 2 : 0))
                      return esUltimo ? (
                        <path key={s} d={columna(x, y1, grosor, h)} fill={series[s].color} />
                      ) : (
                        <rect key={s} x={x} y={y1 + 2} width={grosor} height={Math.max(0, h - 2)} fill={series[s].color} />
                      )
                    })}
                    {i % salto === 0 && (
                      <text x={izq + i * banda + banda / 2} y={alto - 6} textAnchor="middle" className="fill-muted-foreground text-[10.5px]">
                        {d.etiqueta}
                      </text>
                    )}
                  </g>
                )
              })}
              <line x1={izq} x2={ancho} y1={y(0)} y2={y(0)} stroke="var(--acero)" strokeOpacity={0.5} strokeWidth={1} />
            </svg>
          )}
          {activo !== null && datos[activo] && (
            <Globo x={izq + activo * banda + banda / 2} ancho={ancho}>
              <p className="mb-1 text-[11px] text-muted-foreground">{datos[activo].detalle ?? datos[activo].etiqueta}</p>
              {series.length > 1 && <p className="num mb-1 text-sm font-semibold">{formato(totales[activo])}</p>}
              {series.map((s, k) => (
                <p key={s.nombre} className="flex items-center gap-2 text-xs">
                  <span className="h-0.5 w-3 rounded" style={{ background: s.color }} aria-hidden />
                  <span className="num font-semibold text-foreground">{formato(datos[activo].valores[k] ?? 0)}</span>
                  <span className="text-muted-foreground">{s.nombre}</span>
                </p>
              ))}
            </Globo>
          )}
        </div>
      )}
    </figure>
  )
}

/** Ranking horizontal (una serie): valor al final de la barra. */
export function BarrasHorizontales({
  datos,
  formato,
  color = "var(--serie-1)",
  titulo,
  className,
}: {
  datos: { etiqueta: string; valor: number; detalle?: string }[]
  formato: (n: number) => string
  color?: string
  titulo: string
  className?: string
}) {
  const [tabla, setTabla] = useState(false)
  const max = Math.max(1, ...datos.map((d) => d.valor))
  return (
    <figure className={cn("space-y-2", className)}>
      <div className="flex justify-end">
        <BotonTabla tabla={tabla} setTabla={setTabla} />
      </div>
      {tabla ? (
        <TablaDatos titulo={titulo} columnas={["", "Valor"]} filas={datos.map((d) => [d.etiqueta, formato(d.valor)])} />
      ) : (
        <ul className="space-y-2.5" aria-label={titulo}>
          {datos.map((d) => (
            <li key={d.etiqueta} className="group" title={d.detalle}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate">{d.etiqueta}</span>
                <span className="num shrink-0 text-xs font-semibold">{formato(d.valor)}</span>
              </div>
              <svg width="100%" height="8" aria-hidden className="block">
                <rect width="100%" height="8" rx="4" fill="var(--serie-tenue)" opacity={0.35} />
                <svg width={`${(d.valor / max) * 100}%`} height="8" className="overflow-visible">
                  <rect width="100%" height="8" rx="4" fill={color} className="transition-opacity group-hover:opacity-85" />
                </svg>
              </svg>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

/** Sparkline en tono de de-énfasis con el último punto en acento. */
export function Sparkline({ valores, className, alto = 28 }: { valores: number[]; className?: string; alto?: number }) {
  const [ref, ancho] = useAncho<HTMLDivElement>()
  const puntos = useMemo(() => {
    if (!ancho || valores.length < 2) return ""
    const max = Math.max(...valores, 1)
    const min = Math.min(...valores, 0)
    return valores.map((v, i) => `${(i / (valores.length - 1)) * (ancho - 6) + 3},${alto - 3 - ((v - min) / (max - min || 1)) * (alto - 6)}`).join(" ")
  }, [ancho, valores, alto])
  const ultimo = puntos.split(" ").pop()?.split(",").map(Number)
  return (
    <div ref={ref} className={cn("w-full", className)} style={{ height: alto }} aria-hidden>
      {ancho > 0 && puntos && (
        <svg width={ancho} height={alto}>
          <polyline points={puntos} fill="none" stroke="var(--acero)" strokeOpacity={0.55} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          {ultimo && <circle cx={ultimo[0]} cy={ultimo[1]} r={3} fill="var(--serie-1)" stroke="var(--card)" strokeWidth={2} />}
        </svg>
      )}
    </div>
  )
}

/** Barra 100 % apilada (partes de un total) con etiquetas debajo. */
export function BarraPartes({ partes, formato, titulo }: { partes: { nombre: string; valor: number; color: string }[]; formato: (n: number) => string; titulo: string }) {
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1
  const [ref, ancho] = useAncho<HTMLDivElement>()
  const inicios = partes.map((_, i) => (partes.slice(0, i).reduce((s, p) => s + p.valor, 0) / total) * ancho)
  return (
    <figure className="space-y-3">
      <div ref={ref} className="h-3">
        {ancho > 0 && (
          <svg width={ancho} height={12} role="img" aria-label={titulo}>
            {partes.map((p, i) => {
              const w = (p.valor / total) * ancho
              const x0 = inicios[i]
              const gap = i < partes.length - 1 ? 2 : 0
              return <rect key={p.nombre} x={x0} y={0} width={Math.max(0, w - gap)} height={12} rx={i === 0 || i === partes.length - 1 ? 4 : 0} fill={p.color}><title>{`${p.nombre}: ${formato(p.valor)}`}</title></rect>
            })}
          </svg>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        {partes.map((p) => (
          <li key={p.nombre} className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: p.color }} aria-hidden />
            <span className="truncate text-muted-foreground">{p.nombre}</span>
            <span className="num ml-auto font-medium">{formato(p.valor)}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

function Globo({ x, ancho, children }: { x: number; ancho: number; children: React.ReactNode }) {
  const derecha = x > ancho * 0.6
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-lg border border-linea bg-popover px-3 py-2 shadow-lg"
      style={derecha ? { right: ancho - x + 12 } : { left: x + 12 }}
    >
      {children}
    </div>
  )
}

function BotonTabla({ tabla, setTabla }: { tabla: boolean; setTabla: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => setTabla(!tabla)}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-pressed={tabla}
    >
      {tabla ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
      {tabla ? "Ver gráfico" : "Ver tabla"}
    </button>
  )
}

function TablaDatos({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: string[][] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-md border border-linea">
      <table className="w-full text-xs">
        <caption className="sr-only">{titulo}</caption>
        <thead className="sticky top-0 bg-superficie-2">
          <tr>
            {columnas.map((c, i) => (
              <th key={i} className={cn("px-2 py-1.5 font-medium text-muted-foreground", i ? "text-right" : "text-left")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-linea">
              {f.map((c, k) => (
                <td key={k} className={cn("px-2 py-1", k ? "num text-right" : "")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
