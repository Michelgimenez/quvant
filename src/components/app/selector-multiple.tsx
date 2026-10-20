"use client"

import { Check, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** Selector de varias opciones con búsqueda (marcas, categorías, proveedores). */
export function SelectorMultiple({
  etiqueta,
  opciones,
  valor,
  onCambio,
  className,
}: {
  etiqueta: string
  opciones: { id: string; nombre: string; detalle?: string }[]
  valor: string[]
  onCambio: (ids: string[]) => void
  className?: string
}) {
  const elegidas = opciones.filter((o) => valor.includes(o.id))
  return (
    <div className={cn("space-y-1.5", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 w-full justify-between font-normal" aria-label={etiqueta}>
            <span className="truncate text-left">
              {elegidas.length === 0 ? <span className="text-muted-foreground">{etiqueta}: todas</span> : elegidas.length <= 2 ? elegidas.map((x) => x.nombre).join(", ") : `${etiqueta}: ${elegidas.length}`}
            </span>
            <ChevronDown className="opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={`Buscar ${etiqueta.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {opciones.map((o) => {
                  const sel = valor.includes(o.id)
                  return (
                    <CommandItem key={o.id} value={o.nombre} onSelect={() => onCambio(sel ? valor.filter((x) => x !== o.id) : [...valor, o.id])}>
                      <span className={cn("flex size-4 items-center justify-center rounded border", sel ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                        {sel && <Check className="size-3" />}
                      </span>
                      <span className="flex-1 truncate">{o.nombre}</span>
                      {o.detalle && <span className="t-texto-sm text-muted-foreground">{o.detalle}</span>}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {elegidas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {elegidas.map((o) => (
            <button key={o.id} type="button" onClick={() => onCambio(valor.filter((x) => x !== o.id))} className="inline-flex items-center gap-1 rounded-full border border-linea bg-superficie-2 px-2 py-0.5 t-texto-sm hover:border-acero/50" aria-label={`Quitar ${o.nombre}`}>
              {o.nombre}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
