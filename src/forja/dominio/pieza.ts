import { inicioDiaART } from "@/datos/demo/tiempo"
import type { EstadoEmpresa } from "@/dominio/estado"
import type { Centavos, EstadoServicio, FechaISO, Id, Ilustracion, TipoMovimiento } from "@/dominio/tipos"
import { normalizar } from "@/lib/texto"
import { estadoBloque, type EstadoBloque } from "./plano"

/**
 * Nivel 3 — una pieza: el recorrido de un producto (SKU) por las sucursales o
 * la historia de una máquina por su número de serie. Puro, con los mismos
 * permisos por sucursal que la red.
 */
export type Pieza = { tipo: "producto" | "maquina"; id: string }

export type StockPieza = { sucursalId: Id; cantidad: number; minimo: number; ubicacion: string; estado: EstadoBloque }

export type MovimientoPieza = {
  id: Id
  fecha: FechaISO
  sucursalId: Id
  tipo: TipoMovimiento
  /** Con signo: negativo sale, positivo entra. */
  cantidad: number
  /** Stock de esa sucursal después del movimiento. */
  saldo: number
  detalle: string
  refId: Id | null
  /** La otra sucursal, en las transferencias. */
  otraId: Id | null
}

export type FlujoPieza = { desdeId: Id; haciaId: Id; cantidad: number; transferencias: number; enTransito: number }

export type RecorridoProducto = {
  producto: { id: Id; nombre: string; sku: string; ilustracion: Ilustracion; categoria: string }
  stock: StockPieza[]
  movimientos: MovimientoPieza[]
  flujos: FlujoPieza[]
  resumen: { vendidas: number; compradas: number; transferidas: number; ajustadas: number }
  desde: FechaISO
}

/** Recorrido de un SKU en los últimos `dias`: stock por sucursal, movimientos con saldo y flujos entre sucursales. */
export function recorridoProducto(e: EstadoEmpresa, productoId: Id, ahora: Date, permitidas: Id[] | null = null, dias = 28): RecorridoProducto | null {
  const p = e.productos[productoId]
  if (!p) return null
  const visibles = e.sucursales.filter((s) => permitidas === null || permitidas.includes(s.id))
  const ids = new Set(visibles.map((s) => s.id))
  const desde = inicioDiaART(new Date(ahora.getTime() - (dias - 1) * 86_400_000))

  const stock: StockPieza[] = visibles.map((s) => {
    const st = e.stock[`${s.id}:${productoId}`]
    const cantidad = st?.cantidad ?? 0
    const minimo = st?.minimo ?? 0
    return { sucursalId: s.id, cantidad, minimo, ubicacion: st?.ubicacion ?? "", estado: estadoBloque({ cantidad, minimo }) }
  })

  // Saldo después de cada movimiento: se recorre hacia atrás desde el stock actual
  const saldo = new Map(stock.map((s) => [s.sucursalId, s.cantidad]))
  const movimientos: MovimientoPieza[] = []
  const propios = e.movimientos.filter((m) => m.productoId === productoId && ids.has(m.sucursalId) && Date.parse(m.fecha) <= ahora.getTime()).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
  for (const m of propios) {
    const despues = saldo.get(m.sucursalId) ?? 0
    saldo.set(m.sucursalId, despues - m.cantidad)
    if (Date.parse(m.fecha) < desde.getTime()) continue
    const t = m.refId && (m.tipo === "transferencia_salida" || m.tipo === "transferencia_entrada") ? e.transferencias[m.refId] : undefined
    const otraId = t ? (m.tipo === "transferencia_salida" ? t.haciaId : t.desdeId) : null
    movimientos.push({ id: m.id, fecha: m.fecha, sucursalId: m.sucursalId, tipo: m.tipo, cantidad: m.cantidad, saldo: despues, detalle: m.motivo, refId: m.refId, otraId })
  }

  // Flujos: transferencias de este producto entre sucursales visibles (las de la ventana y las que siguen en camino)
  const flujos = new Map<string, FlujoPieza>()
  for (const t of Object.values(e.transferencias)) {
    if (!ids.has(t.desdeId) || !ids.has(t.haciaId)) continue
    if (Date.parse(t.despachadaEn) > ahora.getTime()) continue
    const enCamino = t.estado === "en_transito"
    if (!enCamino && Date.parse(t.despachadaEn) < desde.getTime()) continue
    const cantidad = t.items.filter((i) => i.productoId === productoId).reduce((a, i) => a + i.cantidad, 0)
    if (!cantidad) continue
    const k = `${t.desdeId}>${t.haciaId}`
    const f = flujos.get(k) ?? { desdeId: t.desdeId, haciaId: t.haciaId, cantidad: 0, transferencias: 0, enTransito: 0 }
    f.cantidad += cantidad
    f.transferencias++
    if (enCamino) f.enTransito += cantidad
    flujos.set(k, f)
  }

  const suma = (tipos: TipoMovimiento[], signo: 1 | -1) => movimientos.filter((m) => tipos.includes(m.tipo)).reduce((a, m) => a + m.cantidad * signo, 0)
  return {
    producto: { id: p.id, nombre: p.nombre, sku: p.sku, ilustracion: p.ilustracion, categoria: e.categorias.find((c) => c.id === p.categoriaId)?.nombre ?? "" },
    stock,
    movimientos,
    flujos: [...flujos.values()],
    resumen: {
      vendidas: suma(["venta"], -1) - suma(["anulacion"], 1),
      compradas: suma(["compra"], 1),
      transferidas: suma(["transferencia_salida"], -1),
      ajustadas: movimientos.filter((m) => m.tipo === "ajuste" || m.tipo === "conteo").length,
    },
    desde: desde.toISOString(),
  }
}

export type OrdenMaquina = {
  id: Id
  numero: string
  sucursalId: Id
  fechaIngreso: FechaISO
  estado: EstadoServicio
  falla: string
  diagnostico: string
  presupuesto: Centavos | null
  eventos: { fecha: FechaISO; estado: EstadoServicio; nota: string }[]
  repuestos: { nombre: string; cantidad: number }[]
}

export type HistoriaMaquina = {
  serie: string
  equipo: { tipo: Ilustracion; marca: string; modelo: string }
  cliente: { id: Id; nombre: string } | null
  /** De la más vieja a la más nueva. */
  ordenes: OrdenMaquina[]
  /**
   * Ventas que **coinciden** por cliente, marca y tipo de equipo, anteriores al
   * primer ingreso. Quvant todavía no registra números de serie en compras y
   * ventas: esto es una referencia, no un vínculo comprobado.
   */
  ventasCoincidentes: { ventaId: Id; fecha: FechaISO; sucursalId: Id; numero: string; producto: string }[]
}

/** Historia de una máquina por su número de serie: reparaciones en todas las sucursales visibles. */
export function historiaMaquina(e: EstadoEmpresa, serie: string, permitidas: Id[] | null = null): HistoriaMaquina | null {
  const ordenes = Object.values(e.servicio)
    .filter((o) => o.equipo.serie === serie && (permitidas === null || permitidas.includes(o.sucursalId)))
    .sort((a, b) => a.fechaIngreso.localeCompare(b.fechaIngreso))
  if (!ordenes.length) return null
  const ultima = ordenes[ordenes.length - 1]
  const cliente = e.clientes[ultima.clienteId]
  const primerIngreso = ordenes[0].fechaIngreso

  const marca = normalizar(ultima.equipo.marca)
  const ventasCoincidentes = Object.values(e.ventas)
    .filter((v) => v.estado === "confirmada" && v.clienteId === ultima.clienteId && v.fecha < primerIngreso && (permitidas === null || permitidas.includes(v.sucursalId)))
    .flatMap((v) =>
      v.items
        .map((it) => e.productos[it.productoId])
        .filter((p) => p && p.ilustracion === ultima.equipo.tipo && normalizar(e.marcas.find((m) => m.id === p.marcaId)?.nombre ?? "") === marca)
        .map((p) => ({ ventaId: v.id, fecha: v.fecha, sucursalId: v.sucursalId, numero: v.numero ? `#${v.numero}` : v.numeroLocal, producto: p!.nombre })),
    )
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  return {
    serie,
    equipo: { tipo: ultima.equipo.tipo, marca: ultima.equipo.marca, modelo: ultima.equipo.modelo },
    cliente: cliente ? { id: cliente.id, nombre: cliente.nombre } : null,
    ordenes: ordenes.map((o) => ({
      id: o.id,
      numero: o.numero ? `#${o.numero}` : o.numeroLocal,
      sucursalId: o.sucursalId,
      fechaIngreso: o.fechaIngreso,
      estado: o.estado,
      falla: o.falla,
      diagnostico: o.diagnostico,
      presupuesto: o.presupuestoReparacion,
      eventos: o.eventos.map((ev) => ({ fecha: ev.fecha, estado: ev.estado, nota: ev.nota })),
      repuestos: o.repuestos.map((r) => ({ nombre: e.productos[r.productoId]?.nombre ?? "Repuesto", cantidad: r.cantidad })),
    })),
    ventasCoincidentes,
  }
}

/** Máquinas por número de serie, marca o modelo (para el buscador ⌘K). */
export function buscarMaquinas(e: EstadoEmpresa, texto: string, permitidas: Id[] | null = null, max = 4) {
  const q = normalizar(texto.trim())
  if (q.length < 2) return []
  const porSerie = new Map<string, { serie: string; marca: string; modelo: string; tipo: Ilustracion; ordenes: number }>()
  for (const o of Object.values(e.servicio)) {
    if (permitidas !== null && !permitidas.includes(o.sucursalId)) continue
    const { serie, marca, modelo, tipo } = o.equipo
    if (!normalizar(serie).includes(q) && !normalizar(`${marca} ${modelo}`).includes(q)) continue
    const m = porSerie.get(serie) ?? { serie, marca, modelo, tipo, ordenes: 0 }
    m.ordenes++
    porSerie.set(serie, m)
  }
  return [...porSerie.values()].sort((a, b) => b.ordenes - a.ordenes || a.serie.localeCompare(b.serie)).slice(0, max)
}

/** "producto:<id>" o "maquina:<serie>" (parámetro de la dirección). */
export function piezaDesdeTexto(texto: string | null): Pieza | null {
  const m = /^(producto|maquina):(.+)$/.exec(texto ?? "")
  return m ? { tipo: m[1] as Pieza["tipo"], id: m[2] } : null
}
