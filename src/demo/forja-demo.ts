import { ILUSTRACIONES, type Ilustracion } from "@/dominio/tipos"
import type { FuenteForja } from "@/forja/datos/fuente"
import { calorRelativo } from "@/forja/dominio/calor"
import { HORAS_HABILES, type EventoForja, type FlujoForja, type NodoForja, type RackForja, type RedForja, type TallerForja, type TransferenciaForja } from "@/forja/dominio/modelo"
import { hash, u01 } from "./azar"
import { ZONAS_DISTRIBUIDORA } from "./catalogos"
import { datosEmpresa } from "./datos"
import { ANCLA_MS, CURVAS, stockGrupo } from "./generar"
import { eventosEntre } from "./simulador"

/**
 * Forja dentro de la demo (tanda 9), para el grupo y la distribuidora: la misma fuente de datos de la demo
 * (src/demo, sin base ni Realtime) puesta en la forma que dibuja Forja (src/forja/dominio/modelo.ts).
 * - El grupo: sus 40 sucursales en el mapa del país, con las ventas del día y el calor de la última hora.
 * - La distribuidora: el depósito de Rosario y sus 12 zonas de reparto (cada zona, un nodo), con los pedidos
 *   del día y los camiones en viaje.
 * Lo de antes de la hora ancla se reconstruye de los totales del día (muestras con su hora, siempre iguales);
 * lo de después lo pone el simulador. Todo lleva el sello SIMULACIÓN.
 */
export type IdForjaDemo = "grupo" | "distribuidora"

type Sede = { id: string; nombre: string; codigo: string; tipo: "sucursal" | "deposito"; lat: number; lng: number; puestos: number }
type Venta = { t: number; sede: number; importe: number; puesto: number }

const HORA = 3_600_000
const iso = (t: number) => new Date(t).toISOString()
/** El comienzo del día de la ancla (medianoche en Argentina). */
const INICIO_DIA = ANCLA_MS - (((ANCLA_MS / HORA - 3) % 24) + 24) % 24 * HORA

/** Coordenadas aproximadas de las zonas de reparto alrededor de Rosario (barrios y localidades reales; los clientes son ficticios). */
const COORDENADAS_ZONA: Record<(typeof ZONAS_DISTRIBUIDORA)[number], [number, number]> = {
  Centro: [-32.946, -60.64],
  Norte: [-32.905, -60.676],
  Sur: [-33.0, -60.648],
  Oeste: [-32.955, -60.716],
  Noroeste: [-32.92, -60.73],
  Sudoeste: [-32.99, -60.715],
  Funes: [-32.917, -60.811],
  "Villa Gobernador Gálvez": [-33.032, -60.637],
  "Granadero Baigorria": [-32.858, -60.705],
  Pérez: [-32.998, -60.769],
  "Capitán Bermúdez": [-32.825, -60.718],
  Roldán: [-32.898, -60.906],
}

/** Una hora del día según la curva de la empresa (la hora más cargada sale más seguido), antes de la ancla. */
function horaSegun(curva: readonly number[], x: number, hasta: number) {
  const pesos = curva.map((p, h) => (h < hasta ? p : 0))
  const total = pesos.reduce((a, b) => a + b, 0) || 1
  let acum = 0
  for (let h = 0; h < 24; h++) {
    const p = pesos[h] / total
    if (x < acum + p) return h + (x - acum) / p
    acum += p
  }
  return hasta - 0.01
}

type Mundo = { sedes: Sede[]; ventas: Venta[]; facturacion28: number[]; tickets28: number[]; criticos: number[]; transferencias: TransferenciaForja[]; flujos: FlujoForja[]; nombreOrg: string }

/** El grupo: las ventas de hoy por sucursal, en muestras con su hora (como mucho ~2.500 antes de la ancla). */
function mundoGrupo(hasta: number): Mundo {
  const datos = datosEmpresa("grupo")
  const x = datos.extras.tipo === "grupo" ? datos.extras : null
  const hoy = datos.dias[datos.dias.length - 1]
  const sedes: Sede[] = datos.sucursales.map((s) => ({ id: s.id, nombre: s.nombre, codigo: s.codigo, tipo: s.tipo, lat: s.lat, lng: s.lng, puestos: Math.max(1, s.puestos) }))
  const totalTickets = hoy.tickets.reduce((a, b) => a + b, 0) || 1
  const f = Math.min(1, 2500 / totalTickets)
  const horaAncla = (ANCLA_MS - INICIO_DIA) / HORA
  const ventas: Venta[] = []
  sedes.forEach((s, i) => {
    const n = Math.max(1, Math.round(hoy.tickets[i] * f))
    for (let k = 0; k < n; k++) {
      const hora = horaSegun(CURVAS.grupo, u01("forja-grupo", i, k), horaAncla)
      ventas.push({ t: INICIO_DIA + hora * HORA, sede: i, importe: Math.round(hoy.porSucursal[i] / n), puesto: 1 + (hash("puesto", i, k) % s.puestos) })
    }
  })
  for (const e of eventosEntre("grupo", datos, ANCLA_MS, hasta)) if (e.tipo === "venta") ventas.push({ t: e.t, sede: e.sucursal, importe: e.monto, puesto: 1 + (hash(e.id) % sedes[e.sucursal].puestos) })
  ventas.sort((a, b) => a.t - b.t)
  const ultimos = datos.dias.slice(-28)
  const facturacion28 = sedes.map((_, i) => ultimos.reduce((a, d) => a + (d.porSucursal[i] ?? 0), 0))
  const tickets28 = sedes.map((_, i) => Math.round(ultimos.reduce((a, d) => a + (d.tickets[i] ?? 0), 0) * f))
  // Transferencias del día entre sucursales de la misma provincia (las que están en viaje se ven en el mapa).
  const transferencias: TransferenciaForja[] = []
  const flujos: FlujoForja[] = []
  const porProvincia = new Map<string, number[]>()
  datos.sucursales.forEach((s, i) => porProvincia.set(s.provincia, [...(porProvincia.get(s.provincia) ?? []), i]))
  let n = 0
  for (const [, idx] of porProvincia) {
    for (let j = 1; j < idx.length; j++) {
      const desde = idx[0]
      const hacia = idx[j]
      flujos.push({ desdeId: sedes[desde].id, haciaId: sedes[hacia].id, transferencias: 2 + (hash("flujo", desde, hacia) % 9), unidades: 40 + (hash("unid", desde, hacia) % 400) })
      if (hash("viaje", desde, hacia) % 3 !== 0 || n >= 12) continue
      n++
      const despachada = ANCLA_MS - (1 + (hash("desp", n) % 4)) * HORA
      transferencias.push({
        id: `tr-g-${n}`,
        desdeId: sedes[desde].id,
        haciaId: sedes[hacia].id,
        estado: "en_transito",
        despachadaEn: iso(despachada),
        llegadaEstimada: iso(despachada + (3 + (hash("lleg", n) % 4)) * HORA),
        recibidaEn: null,
        items: datos.productos.slice((n * 7) % 200, ((n * 7) % 200) + 3).map((p) => ({ productoId: p.id, nombre: p.nombre, cantidad: 4 + (hash("cant", n, p.id) % 30) })),
        motivo: "Reposición entre sucursales",
      })
    }
  }
  return { sedes, ventas, facturacion28, tickets28, criticos: x?.stockCriticoPorSucursal ?? sedes.map(() => 0), transferencias, flujos, nombreOrg: "Grupo Cordal" }
}

/** La distribuidora: el depósito y las 12 zonas; cada pedido de la calle es una "venta" de su zona. */
function mundoDistribuidora(hasta: number): Mundo {
  const datos = datosEmpresa("distribuidora")
  const x = datos.extras.tipo === "distribuidora" ? datos.extras : null
  const dep = datos.sucursales[0]
  const sedes: Sede[] = [
    { id: dep.id, nombre: dep.nombre, codigo: dep.codigo, tipo: "deposito", lat: dep.lat, lng: dep.lng, puestos: 1 },
    ...ZONAS_DISTRIBUIDORA.map((z, i) => ({ id: `d-zona-${i}`, nombre: `Zona ${z}`, codigo: `Z${String(i + 1).padStart(2, "0")}`, tipo: "sucursal" as const, lat: COORDENADAS_ZONA[z][0], lng: COORDENADAS_ZONA[z][1], puestos: 1 })),
  ]
  const ventas: Venta[] = (x?.pedidosHoy ?? []).map((p) => ({ t: Date.parse(p.t), sede: 1 + p.preventista, importe: p.monto, puesto: 1 }))
  for (const e of eventosEntre("distribuidora", datos, ANCLA_MS, hasta)) {
    if (e.tipo !== "pedido") continue
    const i = x?.preventistas.findIndex((p) => p.nombre === e.quien) ?? -1
    ventas.push({ t: e.t, sede: i >= 0 ? 1 + i : 1 + (hash(e.id) % 12), importe: e.monto, puesto: 1 })
  }
  ventas.sort((a, b) => a.t - b.t)
  const porZona = sedes.map((_, i) => ventas.filter((v) => v.sede === i))
  const facturacion28 = sedes.map((_, i) => (i === 0 ? 0 : porZona[i].reduce((a, v) => a + v.importe, 0) * 20))
  const tickets28 = sedes.map((_, i) => (i === 0 ? 0 : Math.max(1, porZona[i].length * 20)))
  // Los camiones del reparto: del depósito a las zonas que visitan (en viaje mientras les quedan paradas).
  const transferencias: TransferenciaForja[] = (x?.reparto ?? []).map((r, k) => {
    const hacia = 1 + (hash("camion-zona", k) % 12)
    const pendientes = r.paradas.filter((p) => p.estado !== "entregado").length
    const salida = INICIO_DIA + (7.5 + k * 0.25) * HORA
    return {
      id: `tr-d-${k + 1}`,
      desdeId: dep.id,
      haciaId: sedes[hacia].id,
      estado: pendientes > 0 ? "en_transito" : "recibida",
      despachadaEn: iso(salida),
      llegadaEstimada: iso(ANCLA_MS + pendientes * 0.4 * HORA),
      recibidaEn: pendientes > 0 ? null : iso(ANCLA_MS - HORA),
      items: [{ productoId: `camion-${k + 1}`, nombre: `Camión ${k + 1} · ${r.chofer} · ${r.paradas.length} paradas`, cantidad: r.paradas.length }],
      motivo: "Reparto del día",
    }
  })
  const flujos: FlujoForja[] = sedes.slice(1).map((s, i) => ({ desdeId: dep.id, haciaId: s.id, transferencias: 8 + (hash("rep", i) % 14), unidades: 120 + (hash("u", i) % 600) }))
  return { sedes, ventas, facturacion28, tickets28, criticos: sedes.map((_, i) => (i === 0 ? datos.productos.filter((p) => p.stock <= p.minimo).length : 0)), transferencias, flujos, nombreOrg: "Distribuidora Ruta Clara" }
}

function mundo(id: IdForjaDemo, hasta: number) {
  return id === "grupo" ? mundoGrupo(hasta) : mundoDistribuidora(hasta)
}

/** La red tal como está a la hora `t` (para "ahora" y para la repetición del día). */
function redEn(m: Mundo, id: IdForjaDemo, t: number): RedForja {
  const nodos: NodoForja[] = m.sedes.map((s, i) => {
    const propias = m.ventas.filter((v) => v.sede === i && v.t <= t)
    const ultimaHora = propias.filter((v) => v.t > t - HORA).length
    const promedioHora = m.tickets28[i] / 28 / HORAS_HABILES
    const esDeposito = s.tipo === "deposito"
    return {
      id: s.id,
      nombre: s.nombre,
      codigo: s.codigo,
      tipo: s.tipo,
      lat: s.lat,
      lng: s.lng,
      demo: true,
      puestos: s.puestos,
      ventasHoy: propias.length,
      importeHoy: propias.reduce((a, v) => a + v.importe, 0),
      ventasUltimaHora: ultimaHora,
      promedioHora,
      calor: esDeposito ? 0.8 : calorRelativo(ultimaHora, promedioHora),
      facturacion28: m.facturacion28[i],
      presupuestosAbiertos: 0,
      stockCritico: m.criticos[i] ?? 0,
      sinStock: Math.round((m.criticos[i] ?? 0) * 0.25),
      productosConMinimo: id === "grupo" ? 620 : esDeposito ? 400 : 0,
      ordenes: {},
      colaSinConexion: 0,
    }
  })
  const transferencias = m.transferencias.filter((tr) => Date.parse(tr.despachadaEn) <= t)
  return { org: { id: `demo-${id}`, nombre: m.nombreOrg, esDemo: true }, nodos, transferencias, flujos: m.flujos, generadoEn: iso(t) }
}

function eventos(m: Mundo, t: number): EventoForja[] {
  const desde = INICIO_DIA
  const lista: EventoForja[] = m.ventas
    .filter((v) => v.t >= desde && v.t <= t)
    .map((v, k) => ({ id: `v-${k}-${v.t}`, en: iso(v.t), tipo: "venta" as const, sucursalId: m.sedes[v.sede].id, puesto: v.puesto, importe: v.importe, sinConexion: false }))
  for (const tr of m.transferencias) {
    const en = Date.parse(tr.despachadaEn)
    if (en <= t) lista.push({ id: `${tr.id}-sale`, en: tr.despachadaEn, tipo: "transferencia_salida", sucursalId: tr.desdeId, transferenciaId: tr.id, desdeId: tr.desdeId, haciaId: tr.haciaId, items: tr.items.length })
  }
  return lista.sort((a, b) => a.en.localeCompare(b.en))
}

/**
 * El local por dentro, según el rubro: en el grupo, una sucursal de la cadena (salón y depósito, cajas y carga);
 * en la distribuidora, el depósito con sus andenes y camiones. Una zona de reparto no es un edificio: muestra el
 * depósito con los camiones que van hacia esa zona.
 */
function taller(m: Mundo, id: IdForjaDemo, sedeId: string, t: number): TallerForja | null {
  const pedida = m.sedes.findIndex((s) => s.id === sedeId)
  if (pedida < 0) return null
  const i = id === "distribuidora" ? 0 : pedida
  const s = m.sedes[i]
  const datos = datosEmpresa(id)
  const propias = m.ventas.filter((v) => v.sede === i && v.t <= t)
  const puestos = Array.from({ length: s.puestos }, (_, p) => {
    const delPuesto = propias.filter((v) => v.puesto === p + 1)
    return { puesto: p + 1, ventasHoy: delPuesto.length, importeHoy: delPuesto.reduce((a, v) => a + v.importe, 0), cajaAbierta: true, sinConexion: 0, ultimaVenta: delPuesto.length ? iso(delPuesto[delPuesto.length - 1].t) : null }
  })
  const categorias = [...new Set(datos.productos.map((p) => p.categoria))].slice(0, 8)
  const indice = new Map(datos.productos.map((p, k) => [p.id, k]))
  // Cada categoría, una sección con cuatro racks (A a D) de hasta 10 productos.
  const racks: RackForja[] = categorias.flatMap((cat, c) =>
    [0, 1, 2, 3].map((letra) => rackDe(cat, c, letra)),
  )
  function rackDe(cat: string, c: number, letra: number): RackForja {
    const codigo = `${cat.slice(0, 2).toUpperCase()}${c}`
    const productos = datos.productos
      .filter((p) => p.categoria === cat)
      .slice(letra * 10, letra * 10 + 10)
      .map((p, j) => {
        // En el grupo, el stock de esta sucursal (el mismo que muestra la demo); en la distribuidora, el del depósito.
        const cantidad = id === "grupo" ? stockGrupo(indice.get(p.id) ?? 0, i) : Math.max(0, p.stock + (hash(sedeId, p.id) % 9) - 4)
        const ilustracion = ILUSTRACIONES[hash(cat) % ILUSTRACIONES.length] as Ilustracion
        return { productoId: p.id, nombre: p.nombre, sku: p.sku, cantidad, minimo: Math.max(1, Math.round(p.minimo / (id === "grupo" ? 40 : 1))), estante: 1 + (j % 12), ilustracion }
      })
    const niveles = Array.from({ length: 12 }, (_, e) => {
      const del = productos.filter((p) => p.estante === e + 1)
      return del.length ? Math.min(1, del.reduce((a, p) => a + p.cantidad / Math.max(1, p.minimo * 3), 0) / del.length) : 0
    })
    return {
      id: `${codigo}-${String.fromCharCode(65 + letra)}`,
      categoria: codigo,
      categoriaNombre: cat,
      // La letra del rack (A, B, C, D): el plano la usa para ubicarlo en su sección.
      pasillo: String.fromCharCode(65 + letra),
      productos,
      unidades: productos.reduce((a, p) => a + p.cantidad, 0),
      criticos: productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.minimo).length,
      sinStock: productos.filter((p) => p.cantidad <= 0).length,
      niveles,
    }
  }
  const muelle: TallerForja["muelle"] =
    id === "distribuidora"
      ? [
          // Los camiones del reparto (los que están en la calle dejan el andén vacío) y dos que cargan para mañana.
          ...m.transferencias
            .filter((tr) => pedida === 0 || tr.haciaId === sedeId)
            .map((tr) => ({ id: tr.id, tipo: "transferencia" as const, estado: tr.estado, detalle: tr.items.map((it) => it.nombre).join(" · "), franja: null, destinoId: tr.haciaId })),
          ...(pedida === 0
            ? [5, 6].map((n) => ({ id: `camion-${n}`, tipo: "transferencia" as const, estado: "pendiente" as const, detalle: `Camión ${n} · cargando los pedidos de mañana`, franja: "mañana" as const, destinoId: null }))
            : []),
        ]
      : m.transferencias
          .filter((tr) => tr.estado === "en_transito" && (tr.desdeId === sedeId || tr.haciaId === sedeId))
          .map((tr) => ({ id: tr.id, tipo: "transferencia" as const, estado: "en_transito" as const, detalle: tr.items.map((it) => it.nombre).join(" · "), franja: null, destinoId: tr.haciaId }))
  return { rubro: id === "grupo" ? "sucursal" : "distribuidora", sucursalId: sedeId, puestos: id === "distribuidora" ? [] : puestos, racks, bancos: [], muelle }
}

/**
 * La fuente de Forja para una empresa de la demo, a la hora `ahora` del reloj de la demo.
 * `desfase` lleva la escena a esa hora (la demo vive el viernes 16 de octubre a la tarde).
 */
export function fuenteForjaDemo(id: IdForjaDemo, ahora: number, relojReal: number = Date.now()): FuenteForja {
  const m = mundo(id, ahora)
  return {
    red: redEn(m, id, ahora),
    redEn: (fecha) => redEn(m, id, Math.min(ahora, fecha.getTime())),
    eventos: eventos(m, ahora),
    taller: (sedeId) => taller(m, id, sedeId, ahora),
    pieza: () => null,
    simulacion: true,
    propuesta: false,
    enlaces: null,
    desfase: ahora - relojReal,
  }
}
