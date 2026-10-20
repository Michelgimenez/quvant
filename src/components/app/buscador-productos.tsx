"use client"

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react"
import { ScanBarcode, Search } from "lucide-react"
import { useDatos } from "@/cliente/app-contexto"
import { MiniaturaProducto } from "@/components/base/ilustracion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { buscarProductos, ejemplosEscaneo } from "@/dominio/busqueda"
import { formatoCantidad, formatoPesos } from "@/dominio/dinero"
import { claveStock, precioDe } from "@/dominio/estado"
import type { Id, Producto } from "@/dominio/tipos"
import { cn } from "@/lib/utils"
import { EscanerCodigo } from "./escaner"

export type BuscadorRef = { enfocar: () => void }

/**
 * Buscador de productos con teclado: escribí, ↑ ↓ y Enter. Un código de barras
 * exacto (lector USB o cámara) agrega directo, sin elegir de la lista.
 */
export const BuscadorProductos = forwardRef<
  BuscadorRef,
  {
    onElegir: (p: Producto) => void
    sucursalId?: Id
    listaId?: Id
    placeholder?: string
    autoFocus?: boolean
    className?: string
  }
>(function BuscadorProductos({ onElegir, sucursalId, listaId, placeholder = "Buscar por nombre, SKU o código…", autoFocus, className }, ref) {
  const { e, v } = useDatos()
  const [texto, setTexto] = useState("")
  const [activo, setActivo] = useState(0)
  const [abierto, setAbierto] = useState(false)
  const [escaner, setEscaner] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => ({ enfocar: () => input.current?.focus() }))

  const resultados = useMemo(() => buscarProductos(e, texto, 12), [texto, v]) // eslint-disable-line react-hooks/exhaustive-deps

  const elegir = (p: Producto) => {
    onElegir(p)
    setTexto("")
    setActivo(0)
    setAbierto(false)
    input.current?.focus()
  }

  const elegirPorCodigo = (codigo: string) => {
    const [p] = buscarProductos(e, codigo, 1)
    if (p) elegir(p)
    else {
      setTexto(codigo)
      setAbierto(true)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={input}
            value={texto}
            autoFocus={autoFocus}
            onChange={(ev) => {
              setTexto(ev.target.value)
              setActivo(0)
              setAbierto(true)
            }}
            onFocus={() => setAbierto(true)}
            onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
            onKeyDown={(ev) => {
              if (ev.key === "ArrowDown") {
                ev.preventDefault()
                setActivo((a) => Math.min(resultados.length - 1, a + 1))
              } else if (ev.key === "ArrowUp") {
                ev.preventDefault()
                setActivo((a) => Math.max(0, a - 1))
              } else if (ev.key === "Enter") {
                ev.preventDefault()
                if (resultados[activo]) elegir(resultados[activo])
              } else if (ev.key === "Escape") {
                setTexto("")
                setAbierto(false)
              }
            }}
            placeholder={placeholder}
            className="h-11 pl-9 t-texto"
            role="combobox"
            aria-expanded={abierto && resultados.length > 0}
            aria-controls="resultados-productos"
            aria-autocomplete="list"
            aria-label="Buscar producto"
            data-testid="buscador-productos"
          />
        </div>
        <Button type="button" variant="outline" size="icon-lg" className="size-11" onClick={() => setEscaner(true)} aria-label="Escanear con la cámara">
          <ScanBarcode />
        </Button>
      </div>
      {abierto && resultados.length > 0 && (
        <ul id="resultados-productos" role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-96 overflow-auto rounded-lg border border-linea bg-popover p-1 shadow-xl">
          {resultados.map((p, i) => {
            const st = sucursalId ? e.stock[claveStock(sucursalId, p.id)]?.cantidad : undefined
            return (
              <li
                key={p.id}
                role="option"
                aria-selected={i === activo}
                onMouseDown={(ev) => {
                  ev.preventDefault()
                  elegir(p)
                }}
                onMouseEnter={() => setActivo(i)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5", i === activo && "bg-muted")}
              >
                <MiniaturaProducto tipo={p.ilustracion} className="size-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate t-texto-sm">{p.nombre}</span>
                  <span className="ficha block truncate">{p.sku}</span>
                </span>
                {st !== undefined && (
                  <span className={cn("num t-texto-sm", st <= 0 ? "text-error" : "text-muted-foreground")}>{st <= 0 ? "sin stock" : `${formatoCantidad(st)} u.`}</span>
                )}
                {listaId && <span className="t-dato font-semibold">{formatoPesos(precioDe(e, listaId, p.id), { sinDecimales: true })}</span>}
              </li>
            )
          })}
        </ul>
      )}
      <EscanerCodigo abierto={escaner} onAbierto={setEscaner} onDetectar={elegirPorCodigo} ejemplos={e.org.esDemo ? ejemplosEscaneo(e) : []} />
    </div>
  )
})
