/**
 * La implementación "de la app" del modelo de lectura (src/dominio/negocio.ts): arma DatosNegocio desde el
 * estado de una empresa (la réplica local, o el seed). Con esta misma función se exporta la ferretería de la
 * demo a src/demo/ferreteria-snapshot.json: la demo y la app leen el mismo modelo.
 */
import type { DatosNegocio, DiaVentas, MedioPago as MedioNegocio, SucursalNegocio } from "@/dominio/negocio"
import { saldoCliente, stockDe, type EstadoEmpresa } from "@/dominio/estado"
import type { MedioPago, Venta } from "@/dominio/tipos"

const MEDIO: Record<MedioPago, MedioNegocio> = {
  efectivo: "efectivo",
  debito: "tarjeta",
  credito: "tarjeta",
  transferencia: "transferencia",
  mercadopago: "qr",
  cuenta_corriente: "cuenta",
}

/** Día argentino "AAAA-MM-DD" de una fecha ISO. */
function diaAR(iso: string) {
  return new Date(Date.parse(iso) - 3 * 3600000).toISOString().slice(0, 10)
}

export function datosNegocioDesdeEstado(e: EstadoEmpresa, ahora: Date, { dias = 90, empresaId = e.org.slug } = {}): DatosNegocio {
  const sucursales: SucursalNegocio[] = e.sucursales.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    nombre: s.nombre,
    ciudad: s.direccion.split(",").at(-1)?.trim() || s.nombre,
    provincia: "Buenos Aires",
    lat: s.lat ?? -34.6,
    lng: s.lng ?? -58.4,
    tipo: s.tipo,
    puestos: s.puestos,
    tamano: 1,
  }))
  const indice = new Map(e.sucursales.map((s, i) => [s.id, i]))
  const hoy = diaAR(ahora.toISOString())
  const claves = Array.from({ length: dias }, (_, i) => new Date(Date.parse(`${hoy}T12:00:00Z`) - (dias - 1 - i) * 86400000).toISOString().slice(0, 10))
  const porDia = new Map<string, DiaVentas>(claves.map((f) => [f, { fecha: f, porSucursal: sucursales.map(() => 0), tickets: sucursales.map(() => 0), costo: 0 }]))
  const hoyPorHora = Array.from({ length: 24 }, () => 0)
  const confirmadas: Venta[] = Object.values(e.ventas).filter((v) => v.estado === "confirmada" && Date.parse(v.fecha) <= ahora.getTime())
  const desde30 = Date.parse(`${claves[Math.max(0, claves.length - 30)]}T03:00:00Z`)
  const vendidos = new Map<string, { unidades: number; importe: number }>()
  for (const v of confirmadas) {
    const dia = porDia.get(diaAR(v.fecha))
    const i = indice.get(v.sucursalId) ?? 0
    if (dia) {
      dia.porSucursal[i] += v.total
      dia.tickets[i]++
      dia.costo += v.items.reduce((a, it) => a + it.costoUnitario * it.cantidad, 0)
    }
    if (diaAR(v.fecha) === hoy) hoyPorHora[new Date(Date.parse(v.fecha) - 3 * 3600000).getUTCHours()] += v.total
    if (Date.parse(v.fecha) >= desde30) {
      for (const it of v.items) {
        const x = vendidos.get(it.productoId) ?? { unidades: 0, importe: 0 }
        x.unidades += it.cantidad
        x.importe += it.precioUnitario * it.cantidad
        vendidos.set(it.productoId, x)
      }
    }
  }
  const listaBase = e.listas[0]?.id
  const categorias = new Map(e.categorias.map((c) => [c.id, c.nombre]))
  const proveedores = new Map(e.proveedores.map((p) => [p.id, p.nombre]))
  const productos = Object.values(e.productos).map((p) => {
    const stock = e.sucursales.reduce((a, s) => a + stockDe(e, s.id, p.id), 0)
    const minimo = e.sucursales.reduce((a, s) => a + (e.stock[`${s.id}:${p.id}`]?.minimo ?? 0), 0)
    return {
      id: p.id,
      sku: p.sku,
      codigo: p.codigoBarras,
      nombre: p.nombre,
      categoria: categorias.get(p.categoriaId) ?? "",
      precio: listaBase ? (e.precios[`${listaBase}:${p.id}`]?.precio ?? 0) : 0,
      costo: p.costo,
      stock,
      minimo,
      unidad: p.unidad,
      proveedor: proveedores.get(p.proveedorId) ?? "",
    }
  })
  const stockCritico = Object.values(e.stock)
    .filter((s) => s.cantidad <= s.minimo)
    .slice(0, 80)
    .map((s) => ({ productoId: s.productoId, sucursal: indice.get(s.sucursalId) ?? 0, stock: s.cantidad, minimo: s.minimo }))
  const clientes = Object.values(e.clientes).map((c) => {
    const saldo = saldoCliente(e, c.id)
    const movs = e.movimientosCuenta.filter((m) => m.clienteId === c.id && m.importe > 0)
    const masViejo = movs.length ? Math.min(...movs.map((m) => Date.parse(m.fecha))) : null
    return {
      id: c.id,
      nombre: c.nombre,
      zona: c.direccion.split(",").at(-1)?.trim() ?? "",
      saldo,
      limite: c.limiteCredito,
      diasDeuda: saldo > 0 && masViejo ? Math.floor((ahora.getTime() - masViejo) / 86400000) : 0,
      telefono: c.telefono,
      lista: e.listas.find((l) => l.id === c.listaId)?.nombre ?? "",
    }
  })
  const recientes = confirmadas
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 14)
    .map((v) => ({ id: v.id, t: v.fecha, sucursal: indice.get(v.sucursalId) ?? 0, monto: v.total, items: v.items.length, medio: MEDIO[v.pagos[0]?.medio ?? "efectivo"], detalle: v.items[0]?.descripcion ?? "" }))
  const nombreCliente = (id: string | null) => (id ? (e.clientes[id]?.nombre ?? "Cliente") : "Consumidor final")
  return {
    empresaId,
    ahora: ahora.toISOString(),
    sucursales,
    productos,
    clientes,
    dias: claves.map((f) => porDia.get(f)!),
    hoyPorHora,
    top: [...vendidos.entries()]
      .sort((a, b) => b[1].importe - a[1].importe)
      .slice(0, 10)
      .map(([productoId, x]) => ({ productoId, ...x })),
    recientes,
    stockCritico,
    extras: {
      tipo: "comercio",
      negocios: e.negocios.map((n) => ({ id: n.id, nombre: n.nombre, sucursales: e.sucursales.flatMap((s, i) => (s.negocioId === n.id ? [i] : [])) })),
      presupuestos: Object.values(e.presupuestos)
        .filter((p) => p.estado === "enviado" || p.estado === "borrador" || p.estado === "aceptado")
        .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))
        .slice(0, 12)
        .map((p) => ({
          id: p.id,
          numero: p.numero ? `P-${String(p.numero).padStart(5, "0")}` : p.numeroLocal,
          cliente: p.clienteNombre || nombreCliente(p.clienteId),
          monto: p.total,
          vence: p.vencimiento,
          estado: Date.parse(p.vencimiento) - ahora.getTime() < 3 * 86400000 ? "por-vencer" : "abierto",
        })),
      servicio: Object.values(e.servicio)
        .filter((o) => o.estado !== "entregado")
        .slice(0, 12)
        .map((o) => ({
          id: o.id,
          numero: o.numero ? `ST-${String(o.numero).padStart(5, "0")}` : o.numeroLocal,
          cliente: nombreCliente(o.clienteId),
          equipo: `${o.equipo.marca} ${o.equipo.modelo}`.trim(),
          estado: o.estado === "listo" ? "listo" : o.estado === "en_reparacion" ? "reparacion" : o.estado === "ingresado" ? "ingresado" : "diagnostico",
          tecnico: e.usuarios.find((u) => u.id === o.tecnicoId)?.nombre ?? "Sin asignar",
        })),
      transferencias: Object.values(e.transferencias)
        .sort((a, b) => b.despachadaEn.localeCompare(a.despachadaEn))
        .slice(0, 10)
        .map((t, i) => ({ id: t.id, numero: `TR-${String(2100 + i).padStart(5, "0")}`, desde: indice.get(t.desdeId) ?? 0, hasta: indice.get(t.haciaId) ?? 0, items: t.items.length, estado: t.estado === "recibida" ? "recibida" : "en-viaje" })),
    },
  }
}
