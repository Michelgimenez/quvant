/**
 * Lo que hace el visitante en la demo (ventas, fiados, caja, cobranzas, aprobaciones), guardado en su navegador.
 * Nunca se guardan los datos generados: esos salen de la semilla. Reglas (prompt, 5.1):
 * - zustand con persist, `skipHydration` y `rehydrate()` al montar, `version` y `partialize`;
 * - la dirección manda sobre lo guardado: `?empresa=` pisa la última empresa vista;
 * - "Reiniciar demo" borra todo lo del visitante.
 * Nada de esto sale del navegador: la demo pública no lee ni escribe la base.
 */
import { createStore } from "zustand/vanilla"
import { createJSONStorage, persist } from "zustand/middleware"
import type { Centavos } from "@/dominio/tipos"
import type { MedioPago } from "@/dominio/negocio"
import { EMPRESAS_ORDEN, esIdEmpresa, type IdEmpresa } from "./empresas"

export type VentaVisitante = { id: string; t: number; monto: Centavos; items: { productoId: string; nombre: string; cantidad: number; precio: Centavos }[]; medio: MedioPago; clienteId?: string; sinConexion: boolean; sincronizada: boolean }
export type FiadoVisitante = { id: string; t: number; clienteId: string; monto: Centavos; detalle: string; tipo: "fiado" | "pago" }
export type CierreCaja = { t: number; esperado: Centavos; contado: Centavos }
export type CobranzaVisitante = { id: string; t: number; clienteId: string; monto: Centavos }
export type AprobacionVisitante = { id: string; nivel1?: number; nivel2?: number; rechazada?: number }
export type MovimientoVisitante = { id: string; t: number; tipo: "presupuesto-venta" | "transferencia" | "servicio" | "pedido"; detalle: string; monto: Centavos; ref?: string }

export type AccionesEmpresa = {
  ventas: VentaVisitante[]
  fiados: FiadoVisitante[]
  cierre: CierreCaja | null
  cobranzas: CobranzaVisitante[]
  aprobaciones: AprobacionVisitante[]
  movimientos: MovimientoVisitante[]
}

const vacias = (): AccionesEmpresa => ({ ventas: [], fiados: [], cierre: null, cobranzas: [], aprobaciones: [], movimientos: [] })
const todasVacias = () => Object.fromEntries(EMPRESAS_ORDEN.map((id) => [id, vacias()])) as Record<IdEmpresa, AccionesEmpresa>

export type EstadoDemo = {
  empresa: IdEmpresa
  porEmpresa: Record<IdEmpresa, AccionesEmpresa>
  /** El interruptor "cortar la conexión" del kiosco (no se guarda: al volver, hay conexión). */
  sinConexion: boolean
  elegirEmpresa: (id: IdEmpresa) => void
  registrar: <K extends keyof AccionesEmpresa>(id: IdEmpresa, clave: K, valor: AccionesEmpresa[K] extends (infer T)[] ? T : AccionesEmpresa[K]) => void
  actualizar: (id: IdEmpresa, cambio: (a: AccionesEmpresa) => AccionesEmpresa) => void
  setSinConexion: (v: boolean) => void
  reiniciar: () => void
}

export const VERSION_ESTADO_DEMO = 1

export function crearEstadoDemo(inicial: IdEmpresa) {
  return createStore<EstadoDemo>()(
    persist(
      (set) => ({
        empresa: inicial,
        porEmpresa: todasVacias(),
        sinConexion: false,
        elegirEmpresa: (id) => set({ empresa: id }),
        registrar: (id, clave, valor) =>
          set((s) => {
            const actual = s.porEmpresa[id]
            const previo = actual[clave]
            const nuevo = Array.isArray(previo) ? [...previo, valor] : valor
            return { porEmpresa: { ...s.porEmpresa, [id]: { ...actual, [clave]: nuevo } } }
          }),
        actualizar: (id, cambio) => set((s) => ({ porEmpresa: { ...s.porEmpresa, [id]: cambio(s.porEmpresa[id]) } })),
        setSinConexion: (v) => set({ sinConexion: v }),
        reiniciar: () => set({ porEmpresa: todasVacias(), sinConexion: false }),
      }),
      {
        name: "quvant:demo",
        version: VERSION_ESTADO_DEMO,
        storage: createJSONStorage(() => localStorage),
        skipHydration: true,
        // Solo lo que hizo el visitante: nunca los datos generados ni el interruptor de conexión.
        partialize: (s) => ({ empresa: s.empresa, porEmpresa: s.porEmpresa }),
        // Si cambia la forma, se empieza de cero (es una demo).
        migrate: () => ({ porEmpresa: todasVacias() }) as Partial<EstadoDemo>,
        merge: (guardado, actual) => {
          const g = (guardado ?? {}) as Partial<EstadoDemo>
          return { ...actual, empresa: esIdEmpresa(g.empresa) ? g.empresa : actual.empresa, porEmpresa: { ...todasVacias(), ...(g.porEmpresa ?? {}) } }
        },
      },
    ),
  )
}

export type TiendaDemo = ReturnType<typeof crearEstadoDemo>
