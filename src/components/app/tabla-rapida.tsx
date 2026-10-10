"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

export type Columna<T> = {
  id: string
  encabezado: string
  celda: (fila: T) => React.ReactNode
  /** Valor para ordenar (si falta, la columna no ordena). */
  orden?: (fila: T) => string | number
  ancho?: string
  alinear?: "izq" | "der" | "centro"
  /** Se oculta en pantallas chicas. */
  ocultarMovil?: boolean
}

/**
 * Tabla rápida: virtualizada (miles de filas sin trabarse), ordenable,
 * navegable con flechas y Enter. En el celular cada fila es una tarjeta.
 */
export function TablaRapida<T>({
  filas,
  columnas,
  clave,
  onElegir,
  alto = 560,
  altoFila = 52,
  vacio,
  tarjeta,
  etiqueta,
  ordenInicial,
}: {
  filas: T[]
  columnas: Columna<T>[]
  clave: (fila: T) => string
  onElegir?: (fila: T) => void
  alto?: number | string
  altoFila?: number
  vacio?: React.ReactNode
  /** Render de la fila como tarjeta en celular. */
  tarjeta?: (fila: T) => React.ReactNode
  etiqueta: string
  ordenInicial?: { id: string; asc: boolean }
}) {
  const [orden, setOrden] = useState<{ id: string; asc: boolean } | null>(ordenInicial ?? null)
  const [activa, setActiva] = useState(-1)
  const contenedor = useRef<HTMLDivElement>(null)

  const ordenadas = useMemo(() => {
    if (!orden) return filas
    const col = columnas.find((c) => c.id === orden.id)
    if (!col?.orden) return filas
    const f = col.orden
    return [...filas].sort((a, b) => {
      const x = f(a)
      const y = f(b)
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es")
      return orden.asc ? r : -r
    })
  }, [filas, orden, columnas])

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual devuelve funciones no memoizables; es el uso documentado
  const virtual = useVirtualizer({
    count: ordenadas.length,
    getScrollElement: () => contenedor.current,
    estimateSize: () => altoFila,
    overscan: 12,
  })

  useEffect(() => {
    if (activa >= 0) virtual.scrollToIndex(activa, { align: "auto" })
  }, [activa, virtual])

  const plantilla = columnas.map((c) => c.ancho ?? "minmax(0,1fr)").join(" ")

  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiva((a) => Math.min(ordenadas.length - 1, a + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiva((a) => Math.max(0, a - 1))
    } else if (e.key === "Enter" && activa >= 0 && onElegir) {
      e.preventDefault()
      onElegir(ordenadas[activa])
    }
  }

  if (ordenadas.length === 0) return <>{vacio}</>

  return (
    <div className="overflow-hidden rounded-xl border border-linea bg-card">
      <div role="table" aria-label={etiqueta} aria-rowcount={ordenadas.length} className="text-sm">
        <div role="rowgroup" className={cn("hidden border-b border-linea bg-superficie-2 md:block")}>
          <div role="row" className="grid items-center gap-3 px-4 py-2" style={{ gridTemplateColumns: plantilla }}>
            {columnas.map((c) => (
              <div
                key={c.id}
                role="columnheader"
                aria-sort={orden?.id === c.id ? (orden.asc ? "ascending" : "descending") : undefined}
                className={cn("text-xs font-medium text-muted-foreground", c.alinear === "der" && "text-right", c.alinear === "centro" && "text-center")}
              >
                {c.orden ? (
                  <button
                    type="button"
                    className={cn("inline-flex items-center gap-1 hover:text-foreground", c.alinear === "der" && "flex-row-reverse")}
                    onClick={() => setOrden((o) => (o?.id === c.id ? { id: c.id, asc: !o.asc } : { id: c.id, asc: c.alinear !== "der" }))}
                  >
                    {c.encabezado}
                    {orden?.id === c.id && (orden.asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </button>
                ) : (
                  c.encabezado
                )}
              </div>
            ))}
          </div>
        </div>
        <div
          ref={contenedor}
          role="rowgroup"
          tabIndex={0}
          onKeyDown={tecla}
          onFocus={() => activa < 0 && setActiva(0)}
          className="overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          style={{ height: typeof alto === "number" ? Math.min(alto, ordenadas.length * altoFila + 2) : alto }}
        >
          <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
            {virtual.getVirtualItems().map((v) => {
              const fila = ordenadas[v.index]
              return (
                <div
                  key={clave(fila)}
                  role="row"
                  aria-rowindex={v.index + 1}
                  aria-selected={activa === v.index}
                  onClick={() => {
                    setActiva(v.index)
                    onElegir?.(fila)
                  }}
                  className={cn(
                    "absolute inset-x-0 border-b border-linea/70 px-4",
                    onElegir && "cursor-pointer hover:bg-muted/50",
                    activa === v.index && "bg-muted/70",
                  )}
                  style={{ top: 0, transform: `translateY(${v.start}px)`, height: v.size }}
                >
                  <div className={cn("hidden h-full items-center gap-3 md:grid")} style={{ gridTemplateColumns: plantilla }}>
                    {columnas.map((c) => (
                      <div key={c.id} role="cell" className={cn("min-w-0", c.alinear === "der" && "text-right", c.alinear === "centro" && "text-center")}>
                        {c.celda(fila)}
                      </div>
                    ))}
                  </div>
                  <div className="flex h-full items-center md:hidden">{tarjeta ? tarjeta(fila) : columnas[0].celda(fila)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-linea px-4 py-2 text-xs text-muted-foreground">
        <span>{ordenadas.length.toLocaleString("es-AR")} filas</span>
        <span className="hidden sm:inline">↑ ↓ para moverte · Enter para abrir</span>
      </div>
    </div>
  )
}
