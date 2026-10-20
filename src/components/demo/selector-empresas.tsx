"use client"

import { Grilla } from "@/components/marca/grilla"
import { Sello } from "@/components/base/sellos"
import { EMPRESAS, EMPRESAS_ORDEN, type IdEmpresa } from "@/demo/empresas"
import { cn } from "@/lib/utils"
import { LogoEmpresa } from "./logo-empresa"

/**
 * El selector: cuatro tarjetas sobre la grilla de puntos, de la más chica a la más grande. Cada una con su logo,
 * su rubro y su escala. El punto de cada tarjeta (data-punto-empresa) es de donde sale y adonde cae el salto
 * al cambiar de empresa (tanda 4).
 */
export function SelectorEmpresas({ empresa, onElegir, abierto }: { empresa: IdEmpresa; onElegir: (id: IdEmpresa) => void; abierto: boolean }) {
  return (
    <div
      id="selector-empresas"
      role="dialog"
      aria-label="Elegir empresa de la demo"
      aria-hidden={!abierto}
      inert={!abierto}
      className="dark invisible absolute inset-x-0 top-0 z-30 overflow-hidden border-b border-gris-3 bg-negro text-blanco opacity-0"
      data-selector
      data-abierto={abierto || undefined}
    >
      <Grilla paso={24} />
      <div className="relative mx-auto grid max-w-[1320px] grid-cols-4 gap-3 px-6 pb-6 pt-5">
        <p className="t-etiqueta col-span-4 flex items-center justify-between text-acero">
          <span>El mismo Quvant, en cuatro negocios · del más chico al más grande</span>
          <span className="text-gris-7">Teclas 1 a 4 · ⌘E para abrir y cerrar</span>
        </p>
        {EMPRESAS_ORDEN.map((id, i) => {
          const cfg = EMPRESAS[id]
          const activa = id === empresa
          return (
            <button
              key={id}
              type="button"
              onClick={() => onElegir(id)}
              aria-pressed={activa}
              data-tarjeta-empresa={id}
              data-testid={`tarjeta-${id}`}
              className={cn(
                "group relative flex h-[168px] flex-col justify-between border bg-negro p-4 text-left transition-colors",
                activa ? "border-gris-8" : "border-gris-3 hover:border-gris-5",
              )}
            >
              <span className="flex items-start justify-between">
                <span className="flex h-7 items-center" data-hueco-logo={id}>
                  <LogoEmpresa id={id} className="h-[22px]" />
                </span>
                <span className="t-dato text-gris-7">{i + 1}</span>
              </span>
              <span className="space-y-1">
                <span className="t-texto-sm block text-blanco">{cfg.nombre}</span>
                <span className="t-texto-sm block text-acero">{cfg.rubro}</span>
              </span>
              <span className="flex items-center justify-between">
                <span className="t-etiqueta flex items-center gap-2 text-blanco">
                  <span data-punto-empresa={id} className={cn("inline-block size-[9px]", activa ? "bg-blanco" : "bg-gris-5 group-hover:bg-gris-8")} />
                  {cfg.escalaTexto}
                </span>
                <Sello />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
