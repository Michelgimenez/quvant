"use client"

import { createStore, useStore } from "zustand"
import { createContext, useContext } from "react"
import type { Id } from "@/dominio/tipos"

/**
 * Estado de la escena de Forja (no los datos: esos vienen de la fuente).
 * Un store por universo montado (app, demo pública), vía contexto.
 */
export type VistaRed = "mapa" | "constelacion"
export type Nivel = "red" | "taller" | "pieza"

export type EstadoEscena = {
  nivel: Nivel
  vista: VistaRed
  sucursalId: Id | null
  /** Nodo bajo el cursor o con foco de teclado (tarjeta). */
  resaltado: Id | null
  transferenciaId: Id | null
  /** Zona del taller seleccionada (panel lateral). */
  zona: { tipo: "mostrador" | "deposito" | "servicio" | "muelle"; id: string } | null
  /** Producto o máquina del nivel 3. */
  pieza: { tipo: "producto" | "maquina"; id: Id } | null
  /** Transición en curso entre niveles (bloquea la entrada). */
  transicion: null | "entrando" | "saliendo"
  setVista: (v: VistaRed) => void
  resaltar: (id: Id | null) => void
  elegirTransferencia: (id: Id | null) => void
  entrarSucursal: (id: Id) => void
  volverARed: () => void
  setTransicion: (t: EstadoEscena["transicion"]) => void
  elegirZona: (z: EstadoEscena["zona"]) => void
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
    pieza: null,
    transicion: null,
    setVista: (vista) => set({ vista, transferenciaId: null }),
    resaltar: (resaltado) => set({ resaltado }),
    elegirTransferencia: (transferenciaId) => set({ transferenciaId }),
    entrarSucursal: (sucursalId) => set({ nivel: "taller", sucursalId, resaltado: null, transferenciaId: null, zona: null }),
    volverARed: () => set({ nivel: "red", zona: null, pieza: null }),
    setTransicion: (transicion) => set({ transicion }),
    elegirZona: (zona) => set({ zona }),
    verPieza: (pieza) => set({ pieza, nivel: pieza ? "pieza" : "red" }),
  }))
}

export type StoreEscena = ReturnType<typeof crearStoreEscena>
export const ContextoEscena = createContext<StoreEscena | null>(null)

export function useEscenaForja<T>(selector: (s: EstadoEscena) => T): T {
  const store = useContext(ContextoEscena)
  if (!store) throw new Error("Falta el store de la escena de Forja")
  return useStore(store, selector)
}
