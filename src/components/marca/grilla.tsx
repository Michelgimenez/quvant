import { useId } from "react"
import { cn } from "@/lib/utils"
import { arcoDeSalto, fasesDelSalto, largoRecorrido, puntoEnArco, trazoDeArco } from "./salto-geometria"

/**
 * La grilla de puntos (manual, pág. 11): gris profundo sobre negro, de fondo en portadas, el sitio,
 * las presentaciones y los estados vacíos. En el modo claro no hay grilla (el token es transparente).
 * Es una capa: va dentro de un contenedor con `relative`.
 */
export function Grilla({ paso = 28, className }: { paso?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("grilla-puntos pointer-events-none absolute inset-0", className)}
      style={{ "--grilla-paso": `${paso}px` } as React.CSSProperties}
    />
  )
}

type Celda = { columna: number; fila: number }

/**
 * El salto sobre la grilla, dibujado según `progreso` (0 a 1), sin reloj propio: lo anima quien lo usa
 * (GSAP en la app, el cuadro en la filmación) o se muestra quieto en un paso (la lámina).
 */
export function SaltoEnGrilla({
  columnas,
  filas,
  paso = 28,
  desde,
  hasta,
  progreso,
  className,
  conGrilla = true,
}: {
  columnas: number
  filas: number
  paso?: number
  desde: Celda
  hasta: Celda
  progreso: number
  className?: string
  conGrilla?: boolean
}) {
  const id = useId()
  const centro = (c: Celda) => ({ x: (c.columna + 0.5) * paso, y: (c.fila + 0.5) * paso })
  const a = centro(desde)
  const b = centro(hasta)
  const arco = arcoDeSalto(a, b)
  const { despegue, vuelo } = fasesDelSalto(progreso)
  const enVuelo = progreso > 0.15
  const cuadrado = puntoEnArco(arco, vuelo)
  const lado = paso * 0.42
  const radioPunto = Math.max(1.2, paso * 0.06)
  const trazo = trazoDeArco(arco)

  return (
    <svg
      viewBox={`0 0 ${columnas * paso} ${filas * paso}`}
      className={cn("block", className)}
      aria-hidden
    >
      {conGrilla &&
        Array.from({ length: filas }, (_, f) =>
          Array.from({ length: columnas }, (_, c) => {
            if (c === desde.columna && f === desde.fila) return null
            return <circle key={`${c}-${f}`} cx={(c + 0.5) * paso} cy={(f + 0.5) * paso} r={radioPunto} className="fill-profundo" />
          }),
        )}

      {/* El punto que se va: primero se enciende, después queda el aro hueco donde estaba */}
      <circle
        cx={a.x}
        cy={a.y}
        r={radioPunto + (paso * 0.16 - radioPunto) * despegue}
        className={despegue > 0 ? "fill-none stroke-acero" : "fill-acero"}
        strokeWidth={despegue > 0 ? 1.5 : 0}
      />

      {/* El arco punteado, que se traza detrás del cuadrado */}
      <mask id={`${id}-trazo`} maskUnits="userSpaceOnUse">
        <path
          d={trazo}
          fill="none"
          stroke="white"
          strokeWidth={6}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - largoRecorrido(arco, vuelo)}
        />
      </mask>
      {enVuelo && (
        <path
          d={trazo}
          fill="none"
          className="stroke-blanco"
          strokeOpacity={0.85}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeDasharray={`0 ${paso * 0.2}`}
          mask={`url(#${id}-trazo)`}
        />
      )}

      {/* El punto cuadrado del logo, que salta y cae adelante */}
      {enVuelo && (
        <rect
          x={-lado / 2}
          y={-lado / 2}
          width={lado}
          height={lado}
          className="fill-blanco"
          style={{ transform: `translate(${cuadrado.x}px, ${cuadrado.y}px)` }}
        />
      )}
    </svg>
  )
}
