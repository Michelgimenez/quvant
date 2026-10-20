"use client"

import Link from "next/link"
import { ChevronDown, Play, RotateCcw } from "lucide-react"
import { Firma } from "@/components/marca/quvant"
import { Sello } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { EMPRESAS, EMPRESAS_ORDEN, type IdEmpresa } from "@/demo/empresas"
import { cn } from "@/lib/utils"
import { LogoEmpresa } from "./logo-empresa"

/**
 * La barra de la demo: fina y siempre presente. La firma de Quvant, "Estás viendo: [empresa] · DEMO",
 * el selector de empresas, el recorrido guiado y reiniciar. Siempre en oscuro: es de Quvant, no de la empresa.
 */
export function BarraDemo({
  empresa,
  selectorAbierto,
  onSelector,
  onRecorrido,
  onReiniciar,
  recorridoActivo,
}: {
  empresa: IdEmpresa
  selectorAbierto: boolean
  onSelector: () => void
  onRecorrido: () => void
  onReiniciar: () => void
  recorridoActivo: boolean
}) {
  const cfg = EMPRESAS[empresa]
  return (
    <header className="dark relative z-40 flex h-12 shrink-0 items-center gap-5 border-b border-gris-3 bg-negro pl-4 pr-2 text-blanco" data-barra-demo>
      <Link href="/" aria-label="Quvant, inicio" className="shrink-0">
        <Firma alto={17} version="principal" />
      </Link>
      <span className="h-5 w-px bg-gris-3" aria-hidden />
      <button
        type="button"
        onClick={onSelector}
        aria-expanded={selectorAbierto}
        aria-controls="selector-empresas"
        className={cn("group flex h-9 min-w-0 items-center gap-3 rounded-md border px-3 transition-colors", selectorAbierto ? "border-gris-5 bg-gris-2" : "border-transparent hover:border-gris-4 hover:bg-gris-1")}
        data-testid="abrir-selector"
      >
        <span className="t-etiqueta text-acero">Estás viendo</span>
        <span className="flex min-w-0 items-center gap-2" data-flip-id="barra-empresa">
          <LogoEmpresa id={empresa} className="h-[13px]" />
          <span className="t-texto-sm truncate text-blanco">{cfg.nombre}</span>
        </span>
        <Sello />
        <span className="flex items-center gap-1" aria-hidden>
          {EMPRESAS_ORDEN.map((id) => (
            <span key={id} className={cn("size-[5px] transition-colors", id === empresa ? "bg-blanco" : "bg-gris-5")} />
          ))}
        </span>
        <ChevronDown className={cn("size-4 text-acero transition-transform", selectorAbierto && "rotate-180")} />
        <Kbd className="hidden lg:inline-flex">⌘E</Kbd>
      </button>
      <span className="ml-auto" />
      <Button size="sm" variant="ghost" onClick={onRecorrido} aria-pressed={recorridoActivo} data-testid="recorrido-guiado">
        <Play /> {recorridoActivo ? "Recorriendo…" : "Recorrido guiado"}
      </Button>
      <Button size="sm" variant="ghost" onClick={onReiniciar} data-testid="reiniciar-demo">
        <RotateCcw /> Reiniciar
      </Button>
    </header>
  )
}
