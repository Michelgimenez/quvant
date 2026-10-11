"use client"

import { createStore, useStore } from "zustand"
import { createContext, useContext } from "react"
import type { Id } from "@/dominio/tipos"
import type { Pieza } from "@/forja/dominio/pieza"
import type { TipoZona } from "@/forja/dominio/plano"
import type { Velocidad } from "@/forja/dominio/repeticion"

/**
 * Estado de la escena de Forja (no los datos: esos vienen de la fuente).
 * Un store por universo montado (app, demo pública), vía contexto.
 */
export type VistaRed = "mapa" | "constelacion"
export type Nivel = "red" | "taller" | "pieza"

/** Repetición del día: el cursor de la interfaz se actualiza unas 8 veces por segundo. */
export type Repeticion = { activa: boolean; reproduciendo: boolean; velocidad: Velocidad; cursor: number }

export type EstadoEscena = {
  nivel: Nivel
  vista: VistaRed
  sucursalId: Id | null
  /** Nodo bajo el cursor o con foco de teclado (tarjeta). */
  resaltado: Id | null
  transferenciaId: Id | null
  /** Zona del taller seleccionada (panel lateral); `id` elige un rack o una orden dentro de la zona. */
  zona: { tipo: TipoZona; id: string | null } | null
  /** Zona bajo el cursor o con foco (contorno --temple). */
  zonaResaltada: TipoZona | null
  /** Rack bajo el cursor (tooltip con productos y cantidades). */
  rackResaltado: string | null
  /** Producto o máquina del nivel 3. */
  pieza: Pieza | null
  /** Transición en curso entre niveles (bloquea la entrada). */
  transicion: null | "entrando" | "saliendo"
  repeticion: Repeticion
  /**
   * Hora que muestra la escena, cuadro a cuadro (null = en vivo). Es mutable a
   * propósito: el mapa la lee en cada cuadro sin provocar renders de React.
   */
  reloj: { t: number | null }
  /** Modo sala de control (pantalla completa, recorrido y titulares). */
  sala: boolean
  setVista: (v: VistaRed) => void
  resaltar: (id: Id | null) => void
  elegirTransferencia: (id: Id | null) => void
  entrarSucursal: (id: Id) => void
  volverARed: () => void
  setTransicion: (t: EstadoEscena["transicion"]) => void
  elegirZona: (z: EstadoEscena["zona"]) => void
  resaltarZona: (z: TipoZona | null) => void
  resaltarRack: (id: string | null) => void
  repetir: (desde: number) => void
  setRepeticion: (r: Partial<Repeticion>) => void
  salirDeRepeticion: () => void
  setSala: (sala: boolean) => void
  verPieza: (p: EstadoEscena["pieza"]) => void
}

export function crearStoreEscena() {
  return createStore<EstadoEscena>()((set) => ({
    nivel: "red",
    vista: "mapa",
    sucursalId: null,
    resaltado: null,
    transferenciaId: null,
    zona: null,
    zonaResaltada: null,
    rackResaltado: null,
    pieza: null,
    transicion: null,
    repeticion: { activa: false, reproduciendo: false, velocidad: 1200, cursor: 0 },
    reloj: { t: null },
    sala: false,
    setVista: (vista) => set({ vista, transferenciaId: null }),
    resaltar: (resaltado) => set({ resaltado }),
    elegirTransferencia: (transferenciaId) => set({ transferenciaId }),
    entrarSucursal: (sucursalId) => set({ nivel: "taller", sucursalId, resaltado: null, transferenciaId: null, zona: null, zonaResaltada: null, rackResaltado: null }),
    volverARed: () => set({ nivel: "red", zona: null, zonaResaltada: null, rackResaltado: null, pieza: null }),
    setTransicion: (transicion) => set({ transicion }),
    elegirZona: (zona) => set({ zona, rackResaltado: null }),
    resaltarZona: (zonaResaltada) => set({ zonaResaltada }),
    resaltarRack: (rackResaltado) => set({ rackResaltado }),
    repetir: (desde) =>
      set((s) => {
        s.reloj.t = desde
        return { repeticion: { ...s.repeticion, activa: true, reproduciendo: true, cursor: desde }, transferenciaId: null }
      }),
    setRepeticion: (r) => set((s) => ({ repeticion: { ...s.repeticion, ...r } })),
    salirDeRepeticion: () =>
      set((s) => {
        s.reloj.t = null
        return { repeticion: { ...s.repeticion, activa: false, reproduciendo: false } }
      }),
    setSala: (sala) =>
      set((s) => {
        if (sala) s.reloj.t = null
        return { sala, resaltado: null, transferenciaId: null, repeticion: sala ? { ...s.repeticion, activa: false, reproduciendo: false } : s.repeticion }
      }),
    verPieza: (pieza) =>
      set((s) => {
        // La pieza se ve sobre el mapa y en el presente: sin repetición ni transferencia elegida
        if (pieza) s.reloj.t = null
        return { pieza, nivel: pieza ? "pieza" : "red", resaltado: null, transferenciaId: null, repeticion: pieza ? { ...s.repeticion, activa: false, reproduciendo: false } : s.repeticion }
      }),
  }))
}

export type StoreEscena = ReturnType<typeof crearStoreEscena>
export const ContextoEscena = createContext<StoreEscena | null>(null)

export function useEscenaForja<T>(selector: (s: EstadoEscena) => T): T {
  const store = useContext(ContextoEscena)
  if (!store) throw new Error("Falta el store de la escena de Forja")
  return useStore(store, selector)
}
