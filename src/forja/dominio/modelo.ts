import { inicioDiaART } from "@/datos/demo/tiempo"
import type { EstadoEmpresa } from "@/dominio/estado"
import type { EstadoEntrega, EstadoServicio, FechaISO, Id, Ilustracion } from "@/dominio/tipos"
import { calorRelativo } from "./calor"

/**
 * Modelo de Forja: lo que se dibuja. Se arma desde el estado de Yunque (app y
 * demo embebida) o se lee de un snapshot (demos públicas). No depende de React
 * ni de ningún motor gráfico; lo usan el mapa, la constelación, el taller 3D y
 * la versión 2D por igual.
 */

/** Horas hábiles por día que se usan para el promedio por hora (8 a 18). */
export const HORAS_HABILES = 10

export type NodoForja = {
  id: Id
  nombre: string
  codigo: string
  tipo: "sucursal" | "deposito"
  lat: number | null
  lng: number | null
  /** Sucursal ficticia: se marca DEMO. */
  demo: boolean
  puestos: number
  ventasHoy: number
  importeHoy: number
  ventasUltimaHora: number
  promedioHora: number
  /** 0 = frío · 1 = promedio de la sucursal · ≥ 2 = pico. */
  calor: number
  /** Facturación de los últimos 28 días (centavos): tamaño en la constelación. */
  facturacion28: number
  presupuestosAbiertos: number
  stockCritico: number
  sinStock: number
  /** Productos con stock mínimo definido (base del anillo de stock crítico). */
  productosConMinimo: number
  ordenes: Partial<Record<EstadoServicio, number>>
  /** Ventas hechas sin conexión que todavía no se sincronizaron (cola del mostrador). */
  colaSinConexion: number
}

export type ItemTransferencia = { productoId: Id; nombre: string; cantidad: number }

export type TransferenciaForja = {
  id: Id
  desdeId: Id
  haciaId: Id
  estado: "en_transito" | "recibida"
  despachadaEn: FechaISO
  llegadaEstimada: FechaISO
  recibidaEn: FechaISO | null
  items: ItemTransferencia[]
  motivo: string
}

/** Volumen de transferencias entre dos sucursales en 28 días (grosor del enlace). */
export type FlujoForja = { desdeId: Id; haciaId: Id; transferencias: number; unidades: number }

export type RedForja = {
  org: { id: Id; nombre: string; esDemo: boolean }
  nodos: NodoForja[]
  transferencias: TransferenciaForja[]
  flujos: FlujoForja[]
  generadoEn: FechaISO
}

export type ProductoRack = { productoId: Id; nombre: string; sku: string; cantidad: number; minimo: number; estante: number; ilustracion: Ilustracion }

export type RackForja = {
  id: string
  /** Sección (código de categoría) y rack (letra): "HE-A". */
  categoria: string
  categoriaNombre: string
  pasillo: string
  productos: ProductoRack[]
  unidades: number
  criticos: number
  sinStock: number
  /** Ocupación relativa 0..1 por estante (estantes 1..12). */
  niveles: number[]
}

export type PuestoForja = { puesto: number; ventasHoy: number; importeHoy: number; cajaAbierta: boolean; sinConexion: number; ultimaVenta: FechaISO | null }

export type BancoForja = {
  id: Id
  numero: string
  estado: EstadoServicio
  equipo: Ilustracion
  descripcion: string
  /** Número de serie de la máquina (historia en el nivel 3). */
  serie: string
  desde: FechaISO
  horasEnBanco: number
  prioridad: "normal" | "urgente"
  atrasada: boolean
}

export type BultoForja = {
  id: Id
  tipo: "entrega" | "transferencia"
  estado: EstadoEntrega | "en_transito" | "recibida"
  detalle: string
  franja: "mañana" | "tarde" | null
  destinoId: Id | null
}

export type TallerForja = {
  sucursalId: Id
  puestos: PuestoForja[]
  racks: RackForja[]
  bancos: BancoForja[]
  muelle: BultoForja[]
}

/** Eventos del día, para la línea de tiempo y para animar lo nuevo. */
export type EventoForja =
  | { id: string; en: FechaISO; tipo: "venta"; sucursalId: Id; puesto: number; importe: number; sinConexion: boolean }
  | { id: string; en: FechaISO; tipo: "transferencia_salida" | "transferencia_llegada"; sucursalId: Id; transferenciaId: Id; desdeId: Id; haciaId: Id; items: number }
  | { id: string; en: FechaISO; tipo: "servicio"; sucursalId: Id; ordenId: Id; numero: string; estado: EstadoServicio }
  | { id: string; en: FechaISO; tipo: "stock_critico"; sucursalId: Id; productoId: Id; nombre: string; queda: number; minimo: number; ubicacion: string }

const ESTANTES = 12

function ordenesActivas(e: EstadoEmpresa, sucursalId: Id) {
  return Object.values(e.servicio).filter((o) => o.sucursalId === sucursalId && o.estado !== "entregado")
}

/** Estado de una orden a una hora dada (el último evento hasta ese momento); null si todavía no había ingresado. */
function estadoOrdenEn(o: EstadoEmpresa["servicio"][Id], t: number) {
  let estado: EstadoServicio | null = null
  for (const ev of o.eventos) if (Date.parse(ev.fecha) <= t) estado = ev.estado
  return estado
}

/**
 * Stock a una hora dada: el actual menos lo que se movió después. Para "ahora"
 * no cambia nada; para la repetición del día reconstruye cada quiebre.
 */
function stockEn(e: EstadoEmpresa, t: number) {
  const despues = new Map<string, number>()
  for (const m of e.movimientos) {
    if (Date.parse(m.fecha) <= t) continue
    const k = `${m.sucursalId}:${m.productoId}`
    despues.set(k, (despues.get(k) ?? 0) + m.cantidad)
  }
  return (st: { sucursalId: Id; productoId: Id; cantidad: number }) => st.cantidad - (despues.get(`${st.sucursalId}:${st.productoId}`) ?? 0)
}

/**
 * Red completa (nivel 1) tal como estaba en `ahora`: ventas, calor, stock,
 * transferencias y órdenes se reconstruyen a esa hora (la repetición del día
 * usa la misma función). Presupuestos y ventas sin sincronizar, tal como están
 * hoy. `permitidas` limita las sucursales (rol y permisos).
 */
export function redForja(e: EstadoEmpresa, ahora: Date, permitidas: Id[] | null = null): RedForja {
  const inicio = inicioDiaART(ahora).getTime()
  const tAhora = ahora.getTime()
  const haceUnaHora = tAhora - 3_600_000
  const hace28 = tAhora - 28 * 86_400_000
  const visibles = e.sucursales.filter((s) => permitidas === null || permitidas.includes(s.id))
  const ids = new Set(visibles.map((s) => s.id))
  const cantidadEn = stockEn(e, tAhora)

  const porSucursal = new Map<Id, { hoy: number; importe: number; hora: number; mes: number; facturacion: number; cola: number }>()
  for (const s of visibles) porSucursal.set(s.id, { hoy: 0, importe: 0, hora: 0, mes: 0, facturacion: 0, cola: 0 })
  for (const v of Object.values(e.ventas)) {
    const acc = porSucursal.get(v.sucursalId)
    if (!acc || v.estado !== "confirmada") continue
    const t = Date.parse(v.fecha)
    if (t > ahora.getTime()) continue
    if (t >= hace28) {
      acc.mes++
      acc.facturacion += v.total
    }
    if (t >= inicio) {
      acc.hoy++
      acc.importe += v.total
      if (v.numero === null) acc.cola++
    }
    if (t >= haceUnaHora) acc.hora++
  }

  const nodos: NodoForja[] = visibles.map((s) => {
    const a = porSucursal.get(s.id)!
    const promedioHora = Math.round((a.mes / (28 * HORAS_HABILES)) * 1000) / 1000
    const stock = Object.values(e.stock)
      .filter((st) => st.sucursalId === s.id && st.minimo > 0)
      .map((st) => ({ minimo: st.minimo, cantidad: cantidadEn(st) }))
    const ordenes: Partial<Record<EstadoServicio, number>> = {}
    for (const o of Object.values(e.servicio)) {
      if (o.sucursalId !== s.id) continue
      const estado = estadoOrdenEn(o, tAhora)
      if (estado && estado !== "entregado") ordenes[estado] = (ordenes[estado] ?? 0) + 1
    }
    return {
      id: s.id,
      nombre: s.nombre,
      codigo: s.codigo,
      tipo: s.tipo,
      lat: s.lat,
      lng: s.lng,
      demo: s.demo,
      puestos: s.puestos,
      ventasHoy: a.hoy,
      importeHoy: a.importe,
      ventasUltimaHora: a.hora,
      promedioHora,
      calor: calorRelativo(a.hora, promedioHora),
      facturacion28: a.facturacion,
      productosConMinimo: stock.length,
      presupuestosAbiertos: Object.values(e.presupuestos).filter((p) => p.sucursalId === s.id && ["borrador", "enviado", "aceptado"].includes(p.estado) && !p.ventaId).length,
      stockCritico: stock.filter((st) => st.cantidad > 0 && st.cantidad <= st.minimo).length,
      sinStock: stock.filter((st) => st.cantidad <= 0).length,
      ordenes,
      colaSinConexion: a.cola,
    }
  })

  // Transferencias tal como estaban en `ahora`: las que todavía no salieron no existen y las recibidas después siguen en camino
  const transferencias = Object.values(e.transferencias)
    .filter((t) => (ids.has(t.desdeId) || ids.has(t.haciaId)) && Date.parse(t.despachadaEn) <= tAhora)
    .map((t) => {
      const recibida = t.recibidaEn !== null && Date.parse(t.recibidaEn) <= tAhora
      return {
        id: t.id,
        desdeId: t.desdeId,
        haciaId: t.haciaId,
        estado: recibida ? ("recibida" as const) : ("en_transito" as const),
        despachadaEn: t.despachadaEn,
        llegadaEstimada: t.llegadaEstimada,
        recibidaEn: recibida ? t.recibidaEn : null,
        motivo: t.motivo,
        items: t.items.map((i) => ({ productoId: i.productoId, nombre: e.productos[i.productoId]?.nombre ?? "Producto", cantidad: i.cantidad })),
      }
    })
    .filter((t) => t.estado === "en_transito" || Date.parse(t.recibidaEn!) >= inicio)

  const flujosMap = new Map<string, FlujoForja>()
  for (const t of Object.values(e.transferencias)) {
    if (!ids.has(t.desdeId) || !ids.has(t.haciaId) || Date.parse(t.despachadaEn) < hace28 || Date.parse(t.despachadaEn) > tAhora) continue
    const k = `${t.desdeId}>${t.haciaId}`
    const f = flujosMap.get(k) ?? { desdeId: t.desdeId, haciaId: t.haciaId, transferencias: 0, unidades: 0 }
    f.transferencias++
    f.unidades += t.items.reduce((a, i) => a + i.cantidad, 0)
    flujosMap.set(k, f)
  }

  return { org: { id: e.org.id, nombre: e.org.nombre, esDemo: e.org.esDemo }, nodos, transferencias, flujos: [...flujosMap.values()], generadoEn: ahora.toISOString() }
}

/** Interior de una sucursal (nivel 2). */
export function tallerForja(e: EstadoEmpresa, sucursalId: Id, ahora: Date): TallerForja {
  const s = e.sucursales.find((x) => x.id === sucursalId)
  if (!s) throw new Error("La sucursal no existe")
  const inicio = inicioDiaART(ahora).getTime()

  const puestos: PuestoForja[] = Array.from({ length: s.puestos }, (_, i) => ({ puesto: i + 1, ventasHoy: 0, importeHoy: 0, cajaAbierta: false, sinConexion: 0, ultimaVenta: null }))
  for (const v of Object.values(e.ventas)) {
    if (v.sucursalId !== s.id || v.estado !== "confirmada") continue
    const t = Date.parse(v.fecha)
    if (t < inicio || t > ahora.getTime()) continue
    const p = puestos[v.puesto - 1]
    if (!p) continue
    p.ventasHoy++
    p.importeHoy += v.total
    if (v.numero === null) p.sinConexion++
    if (!p.ultimaVenta || v.fecha > p.ultimaVenta) p.ultimaVenta = v.fecha
  }
  for (const c of Object.values(e.cajas)) if (c.sucursalId === s.id && !c.cierre && puestos[c.puesto - 1]) puestos[c.puesto - 1].cajaAbierta = true

  // Racks por ubicación: "HE-A3" → rack HE-A, estante 3
  const racks = new Map<string, RackForja & { maximos: number[] }>()
  for (const st of Object.values(e.stock)) {
    if (st.sucursalId !== s.id || !st.ubicacion) continue
    const m = /^([A-Z0-9]+)-([A-Z])(\d+)$/.exec(st.ubicacion)
    if (!m) continue
    const id = `${m[1]}-${m[2]}`
    const estante = Math.min(ESTANTES, Math.max(1, Number(m[3])))
    const p = e.productos[st.productoId]
    if (!p) continue
    let r = racks.get(id)
    if (!r) {
      r = { id, categoria: m[1], categoriaNombre: e.categorias.find((c) => c.id === p.categoriaId)?.nombre ?? m[1], pasillo: m[2], productos: [], unidades: 0, criticos: 0, sinStock: 0, niveles: Array(ESTANTES).fill(0), maximos: Array(ESTANTES).fill(0) }
      racks.set(id, r)
    }
    r.productos.push({ productoId: p.id, nombre: p.nombre, sku: p.sku, cantidad: st.cantidad, minimo: st.minimo, estante, ilustracion: p.ilustracion })
    r.unidades += Math.max(0, st.cantidad)
    if (st.minimo > 0 && st.cantidad <= 0) r.sinStock++
    else if (st.minimo > 0 && st.cantidad <= st.minimo) r.criticos++
    // Nivel del estante: stock relativo a tres veces el mínimo (lleno ≈ 1)
    r.niveles[estante - 1] += Math.max(0, st.cantidad)
    r.maximos[estante - 1] += Math.max(1, st.minimo * 3)
  }
  const listaRacks = [...racks.values()]
    .map(({ maximos, ...r }) => ({ ...r, niveles: r.niveles.map((n, i) => (maximos[i] ? Math.min(1, n / maximos[i]) : 0)) }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const bancos: BancoForja[] = ordenesActivas(e, s.id)
    .sort((a, b) => a.fechaIngreso.localeCompare(b.fechaIngreso))
    .map((o) => ({
      id: o.id,
      numero: o.numero ? `#${o.numero}` : o.numeroLocal,
      estado: o.estado,
      equipo: o.equipo.tipo,
      descripcion: `${o.equipo.marca} ${o.equipo.modelo}`.trim(),
      serie: o.equipo.serie,
      desde: o.fechaIngreso,
      horasEnBanco: Math.max(0, Math.round((ahora.getTime() - Date.parse(o.fechaIngreso)) / 3_600_000)),
      prioridad: o.prioridad,
      atrasada: Date.parse(o.fechaPrometida) < ahora.getTime() && !["listo", "sin_reparacion"].includes(o.estado),
    }))

  const finDia = inicio + 86_400_000
  const muelle: BultoForja[] = [
    ...Object.values(e.entregas)
      .filter((en) => en.sucursalId === s.id && Date.parse(en.fechaProgramada) >= inicio && Date.parse(en.fechaProgramada) < finDia)
      .sort((a, b) => a.orden - b.orden)
      .map((en) => ({ id: en.id, tipo: "entrega" as const, estado: en.estado, detalle: en.destinatario, franja: en.franja, destinoId: null })),
    ...Object.values(e.transferencias)
      .filter((t) => t.desdeId === s.id && (t.estado === "en_transito" || Date.parse(t.despachadaEn) >= inicio))
      .map((t) => ({ id: t.id, tipo: "transferencia" as const, estado: t.estado, detalle: `${t.items.length} producto(s) a ${e.sucursales.find((x) => x.id === t.haciaId)?.nombre ?? "otra sucursal"}`, franja: null, destinoId: t.haciaId })),
  ]

  return { sucursalId: s.id, puestos, racks: listaRacks, bancos, muelle }
}

/**
 * Eventos del día en orden, para reproducir la jornada. Los quiebres de stock
 * se reconstruyen hacia atrás desde el stock actual y los movimientos de hoy.
 */
export function eventosDelDia(e: EstadoEmpresa, ahora: Date, permitidas: Id[] | null = null): EventoForja[] {
  const inicio = inicioDiaART(ahora).getTime()
  const ok = (sucursalId: Id) => permitidas === null || permitidas.includes(sucursalId)
  const enRango = (iso: string) => {
    const t = Date.parse(iso)
    return t >= inicio && t <= ahora.getTime()
  }
  const eventos: EventoForja[] = []

  for (const v of Object.values(e.ventas)) {
    if (v.estado !== "confirmada" || !ok(v.sucursalId) || !enRango(v.fecha)) continue
    eventos.push({ id: `v:${v.id}`, en: v.fecha, tipo: "venta", sucursalId: v.sucursalId, puesto: v.puesto, importe: v.total, sinConexion: v.origen === "sin_conexion" })
  }
  for (const t of Object.values(e.transferencias)) {
    if (enRango(t.despachadaEn) && ok(t.desdeId)) eventos.push({ id: `ts:${t.id}`, en: t.despachadaEn, tipo: "transferencia_salida", sucursalId: t.desdeId, transferenciaId: t.id, desdeId: t.desdeId, haciaId: t.haciaId, items: t.items.length })
    if (t.recibidaEn && enRango(t.recibidaEn) && ok(t.haciaId)) eventos.push({ id: `tl:${t.id}`, en: t.recibidaEn, tipo: "transferencia_llegada", sucursalId: t.haciaId, transferenciaId: t.id, desdeId: t.desdeId, haciaId: t.haciaId, items: t.items.length })
  }
  for (const o of Object.values(e.servicio)) {
    if (!ok(o.sucursalId)) continue
    for (const [i, ev] of o.eventos.entries()) {
      if (!enRango(ev.fecha)) continue
      eventos.push({ id: `s:${o.id}:${i}`, en: ev.fecha, tipo: "servicio", sucursalId: o.sucursalId, ordenId: o.id, numero: o.numero ? `#${o.numero}` : o.numeroLocal, estado: ev.estado })
    }
  }

  // Quiebres de stock de hoy: se recorre hacia atrás desde la cantidad actual
  const hoy = e.movimientos.filter((m) => ok(m.sucursalId) && enRango(m.fecha))
  const porClave = new Map<string, typeof hoy>()
  for (const m of hoy) {
    const k = `${m.sucursalId}:${m.productoId}`
    porClave.set(k, [...(porClave.get(k) ?? []), m])
  }
  for (const [k, movs] of porClave) {
    const st = e.stock[k]
    if (!st || st.minimo <= 0) continue
    let despues = st.cantidad
    for (const m of [...movs].sort((a, b) => b.fecha.localeCompare(a.fecha))) {
      const antes = despues - m.cantidad
      if (antes > st.minimo && despues <= st.minimo) {
        eventos.push({ id: `c:${m.id}`, en: m.fecha, tipo: "stock_critico", sucursalId: m.sucursalId, productoId: m.productoId, nombre: e.productos[m.productoId]?.nombre ?? "Producto", queda: despues, minimo: st.minimo, ubicacion: st.ubicacion })
      }
      despues = antes
    }
  }

  return eventos.sort((a, b) => a.en.localeCompare(b.en) || a.id.localeCompare(b.id))
}
