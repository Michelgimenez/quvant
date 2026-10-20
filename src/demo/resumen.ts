/**
 * El tablero de cada escala a un momento dado: datos generados + simulador + lo que hizo el visitante.
 * Puro (sin React): el mismo cálculo sirve en vivo, en los tests y al filmar.
 */
import type { DatosNegocio } from "@/dominio/negocio"
import { fraccionDelDia, mismoDiaSemanaPasada, suma, totalDia, tramo, variacionPct } from "@/dominio/negocio"
import { CURVAS } from "./generar"
import type { IdEmpresa } from "./empresas"
import type { AccionesEmpresa } from "./estado-visitante"
import { acumuladoSimulado, type EventoDemo } from "./simulador"

export type ResumenBase = {
  ventasHoy: number
  ticketsHoy: number
  porSucursalHoy: number[]
  vsSemanaPasada: number | null
  ventasMes: number
  vsMesAnterior: number | null
  ticketPromedio: number
  margen: number
  serie: { fecha: string; total: number; porSucursal: number[] }[]
  ultimos: EventoDemo[]
}

/** Lo que pasó hoy antes de la ancla (para que las listas nunca arranquen vacías). */
function historia(id: IdEmpresa, datos: DatosNegocio): EventoDemo[] {
  const x = datos.extras
  if (x.tipo === "distribuidora")
    return x.pedidosHoy.slice(0, 10).map((p) => ({ id: `h-${p.id}`, t: Date.parse(p.t), tipo: "pedido", sucursal: 0, monto: p.monto, detalle: `Pedido · ${datos.clientes.find((c) => c.id === p.clienteId)?.nombre ?? ""}`, quien: x.preventistas[p.preventista]?.nombre ?? "", items: p.items }))
  return datos.recientes.map((r) => ({ id: `h-${r.id}`, t: Date.parse(r.t), tipo: "venta", sucursal: r.sucursal, monto: r.monto, detalle: r.detalle, quien: id === "kiosco" ? "Mostrador" : (datos.sucursales[r.sucursal]?.nombre ?? ""), medio: r.medio, items: r.items }))
}

export type ResumenKiosco = ResumenBase & {
  caja: { fondo: number; efectivo: number; otros: number; esperado: number; cerrada: boolean; diferencia: number | null }
  fiado: { total: number; vecinos: number; masViejo: number }
  paraPedir: { cantidad: number; proveedor: string; visita: string }
}

export type ResumenDistribuidora = ResumenBase & {
  pedidosHoy: number
  montoPedidosHoy: number
  porPreventista: { nombre: string; zona: string; pedidos: number; monto: number; objetivo: number }[]
  cobradoHoy: number
  deuda: { total: number; vencida: number; clientes: number }
  reparto: { entregadas: number; total: number }
}

export type ResumenGrupo = ResumenBase & {
  objetivoHoy: number
  sucursalesSobreObjetivo: number
  aprobacionesPendientes: number
  ranking: { indice: number; nombre: string; provincia: string; hoy: number; objetivo: number; avance: number; margen: number; criticos: number; tickets: number }[]
  porProvincia: { provincia: string; hoy: number; sucursales: number }[]
}

export type ResumenComercio = ResumenBase & {
  presupuestosAbiertos: number
  presupuestosMonto: number
  servicioListos: number
  servicioEnCurso: number
  transferenciasEnViaje: number
  stockCritico: number
}

/** La curva del día de cada empresa (la ferretería usa la de un comercio con horario corrido). */
// La ferretería sale del seed de la app, que reparte las ventas de todo el día: se compara el día completo, como en la app.
const CURVA_DE: Record<IdEmpresa, readonly number[] | null> = { kiosco: CURVAS.kiosco, ferreteria: null, distribuidora: CURVAS.distribuidora, grupo: CURVAS.grupo }

function base(id: IdEmpresa, datos: DatosNegocio, acciones: AccionesEmpresa, t: number) {
  const sim = acumuladoSimulado(id, datos, t)
  const hora = ((t / 3600000 - 3) % 24 + 24) % 24
  const hoy = datos.dias[datos.dias.length - 1]
  const visitante = acciones.ventas.reduce((a, v) => a + v.monto, 0)
  const porSucursalHoy = hoy.porSucursal.map((v, i) => v + sim.porSucursal[i] + (i === 0 ? visitante : 0))
  const ventasHoy = suma(porSucursalHoy)
  const ticketsHoy = suma(hoy.tickets) + suma(sim.tickets) + acciones.ventas.length
  const pasada = mismoDiaSemanaPasada(datos.dias)
  const mes = tramo(datos.dias, 30)
  const mesAnterior = tramo(datos.dias, 30, { desplazamiento: 30 })
  const serie = datos.dias.map((d, i) => {
    const esHoy = i === datos.dias.length - 1
    return { fecha: d.fecha, total: esHoy ? ventasHoy : totalDia(d), porSucursal: esHoy ? porSucursalHoy : d.porSucursal }
  })
  return {
    sim,
    resumen: {
      ventasHoy,
      ticketsHoy,
      porSucursalHoy,
      // El viernes pasado, a la misma hora: se compara lo comparable.
      vsSemanaPasada: pasada ? variacionPct(ventasHoy, totalDia(pasada) * (CURVA_DE[id] ? fraccionDelDia(CURVA_DE[id]!, hora) : 1)) : null,
      ventasMes: mes.total - totalDia(hoy) + ventasHoy,
      vsMesAnterior: variacionPct(mes.total, mesAnterior.total),
      ticketPromedio: mes.ticketPromedio,
      margen: mes.margen,
      serie,
      ultimos: [...sim.eventos.slice(-12).reverse(), ...historia(id, datos)].slice(0, 12),
    } satisfies ResumenBase,
  }
}

export function resumenKiosco(datos: DatosNegocio, acciones: AccionesEmpresa, t: number): ResumenKiosco {
  const { sim, resumen } = base("kiosco", datos, acciones, t)
  const x = datos.extras.tipo === "kiosco" ? datos.extras : null
  const efectivoSim = sim.eventos.filter((e) => e.tipo === "venta" && e.medio === "efectivo").reduce((a, e) => a + e.monto, 0)
  const efectivoVis = acciones.ventas.filter((v) => v.medio === "efectivo").reduce((a, v) => a + v.monto, 0)
  const efectivo = (x?.caja.efectivo ?? 0) + efectivoSim + efectivoVis
  const fondo = x?.caja.fondoInicial ?? 0
  const deudas = new Map(datos.clientes.map((c) => [c.id, c.saldo]))
  for (const f of acciones.fiados) deudas.set(f.clienteId, (deudas.get(f.clienteId) ?? 0) + (f.tipo === "fiado" ? f.monto : -f.monto))
  const conDeuda = [...deudas.values()].filter((v) => v > 0)
  const proveedor = x?.proveedores[0]
  return {
    ...resumen,
    caja: {
      fondo,
      efectivo,
      otros: resumen.ventasHoy - efectivo,
      esperado: fondo + efectivo,
      cerrada: Boolean(acciones.cierre),
      diferencia: acciones.cierre ? acciones.cierre.contado - acciones.cierre.esperado : null,
    },
    fiado: { total: suma(conDeuda), vecinos: conDeuda.length, masViejo: Math.max(0, ...datos.clientes.map((c) => c.diasDeuda)) },
    paraPedir: { cantidad: x?.pedidoSugerido.length ?? 0, proveedor: proveedor?.nombre ?? "", visita: proveedor?.visita ?? "" },
  }
}

export function resumenComercio(datos: DatosNegocio, acciones: AccionesEmpresa, t: number): ResumenComercio {
  const { sim, resumen } = base("ferreteria", datos, acciones, t)
  const x = datos.extras.tipo === "comercio" ? datos.extras : null
  const convertidos = new Set(acciones.movimientos.filter((m) => m.tipo === "presupuesto-venta").map((m) => m.ref))
  const abiertos = (x?.presupuestos ?? []).filter((p) => !convertidos.has(p.id))
  const nuevosPresupuestos = sim.eventos.filter((e) => e.tipo === "presupuesto")
  return {
    ...resumen,
    presupuestosAbiertos: abiertos.length + nuevosPresupuestos.length,
    presupuestosMonto: suma(abiertos.map((p) => p.monto)) + suma(nuevosPresupuestos.map((e) => e.monto)),
    servicioListos: (x?.servicio ?? []).filter((o) => o.estado === "listo").length,
    servicioEnCurso: (x?.servicio ?? []).filter((o) => o.estado !== "listo").length + sim.eventos.filter((e) => e.tipo === "servicio").length + acciones.movimientos.filter((m) => m.tipo === "servicio").length,
    transferenciasEnViaje: (x?.transferencias ?? []).filter((tr) => tr.estado === "en-viaje").length + acciones.movimientos.filter((m) => m.tipo === "transferencia").length,
    stockCritico: datos.stockCritico.length,
  }
}

export function resumenDistribuidora(datos: DatosNegocio, acciones: AccionesEmpresa, t: number): ResumenDistribuidora {
  const { sim, resumen } = base("distribuidora", datos, acciones, t)
  const x = datos.extras.tipo === "distribuidora" ? datos.extras : null
  const cobradoVisitante = suma(acciones.cobranzas.map((c) => c.monto))
  const deudas = new Map(datos.clientes.map((c) => [c.id, c]))
  const saldo = (id: string) => (deudas.get(id)?.saldo ?? 0) - suma(acciones.cobranzas.filter((c) => c.clienteId === id).map((c) => c.monto))
  const conDeuda = datos.clientes.filter((c) => saldo(c.id) > 0)
  const paradas = (x?.reparto ?? []).flatMap((r) => r.paradas)
  const pedidosVisitante = acciones.movimientos.filter((m) => m.tipo === "pedido")
  return {
    ...resumen,
    pedidosHoy: (x?.pedidosHoy.length ?? 0) + sim.pedidos + pedidosVisitante.length,
    montoPedidosHoy: suma((x?.pedidosHoy ?? []).map((p) => p.monto)) + sim.montoPedidos + suma(pedidosVisitante.map((m) => m.monto)),
    porPreventista: (x?.preventistas ?? []).map((p, i) => ({ nombre: p.nombre, zona: p.zona, pedidos: p.pedidosHoy + sim.porPreventista[i].pedidos, monto: p.montoHoy + sim.porPreventista[i].monto, objetivo: p.objetivoDia })),
    cobradoHoy: (x?.cobradoHoy ?? 0) + sim.cobrado + cobradoVisitante,
    deuda: { total: suma(conDeuda.map((c) => saldo(c.id))), vencida: suma(conDeuda.filter((c) => c.diasDeuda > 30).map((c) => saldo(c.id))), clientes: conDeuda.length },
    reparto: { entregadas: Math.min(paradas.length, paradas.filter((p) => p.estado === "entregado").length + sim.entregas), total: paradas.length },
  }
}

export function resumenGrupo(datos: DatosNegocio, acciones: AccionesEmpresa, t: number): ResumenGrupo {
  const { sim, resumen } = base("grupo", datos, acciones, t)
  const x = datos.extras.tipo === "grupo" ? datos.extras : null
  const objetivos = x?.objetivoDia ?? datos.sucursales.map(() => 0)
  // El objetivo del día se compara contra lo esperable a esta hora (proporcional al avance del día comercial).
  const ranking = datos.sucursales.map((s, i) => {
    const hoy = resumen.porSucursalHoy[i]
    const objetivo = objetivos[i]
    return { indice: i, nombre: s.nombre, provincia: s.provincia, hoy, objetivo, avance: objetivo ? hoy / objetivo : 0, margen: x?.margenPorSucursal[i] ?? 0, criticos: x?.stockCriticoPorSucursal[i] ?? 0, tickets: datos.dias[datos.dias.length - 1].tickets[i] + sim.tickets[i] }
  })
  const provincias = x?.provincias ?? []
  const resueltas = new Set(acciones.aprobaciones.filter((a) => a.nivel2 || a.rechazada || (a.nivel1 && !(x?.aprobaciones.find((p) => p.id === a.id)?.nivel === 2))).map((a) => a.id))
  const mediana = [...ranking].sort((a, b) => a.avance - b.avance)[Math.floor(ranking.length / 2)]?.avance ?? 0
  return {
    ...resumen,
    objetivoHoy: suma(objetivos),
    sucursalesSobreObjetivo: ranking.filter((r) => r.avance >= mediana * 1.05).length,
    aprobacionesPendientes: (x?.aprobaciones ?? []).filter((a) => !resueltas.has(a.id)).length + sim.aprobaciones,
    ranking,
    porProvincia: provincias.map((p) => ({ provincia: p, hoy: suma(ranking.filter((r) => r.provincia === p).map((r) => r.hoy)), sucursales: ranking.filter((r) => r.provincia === p).length })),
  }
}
