"use client"

import { useMemo } from "react"
import { CONTORNO_ARGENTINA } from "@/demo/geo-argentina"
import type { SucursalNegocio } from "@/dominio/negocio"
import { formatoPesosCorto } from "@/dominio/dinero"
import { cn } from "@/lib/utils"

/**
 * El mapa de sucursales: la grilla de puntos de la marca recortada con la forma de Argentina, y cada sucursal
 * como un punto cuadrado cuyo tamaño sigue sus ventas de hoy. Monocromo: la grilla en gris profundo, las
 * sucursales en blanco; la más fuerte de cada provincia, en el color de la empresa (su serie principal).
 */
const LAT_MIN = -55.2
const LAT_MAX = -21.6
const LNG_MIN = -73.8
const LNG_MAX = -53.4

function proyectar(lat: number, lng: number, ancho: number, alto: number) {
  // Equirrectangular corregida por la latitud media (≈ -38°): suficiente para un país.
  const k = Math.cos((38 * Math.PI) / 180)
  const w = (LNG_MAX - LNG_MIN) * k
  const h = LAT_MAX - LAT_MIN
  const escala = Math.min(ancho / w, alto / h)
  const dx = (ancho - w * escala) / 2
  const dy = (alto - h * escala) / 2
  return { x: dx + (lng - LNG_MIN) * k * escala, y: dy + (LAT_MAX - lat) * escala }
}

function adentro(x: number, y: number, anillos: { x: number; y: number }[][]) {
  let dentro = false
  for (const anillo of anillos) {
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const a = anillo[i]
      const b = anillo[j]
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro
    }
  }
  return dentro
}

export function MapaSucursales({
  sucursales,
  ventas,
  ancho = 300,
  alto = 520,
  paso = 7,
  destacada,
  onElegir,
  className,
}: {
  sucursales: SucursalNegocio[]
  ventas: number[]
  ancho?: number
  alto?: number
  paso?: number
  destacada?: number | null
  onElegir?: (i: number) => void
  className?: string
}) {
  const puntos = useMemo(() => {
    const anillos = CONTORNO_ARGENTINA.map((r) => r.map(([lng, lat]) => proyectar(lat, lng, ancho, alto)))
    const p: { x: number; y: number }[] = []
    for (let y = paso / 2; y < alto; y += paso) for (let x = paso / 2; x < ancho; x += paso) if (adentro(x, y, anillos)) p.push({ x, y })
    return p
  }, [ancho, alto, paso])
  const max = Math.max(1, ...ventas)
  const nodos = sucursales.map((s, i) => ({ ...proyectar(s.lat, s.lng, ancho, alto), i, s, v: ventas[i] ?? 0 }))
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className={cn("block", className)} role="img" aria-label={`Mapa con ${sucursales.length} sucursales`}>
      {puntos.map((p, i) => (
        <rect key={i} x={p.x - 1} y={p.y - 1} width={2} height={2} className="fill-gris-4" />
      ))}
      {nodos
        .sort((a, b) => a.v - b.v)
        .map(({ x, y, i, s, v }) => {
          const lado = 3 + Math.sqrt(v / max) * 7
          const activa = destacada === i
          return (
            <g key={s.id} className={onElegir ? "cursor-pointer" : undefined} onClick={() => onElegir?.(i)}>
              <title>{`${s.nombre} · ${s.provincia} · ${formatoPesosCorto(v)} hoy`}</title>
              <rect x={x - lado / 2} y={y - lado / 2} width={lado} height={lado} className={activa ? "fill-[var(--serie-1)]" : "fill-blanco"} fillOpacity={activa ? 1 : 0.55 + 0.45 * (v / max)} />
              {activa && <rect x={x - lado / 2 - 3} y={y - lado / 2 - 3} width={lado + 6} height={lado + 6} className="fill-none stroke-[var(--serie-1)]" strokeWidth={1} />}
            </g>
          )
        })}
    </svg>
  )
}
