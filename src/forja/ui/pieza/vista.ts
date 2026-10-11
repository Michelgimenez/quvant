import { formatoCantidad } from "@/dominio/dinero"
import type { Id } from "@/dominio/tipos"
import type { DatosPieza } from "@/forja/datos/fuente"

/** Lo que el mapa muestra en el nivel 3: una marca debajo de cada sucursal y los flujos de la pieza. */
export type MarcaNodo = { texto: string; tono: "normal" | "critico" | "sin_stock" | "activo" }
export type FlujoVista = { desdeId: Id; haciaId: Id; cantidad: number; enTransito: number }
export type VistaPieza = { marcas: Record<Id, MarcaNodo>; flujos: FlujoVista[] }

export function vistaDePieza(d: DatosPieza): VistaPieza {
  if (d.tipo === "producto") {
    const marcas: Record<Id, MarcaNodo> = {}
    for (const s of d.recorrido.stock) marcas[s.sucursalId] = { texto: `${formatoCantidad(s.cantidad)} u.`, tono: s.estado }
    return { marcas, flujos: d.recorrido.flujos }
  }
  // Máquina: dónde se reparó y, si pasó por más de una sucursal, el camino entre ellas
  const marcas: Record<Id, MarcaNodo> = {}
  const porSucursal = new Map<Id, number>()
  for (const o of d.historia.ordenes) porSucursal.set(o.sucursalId, (porSucursal.get(o.sucursalId) ?? 0) + 1)
  for (const [id, n] of porSucursal) marcas[id] = { texto: `${n} ${n === 1 ? "reparación" : "reparaciones"}`, tono: "activo" }
  const flujos: FlujoVista[] = []
  d.historia.ordenes.forEach((o, i) => {
    const previa = d.historia.ordenes[i - 1]
    if (previa && previa.sucursalId !== o.sucursalId) flujos.push({ desdeId: previa.sucursalId, haciaId: o.sucursalId, cantidad: 1, enTransito: 0 })
  })
  return { marcas, flujos }
}
