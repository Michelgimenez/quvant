"use client"

import { useRef, useState } from "react"
import { Sello } from "@/components/base/sellos"
import type { Id } from "@/dominio/tipos"
import { PARADAS_CALOR, colorCalor } from "@/forja/dominio/calor"
import type { FuenteForja } from "@/forja/datos/fuente"
import { cn } from "@/lib/utils"
import { MarcaForja } from "./marca-forja"
import { UniversoRed, type ControlRed } from "./red/universo-red"
import { ContextoEscena, crearStoreEscena, useEscenaForja, type VistaRed } from "./store"

/**
 * El universo del taller: la misma escena para la app y para las demos
 * públicas. Recibe los datos ya armados (FuenteForja) y maneja la escena.
 */
export function Universo({ fuente, alEntrar }: { fuente: FuenteForja; alEntrar?: (id: Id) => void }) {
  const [store] = useState(crearStoreEscena)
  return (
    <ContextoEscena.Provider value={store}>
      <Escena fuente={fuente} alEntrar={alEntrar} />
    </ContextoEscena.Provider>
  )
}

function Escena({ fuente, alEntrar }: { fuente: FuenteForja; alEntrar?: (id: Id) => void }) {
  const control = useRef<ControlRed | null>(null)
  const { red } = fuente
  const enTransito = red.transferencias.filter((t) => t.estado === "en_transito").length
  const ventasHoy = red.nodos.reduce((a, n) => a + n.ventasHoy, 0)
  return (
    <div className="relative flex h-full flex-col bg-hierro text-niebla">
      <header className="relative z-10 flex flex-wrap items-center gap-3 border-b border-white/10 bg-hierro/80 px-4 py-2.5 backdrop-blur">
        <MarcaForja tamano={22} />
        <div className="flex items-center gap-2">
          {fuente.propuesta && <Sello texto="PROPUESTA" titulo="Propuesta comercial: no es un cliente activo" />}
          {red.org.esDemo && !fuente.propuesta && <Sello />}
          {fuente.simulacion && <Sello texto="SIMULACIÓN" titulo="Eventos generados para la demostración" />}
        </div>
        <span className="hidden font-mono text-[11px] text-acero md:inline">
          {red.nodos.length} {red.nodos.length === 1 ? "sucursal" : "sucursales"} · {enTransito} en tránsito · <span data-testid="ventas-hoy-total">{ventasHoy}</span> ventas hoy
        </span>
        <div className="ml-auto flex items-center gap-3">
          <LeyendaCalor />
          <SelectorVista />
        </div>
      </header>
      <div className="relative flex-1">
        <UniversoRed red={red} eventos={fuente.eventos} controlRef={control} onEntrar={alEntrar} />
      </div>
    </div>
  )
}

function SelectorVista() {
  const vista = useEscenaForja((s) => s.vista)
  const setVista = useEscenaForja((s) => s.setVista)
  const opciones: [VistaRed, string][] = [
    ["mapa", "Mapa"],
    ["constelacion", "Constelación"],
  ]
  return (
    <div className="flex rounded-lg border border-white/10 p-0.5" role="group" aria-label="Vista de la red">
      {opciones.map(([v, nombre]) => (
        <button
          key={v}
          type="button"
          aria-pressed={vista === v}
          onClick={() => setVista(v)}
          className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple", vista === v ? "bg-white/12 text-niebla" : "text-acero hover:text-niebla")}
          data-testid={`vista-${v}`}
        >
          {nombre}
        </button>
      ))}
    </div>
  )
}

/** Escala de calor: de frío a blanco caliente (relativa al promedio de cada sucursal). */
function LeyendaCalor() {
  const pasos = 24
  const max = PARADAS_CALOR[PARADAS_CALOR.length - 1].calor
  const degradado = Array.from({ length: pasos + 1 }, (_, i) => colorCalor((i / pasos) * max)).join(", ")
  return (
    <div className="hidden items-center gap-2 lg:flex" aria-label="Escala de calor: de frío a blanco caliente">
      <span className="font-mono text-[10px] uppercase tracking-widest text-acero">frío</span>
      <span className="h-1.5 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${degradado})` }} aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-widest text-acero">pico</span>
    </div>
  )
}
