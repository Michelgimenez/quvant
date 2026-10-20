"use client"

import { Sello } from "@/components/base/sellos"
import { ConQuvantDiscreto } from "@/components/marca/con-quvant"
import { EMPRESAS, type IdEmpresa, type ModuloDemo } from "@/demo/empresas"
import { cn } from "@/lib/utils"
import { ICONOS_DEMO } from "./iconos"
import { LogoEmpresa } from "./logo-empresa"

/**
 * La barra lateral de la empresa: su logo, su terminología y solo los módulos que tiene encendidos
 * (la forma de los flags es la de Organizacion.modulos). El color de la empresa va solo en su logo y en el
 * indicador del módulo activo. Cada item lleva un data-flip-id estable para reorganizarse al cambiar de empresa.
 */
export function LateralEmpresa({ empresa, modulo, onModulo }: { empresa: IdEmpresa; modulo: ModuloDemo; onModulo: (m: ModuloDemo) => void }) {
  const cfg = EMPRESAS[empresa]
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar" data-lateral>
      <div className="space-y-3 px-4 pb-3 pt-5">
        <div className="flex h-8 items-center" data-hueco-logo-lateral>
          <LogoEmpresa id={empresa} className="h-[24px]" />
        </div>
        <div className="flex items-center gap-2">
          <Sello titulo="Empresa ficticia con datos de demostración" />
          <span className="t-etiqueta truncate text-muted-foreground">{cfg.escalaTexto}</span>
        </div>
      </div>
      <nav className="sin-scrollbar flex-1 space-y-5 overflow-y-auto px-2 py-3" aria-label="Módulos">
        {cfg.navegacion.map((g) => (
          <div key={g.grupo} className="space-y-0.5" data-flip-id={`grupo-${g.grupo}`}>
            <p className="t-etiqueta px-2.5 pb-1.5 text-muted-foreground">{g.grupo}</p>
            {g.items
              .filter((i) => cfg.modulos[i.modulo])
              .map((i) => {
                const Icono = ICONOS_DEMO[i.icono]
                const activo = i.modulo === modulo
                return (
                  <button
                    key={i.modulo}
                    type="button"
                    onClick={() => onModulo(i.modulo)}
                    aria-current={activo ? "page" : undefined}
                    data-flip-id={`nav-${i.modulo}`}
                    data-testid={`modulo-${i.modulo}`}
                    className={cn(
                      "t-texto-sm relative flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left transition-colors",
                      activo ? "bg-sidebar-accent font-medium text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    {activo && <span className="absolute inset-y-2 left-0 w-[3px]" style={{ background: cfg.color }} aria-hidden data-flip-id="nav-activo" />}
                    <Icono className="size-4 shrink-0" />
                    <span className="truncate">{i.nombre}</span>
                  </button>
                )
              })}
          </div>
        ))}
      </nav>
      <div className="space-y-3 border-t border-sidebar-border px-4 py-3">
        <div className="min-w-0">
          <p className="t-texto-sm truncate font-medium">{cfg.responsable.nombre}</p>
          <p className="t-etiqueta truncate text-muted-foreground">{cfg.responsable.rol}</p>
        </div>
        <ConQuvantDiscreto />
      </div>
    </aside>
  )
}
