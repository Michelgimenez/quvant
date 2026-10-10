import { cajaAbierta, efectivoEsperado } from "@/dominio/caja"
import { formatoCantidad, formatoPesos } from "@/dominio/dinero"
import { claveStock, clavePrecio, precioDe, saldoCliente, siguienteNumero, type EstadoEmpresa } from "@/dominio/estado"
import { puedeAsignarRol, tienePermiso } from "@/dominio/permisos"
import { calcularAumento } from "@/dominio/precios"
import { ESTADOS_CON_AVISO, mensajeAvisoServicio, NOMBRE_ESTADO_SERVICIO, puedeTransicionar } from "@/dominio/servicio"
import { MEDIOS_PAGO, MODULOS, type Id, type ItemComercial, type Modulo, type Producto, type TipoMovimiento, type Venta } from "@/dominio/tipos"
import { totalItems, totalPagos } from "@/dominio/ventas"
import { hashTexto } from "@/lib/azar"
import { esHexValido } from "@/lib/color"
import { PERMISO_OPERACION, type CodigoRechazo, type Contexto, type DatosOp, type Operacion, type Resultado, type TipoOp, type VentaNueva } from "./tipos"

/**
 * Reductores: aplican una operación sobre el estado de la empresa.
 *
 * Reglas:
 *  1. Primero se valida TODO; recién después se modifica el estado. Si una
 *     operación se rechaza, el estado queda intacto.
 *  2. Son determinísticos: con el mismo estado y la misma operación, el mismo
 *     resultado. Así el navegador puede reconstruir exactamente lo que hizo el
 *     servidor reaplicando las operaciones confirmadas en orden.
 *  3. Resolución de conflictos (documentada en docs/ARQUITECTURA.md):
 *     - Ventas: SIEMPRE se aceptan (la venta ya ocurrió en el mostrador). Stock
 *       negativo, precio distinto de lista, límite excedido o caja cerrada
 *       quedan como ADVERTENCIAS en la venta para revisar.
 *     - Stock: se aplican deltas, no valores absolutos (las operaciones conmutan).
 *     - Presupuesto → venta: solo una conversión gana; la segunda se rechaza.
 *     - Caja: cerrar una caja ya cerrada se rechaza.
 *     - Fichas (clientes, productos): última escritura gana por campo; si el
 *       campo cambió desde otro puesto se informa el conflicto.
 *     - Servicio técnico: las transiciones inválidas se rechazan.
 */

class Rechazo extends Error {
  constructor(
    public codigo: CodigoRechazo,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

function rechazar(codigo: CodigoRechazo, mensaje: string): never {
  throw new Rechazo(codigo, mensaje)
}

function exigir(condicion: unknown, codigo: CodigoRechazo, mensaje: string): asserts condicion {
  if (!condicion) rechazar(codigo, mensaje)
}

type Salida = { avisos?: string[]; asignado?: Record<string, number | string> } | void
type Manejador<T extends TipoOp> = (e: EstadoEmpresa, d: DatosOp[T], ctx: Contexto, op: Operacion<T>) => Salida

const MODULO_DE_OPERACION: Partial<Record<string, Modulo>> = {
  venta: "mostrador",
  presupuesto: "presupuestos",
  stock: "inventario",
  conteo: "inventario",
  precios: "precios",
  precio: "precios",
  cliente: "clientes",
  cuenta: "clientes",
  servicio: "servicio",
  compra: "compras",
  entrega: "entregas",
  caja: "mostrador",
}

function puedeSucursal(ctx: Contexto, sucursalId: Id) {
  return ctx.usuario.sucursalIds === null || ctx.usuario.sucursalIds.includes(sucursalId)
}

function sucursalDe(e: EstadoEmpresa, id: Id) {
  return e.sucursales.find((s) => s.id === id)
}

function exigirSucursal(e: EstadoEmpresa, ctx: Contexto, id: Id) {
  const s = sucursalDe(e, id)
  exigir(s, "no_existe", "La sucursal no existe")
  exigir(puedeSucursal(ctx, id), "sucursal", `No tenés permiso en ${s.nombre}`)
  return s
}

/** Número definitivo: el que ya asignó el servidor, o el siguiente (modo servidor), o null (local). */
function numeroDefinitivo(e: EstadoEmpresa, ctx: Contexto, clave: string): number | null {
  const asignado = ctx.asignado?.numero
  if (typeof asignado === "number") {
    e.numeradores[clave] = Math.max(e.numeradores[clave] ?? 0, asignado)
    return asignado
  }
  return ctx.modo === "servidor" ? siguienteNumero(e, clave) : null
}

function auditar(e: EstadoEmpresa, ctx: Contexto, op: Operacion, entidad: string, entidadId: Id | null, resumen: string) {
  e.auditoria.unshift({
    id: `${op.id}:a`,
    orgId: e.org.id,
    fecha: ctx.ahora,
    usuarioId: op.usuarioId,
    accion: op.tipo,
    entidad,
    entidadId,
    resumen,
    origen: op.sinConexion ? "sin_conexion" : "en_linea",
  })
}

function moverStock(
  e: EstadoEmpresa,
  op: Operacion,
  ctx: Contexto,
  sucursalId: Id,
  productoId: Id,
  cantidad: number,
  tipo: TipoMovimiento,
  refId: Id | null,
  motivo: string,
  sufijo: string,
) {
  const k = claveStock(sucursalId, productoId)
  const st = (e.stock[k] ??= { orgId: e.org.id, sucursalId, productoId, cantidad: 0, minimo: 0, ubicacion: "" })
  st.cantidad = Math.round((st.cantidad + cantidad) * 1000) / 1000
  e.movimientos.push({
    id: `${op.id}:m${sufijo}`,
    orgId: e.org.id,
    sucursalId,
    productoId,
    tipo,
    cantidad,
    refId,
    motivo,
    usuarioId: op.usuarioId,
    fecha: ctx.ahora,
  })
  return st.cantidad
}

/** CAE emulado (14 dígitos), determinístico a partir del id. Nunca es un CAE real. */
function caeEmulado(id: Id) {
  const a = hashTexto(id).toString().padStart(10, "0")
  const b = hashTexto(`${id}:cae`).toString().padStart(10, "0")
  return (a + b).slice(0, 14)
}

function validarItems(e: EstadoEmpresa, items: ItemComercial[]) {
  exigir(Array.isArray(items) && items.length > 0, "invalida", "La operación no tiene ítems")
  exigir(items.length <= 300, "invalida", "Demasiados ítems")
  for (const it of items) {
    exigir(e.productos[it.productoId], "no_existe", `Producto inexistente: ${it.descripcion}`)
    exigir(Number.isFinite(it.cantidad) && it.cantidad > 0 && it.cantidad < 1e6, "invalida", `Cantidad inválida en ${it.descripcion}`)
    exigir(Number.isInteger(it.precioUnitario) && it.precioUnitario >= 0, "invalida", `Precio inválido en ${it.descripcion}`)
    exigir(it.descuentoPct >= 0 && it.descuentoPct <= 100, "invalida", `Descuento inválido en ${it.descripcion}`)
  }
}

// ───────────────────────────── Ventas ─────────────────────────────

function validarVentaNueva(e: EstadoEmpresa, v: VentaNueva, ctx: Contexto) {
  const s = exigirSucursal(e, ctx, v.sucursalId)
  exigir(!e.ventas[v.id], "duplicada", "La venta ya existe")
  exigir(e.listas.some((l) => l.id === v.listaId), "no_existe", "Lista de precios inexistente")
  exigir(v.clienteId === null || e.clientes[v.clienteId], "no_existe", "Cliente inexistente")
  exigir(Number.isInteger(v.puesto) && v.puesto >= 1 && v.puesto <= s.puestos, "invalida", "Puesto de mostrador inválido")
  validarItems(e, v.items)
  for (const p of v.pagos) {
    exigir(MEDIOS_PAGO.includes(p.medio), "invalida", "Medio de pago inválido")
    exigir(Number.isInteger(p.importe) && p.importe >= 0, "invalida", "Importe de pago inválido")
  }
  const total = totalItems(v.items)
  exigir(totalPagos(v.pagos) === total, "invalida", `Los pagos (${formatoPesos(totalPagos(v.pagos))}) no coinciden con el total (${formatoPesos(total)})`)
  const enCuenta = v.pagos.filter((p) => p.medio === "cuenta_corriente").reduce((t, p) => t + p.importe, 0)
  exigir(enCuenta === 0 || v.clienteId, "invalida", "Cuenta corriente requiere un cliente")
  if (v.entrega) exigir(v.entrega.direccion.trim().length > 3, "invalida", "Falta la dirección de entrega")
  return { s, total, enCuenta }
}

function crearVenta(e: EstadoEmpresa, v: VentaNueva, ctx: Contexto, op: Operacion, presupuestoId: Id | null) {
  const { s, total, enCuenta } = validarVentaNueva(e, v, ctx)
  // ── a partir de acá no se rechaza: se aplica ──
  const advertencias: string[] = []
  const cliente = v.clienteId ? e.clientes[v.clienteId] : null
  const numero = numeroDefinitivo(e, ctx, `venta:${s.codigo}`)
  const items = v.items.map((it) => ({ ...it, costoUnitario: e.productos[it.productoId].costo }))

  for (const it of items) {
    const p = e.productos[it.productoId]
    const lista = precioDe(e, v.listaId, it.productoId)
    if (lista && it.precioUnitario !== lista) {
      advertencias.push(`precio_distinto: ${p.sku} vendido a ${formatoPesos(it.precioUnitario)}, lista ${formatoPesos(lista)}`)
    }
  }
  if (cliente && enCuenta > 0) {
    const saldo = saldoCliente(e, cliente.id)
    if (saldo + enCuenta > cliente.limiteCredito) {
      advertencias.push(`limite_excedido: ${cliente.nombre} supera su límite en ${formatoPesos(saldo + enCuenta - cliente.limiteCredito)}`)
    }
  }
  if (!cajaAbierta(e, s.id, v.puesto)) advertencias.push(`caja_cerrada: no había caja abierta en el puesto ${v.puesto}`)

  const venta: Venta = {
    id: v.id,
    orgId: e.org.id,
    negocioId: s.negocioId,
    sucursalId: s.id,
    puesto: v.puesto,
    numero,
    numeroLocal: v.numeroLocal,
    fecha: v.fecha,
    clienteId: v.clienteId,
    listaId: v.listaId,
    items,
    total,
    pagos: v.pagos,
    estado: "confirmada",
    comprobante: {
      tipo: cliente?.condicionIva === "RI" ? "FA" : "FB",
      cae: ctx.modo === "servidor" ? caeEmulado(v.id) : null,
      emulado: true,
    },
    presupuestoId,
    vendedorId: op.usuarioId,
    origen: op.sinConexion ? "sin_conexion" : "en_linea",
    entrega: Boolean(v.entrega),
    advertencias,
  }
  e.ventas[v.id] = venta

  items.forEach((it, i) => {
    const queda = moverStock(e, op, ctx, s.id, it.productoId, -it.cantidad, "venta", v.id, `Venta ${numero ? `#${numero}` : v.numeroLocal}`, String(i))
    if (queda < 0) advertencias.push(`stock_negativo: ${e.productos[it.productoId].sku} queda en ${formatoCantidad(queda)} en ${s.nombre}`)
  })
  if (cliente && enCuenta > 0) {
    e.movimientosCuenta.push({
      id: `${op.id}:cc`,
      orgId: e.org.id,
      clienteId: cliente.id,
      fecha: v.fecha,
      tipo: "venta",
      importe: enCuenta,
      refId: v.id,
      descripcion: `Venta ${numero ? `#${numero}` : v.numeroLocal}`,
    })
  }
  if (v.entrega) {
    e.entregas[v.entrega.id] = {
      id: v.entrega.id,
      orgId: e.org.id,
      sucursalId: s.id,
      ventaId: v.id,
      clienteId: v.clienteId,
      destinatario: v.entrega.destinatario,
      direccion: v.entrega.direccion,
      telefono: v.entrega.telefono,
      fechaProgramada: v.entrega.fechaProgramada,
      franja: v.entrega.franja,
      estado: "pendiente",
      chofer: "",
      orden: Object.values(e.entregas).filter((x) => x.estado === "pendiente").length + 1,
      notas: v.entrega.notas,
      actualizadoEn: ctx.ahora,
    }
  }
  auditar(e, ctx, op, "venta", v.id, `Venta ${numero ? `#${numero}` : v.numeroLocal} · ${formatoPesos(total)}${advertencias.length ? ` · ${advertencias.length} advertencia(s)` : ""}`)
  return { venta, advertencias }
}

const ventaCrear: Manejador<"venta.crear"> = (e, d, ctx, op) => {
  const { venta, advertencias } = crearVenta(e, d.venta, ctx, op, null)
  return { avisos: advertencias, asignado: venta.numero ? { numero: venta.numero } : undefined }
}

const ventaAnular: Manejador<"venta.anular"> = (e, d, ctx, op) => {
  const v = e.ventas[d.ventaId]
  exigir(v, "no_existe", "La venta no existe")
  exigir(puedeSucursal(ctx, v.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(v.estado === "confirmada", "estado", "La venta ya estaba anulada")
  exigir(d.motivo.trim().length >= 3, "invalida", "Indicá el motivo de la anulación")
  v.estado = "anulada"
  v.items.forEach((it, i) => moverStock(e, op, ctx, v.sucursalId, it.productoId, it.cantidad, "anulacion", v.id, `Anulación venta #${v.numero ?? v.numeroLocal}`, String(i)))
  const enCuenta = v.pagos.filter((p) => p.medio === "cuenta_corriente").reduce((t, p) => t + p.importe, 0)
  if (enCuenta > 0 && v.clienteId) {
    e.movimientosCuenta.push({ id: `${op.id}:nc`, orgId: e.org.id, clienteId: v.clienteId, fecha: ctx.ahora, tipo: "nota_credito", importe: -enCuenta, refId: v.id, descripcion: `Anulación venta #${v.numero ?? v.numeroLocal}` })
  }
  auditar(e, ctx, op, "venta", v.id, `Anulación venta #${v.numero ?? v.numeroLocal} · ${d.motivo}`)
}

// ───────────────────────────── Presupuestos ─────────────────────────────

const presupuestoGuardar: Manejador<"presupuesto.guardar"> = (e, d, ctx, op) => {
  const p = d.presupuesto
  const s = exigirSucursal(e, ctx, p.sucursalId)
  const existente = e.presupuestos[p.id]
  if (existente) exigir(existente.estado !== "convertido", "estado", "El presupuesto ya se convirtió en venta")
  exigir(p.clienteId === null || e.clientes[p.clienteId], "no_existe", "Cliente inexistente")
  exigir(p.clienteId || p.clienteNombre.trim().length > 1, "invalida", "Indicá el cliente")
  exigir(e.listas.some((l) => l.id === p.listaId), "no_existe", "Lista de precios inexistente")
  validarItems(e, p.items)
  const numero = existente?.numero ?? numeroDefinitivo(e, ctx, `presupuesto:${s.codigo}`)
  e.presupuestos[p.id] = {
    id: p.id,
    orgId: e.org.id,
    negocioId: s.negocioId,
    sucursalId: s.id,
    numero,
    numeroLocal: p.numeroLocal,
    fecha: existente?.fecha ?? p.fecha,
    vencimiento: p.vencimiento,
    clienteId: p.clienteId,
    clienteNombre: p.clienteId ? e.clientes[p.clienteId].nombre : p.clienteNombre.trim(),
    listaId: p.listaId,
    items: p.items.map((it) => ({ ...it, costoUnitario: e.productos[it.productoId].costo })),
    total: totalItems(p.items),
    estado: p.estado,
    ventaId: null,
    notas: p.notas,
    vendedorId: existente?.vendedorId ?? op.usuarioId,
    actualizadoEn: ctx.ahora,
  }
  auditar(e, ctx, op, "presupuesto", p.id, `${existente ? "Edición" : "Nuevo"} presupuesto ${numero ? `#${numero}` : p.numeroLocal} · ${formatoPesos(totalItems(p.items))}`)
  return numero && !existente ? { asignado: { numero } } : undefined
}

const presupuestoEstado: Manejador<"presupuesto.estado"> = (e, d, ctx, op) => {
  const p = e.presupuestos[d.presupuestoId]
  exigir(p, "no_existe", "El presupuesto no existe")
  exigir(puedeSucursal(ctx, p.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(p.estado !== "convertido", "estado", "El presupuesto ya se convirtió en venta")
  p.estado = d.estado
  p.actualizadoEn = ctx.ahora
  auditar(e, ctx, op, "presupuesto", p.id, `Presupuesto #${p.numero ?? p.numeroLocal} → ${d.estado}`)
}

const presupuestoConvertir: Manejador<"presupuesto.convertir"> = (e, d, ctx, op) => {
  const p = e.presupuestos[d.presupuestoId]
  exigir(p, "no_existe", "El presupuesto no existe")
  if (p.estado === "convertido") {
    const v = p.ventaId ? e.ventas[p.ventaId] : null
    rechazar("ya_convertido", `El presupuesto #${p.numero ?? p.numeroLocal} ya se convirtió en la venta ${v ? `#${v.numero ?? v.numeroLocal}` : ""} desde otro puesto`.trim())
  }
  exigir(p.estado !== "rechazado", "estado", "El presupuesto está rechazado")
  const vencido = p.estado === "vencido" || p.vencimiento < ctx.ahora
  const { venta, advertencias } = crearVenta(e, d.venta, ctx, op, p.id)
  p.estado = "convertido"
  p.ventaId = venta.id
  p.actualizadoEn = ctx.ahora
  auditar(e, ctx, op, "presupuesto", p.id, `Presupuesto #${p.numero ?? p.numeroLocal} → venta ${venta.numero ? `#${venta.numero}` : venta.numeroLocal}`)
  return {
    avisos: vencido ? [...advertencias, "presupuesto_vencido: se convirtió un presupuesto vencido"] : advertencias,
    asignado: venta.numero ? { numero: venta.numero } : undefined,
  }
}

// ───────────────────────────── Stock ─────────────────────────────

const stockAjustar: Manejador<"stock.ajustar"> = (e, d, ctx, op) => {
  const s = exigirSucursal(e, ctx, d.sucursalId)
  const p = e.productos[d.productoId]
  exigir(p, "no_existe", "El producto no existe")
  exigir(Number.isFinite(d.cantidad) && d.cantidad !== 0 && Math.abs(d.cantidad) < 1e6, "invalida", "Cantidad inválida")
  exigir(d.motivo.trim().length >= 3, "invalida", "Indicá el motivo del ajuste")
  const queda = moverStock(e, op, ctx, s.id, p.id, d.cantidad, "ajuste", null, d.motivo.trim(), "0")
  auditar(e, ctx, op, "producto", p.id, `Ajuste ${d.cantidad > 0 ? "+" : ""}${formatoCantidad(d.cantidad)} ${p.sku} en ${s.codigo} · ${d.motivo}`)
  return queda < 0 ? { avisos: [`stock_negativo: ${p.sku} queda en ${formatoCantidad(queda)}`] } : undefined
}

const stockTransferir: Manejador<"stock.transferir"> = (e, d, ctx, op) => {
  const desde = exigirSucursal(e, ctx, d.desdeId)
  const hacia = exigirSucursal(e, ctx, d.haciaId)
  exigir(desde.id !== hacia.id, "invalida", "Origen y destino son la misma sucursal")
  exigir(d.items.length > 0, "invalida", "La transferencia no tiene productos")
  for (const it of d.items) {
    exigir(e.productos[it.productoId], "no_existe", "Producto inexistente")
    exigir(Number.isFinite(it.cantidad) && it.cantidad > 0, "invalida", "Cantidad inválida")
  }
  const avisos: string[] = []
  d.items.forEach((it, i) => {
    const queda = moverStock(e, op, ctx, desde.id, it.productoId, -it.cantidad, "transferencia_salida", d.transferenciaId, `Transferencia a ${hacia.nombre}`, `s${i}`)
    moverStock(e, op, ctx, hacia.id, it.productoId, it.cantidad, "transferencia_entrada", d.transferenciaId, `Transferencia desde ${desde.nombre}`, `e${i}`)
    if (queda < 0) avisos.push(`stock_negativo: ${e.productos[it.productoId].sku} queda en ${formatoCantidad(queda)} en ${desde.nombre}`)
  })
  auditar(e, ctx, op, "stock", d.transferenciaId, `Transferencia ${desde.codigo} → ${hacia.codigo} · ${d.items.length} producto(s)`)
  return { avisos }
}

const stockMinimo: Manejador<"stock.minimo"> = (e, d, ctx, op) => {
  exigirSucursal(e, ctx, d.sucursalId)
  const p = e.productos[d.productoId]
  exigir(p, "no_existe", "El producto no existe")
  exigir(Number.isFinite(d.minimo) && d.minimo >= 0, "invalida", "Mínimo inválido")
  const k = claveStock(d.sucursalId, d.productoId)
  const st = (e.stock[k] ??= { orgId: e.org.id, sucursalId: d.sucursalId, productoId: d.productoId, cantidad: 0, minimo: 0, ubicacion: "" })
  st.minimo = d.minimo
  st.ubicacion = d.ubicacion.trim().slice(0, 40)
  auditar(e, ctx, op, "producto", p.id, `Mínimo ${p.sku}: ${formatoCantidad(d.minimo)}`)
}

// ───────────────────────────── Conteos ─────────────────────────────

const conteoCrear: Manejador<"conteo.crear"> = (e, d, ctx, op) => {
  exigirSucursal(e, ctx, d.sucursalId)
  exigir(!e.conteos[d.conteoId], "duplicada", "El conteo ya existe")
  exigir(d.productoIds.length > 0 && d.productoIds.length <= 2000, "invalida", "El conteo no tiene productos")
  exigir(d.nombre.trim().length > 1, "invalida", "Poné un nombre al conteo")
  e.conteos[d.conteoId] = {
    id: d.conteoId,
    orgId: e.org.id,
    sucursalId: d.sucursalId,
    fecha: ctx.ahora,
    nombre: d.nombre.trim(),
    estado: "en_curso",
    items: d.productoIds.filter((id) => e.productos[id]).map((id) => ({ productoId: id, esperado: e.stock[claveStock(d.sucursalId, id)]?.cantidad ?? 0, contado: null })),
    usuarioId: op.usuarioId,
    cerradoEn: null,
  }
  auditar(e, ctx, op, "conteo", d.conteoId, `Nuevo conteo: ${d.nombre}`)
}

const conteoRegistrar: Manejador<"conteo.registrar"> = (e, d, ctx) => {
  const c = e.conteos[d.conteoId]
  exigir(c, "no_existe", "El conteo no existe")
  exigir(puedeSucursal(ctx, c.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(c.estado === "en_curso", "estado", "El conteo ya está cerrado")
  exigir(Number.isFinite(d.contado) && d.contado >= 0, "invalida", "Cantidad contada inválida")
  const it = c.items.find((x) => x.productoId === d.productoId)
  if (it) it.contado = d.contado
  else {
    exigir(e.productos[d.productoId], "no_existe", "Producto inexistente")
    c.items.push({ productoId: d.productoId, esperado: e.stock[claveStock(c.sucursalId, d.productoId)]?.cantidad ?? 0, contado: d.contado })
  }
}

const conteoCerrar: Manejador<"conteo.cerrar"> = (e, d, ctx, op) => {
  const c = e.conteos[d.conteoId]
  exigir(c, "no_existe", "El conteo no existe")
  exigir(puedeSucursal(ctx, c.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(c.estado === "en_curso", "estado", "El conteo ya estaba cerrado")
  exigir(c.items.some((x) => x.contado !== null), "invalida", "No hay productos contados")
  let diferencias = 0
  c.items.forEach((it, i) => {
    if (it.contado === null) return
    const actual = e.stock[claveStock(c.sucursalId, it.productoId)]?.cantidad ?? 0
    it.esperado = actual
    const delta = Math.round((it.contado - actual) * 1000) / 1000
    if (delta !== 0) {
      diferencias++
      moverStock(e, op, ctx, c.sucursalId, it.productoId, delta, "conteo", c.id, `Diferencia de conteo: ${c.nombre}`, String(i))
    }
  })
  c.estado = "cerrado"
  c.cerradoEn = ctx.ahora
  auditar(e, ctx, op, "conteo", c.id, `${c.nombre} cerrado · ${diferencias} diferencia(s)`)
  return { asignado: { diferencias } }
}

// ───────────────────────────── Precios ─────────────────────────────

const preciosAumento: Manejador<"precios.aumento"> = (e, d, ctx, op) => {
  exigir(!e.aumentos.some((a) => a.id === d.aumentoId), "duplicada", "El aumento ya se aplicó")
  exigir(d.parametros.listaIds.length > 0, "invalida", "Elegí al menos una lista")
  for (const l of d.parametros.listaIds) exigir(e.listas.some((x) => x.id === l), "no_existe", "Lista inexistente")
  let vista
  try {
    vista = calcularAumento(e, d.parametros)
  } catch (err) {
    rechazar("invalida", (err as Error).message)
  }
  exigir(vista.cambios.length > 0, "invalida", "Ningún precio cambia con esos filtros")
  for (const c of vista.cambios) {
    const k = clavePrecio(c.listaId, c.productoId)
    e.precios[k] = { ...e.precios[k], precio: c.despues, actualizadoEn: ctx.ahora }
  }
  e.aumentos.unshift({
    id: d.aumentoId,
    orgId: e.org.id,
    fecha: ctx.ahora,
    usuarioId: op.usuarioId,
    descripcion: d.descripcion.trim() || `Aumento ${d.parametros.porcentaje}%`,
    filtro: d.parametros.filtro,
    porcentaje: d.parametros.porcentaje,
    listaIds: d.parametros.listaIds,
    redondeo: d.parametros.redondeo,
    cambios: vista.cambios.map(({ productoId, listaId, antes, despues }) => ({ productoId, listaId, antes, despues })),
    revertido: false,
  })
  auditar(e, ctx, op, "precios", d.aumentoId, `${d.descripcion || "Aumento"} · ${d.parametros.porcentaje > 0 ? "+" : ""}${d.parametros.porcentaje}% · ${vista.cambios.length} precios`)
  return { asignado: { cambios: vista.cambios.length, productos: vista.productos } }
}

const preciosRevertir: Manejador<"precios.revertir"> = (e, d, ctx, op) => {
  const a = e.aumentos.find((x) => x.id === d.aumentoId)
  exigir(a, "no_existe", "El aumento no existe")
  exigir(!a.revertido, "estado", "El aumento ya se revirtió")
  let omitidos = 0
  for (const c of a.cambios) {
    const k = clavePrecio(c.listaId, c.productoId)
    if (e.precios[k]?.precio === c.despues) e.precios[k] = { ...e.precios[k], precio: c.antes, actualizadoEn: ctx.ahora }
    else omitidos++
  }
  a.revertido = true
  auditar(e, ctx, op, "precios", a.id, `Reversión: ${a.descripcion}`)
  return omitidos ? { avisos: [`${omitidos} precio(s) no se revirtieron porque cambiaron después del aumento`] } : undefined
}

const precioEditar: Manejador<"precio.editar"> = (e, d, ctx, op) => {
  const p = e.productos[d.productoId]
  exigir(p, "no_existe", "El producto no existe")
  exigir(e.listas.some((l) => l.id === d.listaId), "no_existe", "Lista inexistente")
  exigir(Number.isInteger(d.precio) && d.precio >= 0 && d.precio < 1e13, "invalida", "Precio inválido")
  const k = clavePrecio(d.listaId, d.productoId)
  const antes = e.precios[k]?.precio
  e.precios[k] = { orgId: e.org.id, productoId: p.id, listaId: d.listaId, precio: d.precio, actualizadoEn: ctx.ahora }
  auditar(e, ctx, op, "precios", p.id, `Precio ${p.sku}: ${antes !== undefined ? formatoPesos(antes) : "—"} → ${formatoPesos(d.precio)}`)
}

// ───────────────────────────── Fichas ─────────────────────────────

function conflictos(actual: Record<string, unknown>, antes: Record<string, unknown> | undefined, nombre: string) {
  if (!antes) return []
  return Object.entries(antes)
    .filter(([k, v]) => JSON.stringify(actual[k]) !== JSON.stringify(v))
    .map(([k]) => `conflicto: "${k}" de ${nombre} había cambiado desde otro puesto; quedó tu versión`)
}

const productoGuardar: Manejador<"producto.guardar"> = (e, d, ctx, op) => {
  const existente = e.productos[d.productoId]
  const avisos: string[] = []
  for (const pr of d.precios ?? []) {
    exigir(Number.isInteger(pr.precio) && pr.precio >= 0, "invalida", "Precio inválido")
    exigir(e.listas.some((l) => l.id === pr.listaId), "no_existe", "Lista inexistente")
  }
  if (d.nuevo) {
    exigir(!existente, "duplicada", "El producto ya existe")
    const n = d.nuevo
    exigir(n.id === d.productoId, "invalida", "Id inconsistente")
    exigir(n.nombre.trim().length >= 2, "invalida", "Falta el nombre")
    exigir(/^[\w.\-/]{1,40}$/.test(n.sku), "invalida", "SKU inválido")
    exigir(!Object.values(e.productos).some((p) => p.sku.toLowerCase() === n.sku.toLowerCase()), "duplicada", `Ya existe un producto con SKU ${n.sku}`)
    exigir(e.categorias.some((c) => c.id === n.categoriaId), "no_existe", "Categoría inexistente")
    exigir(e.marcas.some((m) => m.id === n.marcaId), "no_existe", "Marca inexistente")
    exigir(Number.isInteger(n.costo) && n.costo >= 0, "invalida", "Costo inválido")
    e.productos[n.id] = { ...n, orgId: e.org.id, nombre: n.nombre.trim(), actualizadoEn: ctx.ahora }
  } else {
    exigir(existente, "no_existe", "El producto no existe")
    const c = d.cambios ?? {}
    if (c.nombre !== undefined) exigir(c.nombre.trim().length >= 2, "invalida", "Falta el nombre")
    if (c.costo !== undefined) exigir(Number.isInteger(c.costo) && c.costo >= 0, "invalida", "Costo inválido")
    if (c.categoriaId) exigir(e.categorias.some((x) => x.id === c.categoriaId), "no_existe", "Categoría inexistente")
    if (c.marcaId) exigir(e.marcas.some((x) => x.id === c.marcaId), "no_existe", "Marca inexistente")
    avisos.push(...conflictos(existente as unknown as Record<string, unknown>, d.antes, existente.sku))
    Object.assign(existente, c, { actualizadoEn: ctx.ahora })
  }
  for (const pr of d.precios ?? []) {
    e.precios[clavePrecio(pr.listaId, d.productoId)] = { orgId: e.org.id, productoId: d.productoId, listaId: pr.listaId, precio: pr.precio, actualizadoEn: ctx.ahora }
  }
  const p = e.productos[d.productoId]
  auditar(e, ctx, op, "producto", p.id, `${d.nuevo ? "Alta" : "Edición"} ${p.sku} · ${p.nombre}`)
  return { avisos }
}

const clienteGuardar: Manejador<"cliente.guardar"> = (e, d, ctx, op) => {
  const existente = e.clientes[d.clienteId]
  const avisos: string[] = []
  const validar = (c: Partial<{ nombre: string; cuit: string; limiteCredito: number; listaId: string; email: string }>) => {
    if (c.nombre !== undefined) exigir(c.nombre.trim().length >= 2, "invalida", "Falta el nombre")
    if (c.cuit) exigir(/^\d{2}-\d{8}-\d$/.test(c.cuit), "invalida", "CUIT con formato inválido (XX-XXXXXXXX-X)")
    if (c.limiteCredito !== undefined) exigir(Number.isInteger(c.limiteCredito) && c.limiteCredito >= 0, "invalida", "Límite inválido")
    if (c.listaId) exigir(e.listas.some((l) => l.id === c.listaId), "no_existe", "Lista inexistente")
    if (c.email) exigir(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email), "invalida", "Email inválido")
  }
  if (d.nuevo) {
    exigir(!existente, "duplicada", "El cliente ya existe")
    validar(d.nuevo)
    if (d.nuevo.limiteCredito > 0) exigir(tienePermiso(ctx.usuario.rol, "config.editar"), "permiso", "Solo administración otorga crédito")
    e.clientes[d.clienteId] = { ...d.nuevo, id: d.clienteId, orgId: e.org.id, nombre: d.nuevo.nombre.trim(), creadoEn: ctx.ahora }
  } else {
    exigir(existente, "no_existe", "El cliente no existe")
    validar(d.cambios ?? {})
    if (d.cambios?.limiteCredito !== undefined && d.cambios.limiteCredito !== existente.limiteCredito) {
      exigir(tienePermiso(ctx.usuario.rol, "config.editar"), "permiso", "Solo administración cambia límites de crédito")
    }
    avisos.push(...conflictos(existente as unknown as Record<string, unknown>, d.antes, existente.nombre))
    Object.assign(existente, d.cambios)
  }
  const c = e.clientes[d.clienteId]
  auditar(e, ctx, op, "cliente", c.id, `${d.nuevo ? "Alta" : "Edición"} cliente ${c.nombre}`)
  return { avisos }
}

const cuentaPago: Manejador<"cuenta.pago"> = (e, d, ctx, op) => {
  const c = e.clientes[d.clienteId]
  exigir(c, "no_existe", "El cliente no existe")
  exigir(Number.isInteger(d.importe) && d.importe > 0, "invalida", "Importe inválido")
  exigir(MEDIOS_PAGO.includes(d.medio) && d.medio !== "cuenta_corriente", "invalida", "Medio de pago inválido")
  exigir(!e.movimientosCuenta.some((m) => m.id === d.movimientoId), "duplicada", "El pago ya existe")
  e.movimientosCuenta.push({ id: d.movimientoId, orgId: e.org.id, clienteId: c.id, fecha: ctx.ahora, tipo: "pago", importe: -d.importe, refId: null, descripcion: `Pago ${d.medio}${d.referencia ? ` · ${d.referencia}` : ""}` })
  auditar(e, ctx, op, "cliente", c.id, `Cobro ${formatoPesos(d.importe)} · ${c.nombre}`)
}

// ───────────────────────────── Servicio técnico ─────────────────────────────

const servicioCrear: Manejador<"servicio.crear"> = (e, d, ctx, op) => {
  const o = d.orden
  exigirSucursal(e, ctx, o.sucursalId)
  exigir(!e.servicio[o.id], "duplicada", "La orden ya existe")
  exigir(e.clientes[o.clienteId], "no_existe", "Cliente inexistente")
  exigir(o.falla.trim().length >= 3, "invalida", "Describí la falla")
  exigir(o.equipo.marca.trim().length >= 1, "invalida", "Falta la marca del equipo")
  if (o.tecnicoId) exigir(e.usuarios.some((u) => u.id === o.tecnicoId), "no_existe", "Técnico inexistente")
  const numero = numeroDefinitivo(e, ctx, "servicio:ST")
  e.servicio[o.id] = {
    ...o,
    orgId: e.org.id,
    numero,
    diagnostico: "",
    estado: "ingresado",
    presupuestoReparacion: null,
    repuestos: [],
    eventos: [{ fecha: ctx.ahora, estado: "ingresado", nota: `Ingresa con falla: ${o.falla.trim()}`, usuarioId: op.usuarioId, aviso: null }],
    actualizadoEn: ctx.ahora,
  }
  auditar(e, ctx, op, "servicio", o.id, `Ingreso orden ST ${numero ? `#${numero}` : o.numeroLocal} · ${o.equipo.marca} ${o.equipo.modelo}`)
  return numero ? { asignado: { numero } } : undefined
}

const servicioEstado: Manejador<"servicio.estado"> = (e, d, ctx, op) => {
  const o = e.servicio[d.ordenId]
  exigir(o, "no_existe", "La orden no existe")
  exigir(puedeSucursal(ctx, o.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(
    puedeTransicionar(o.estado, d.estado),
    "estado",
    `La orden está "${NOMBRE_ESTADO_SERVICIO[o.estado]}" y no puede pasar a "${NOMBRE_ESTADO_SERVICIO[d.estado]}"`,
  )
  if (d.estado === "esperando_aprobacion") exigir(d.presupuestoReparacion ?? o.presupuestoReparacion, "invalida", "Cargá el presupuesto de reparación")
  if (d.diagnostico !== undefined) o.diagnostico = d.diagnostico.trim()
  if (d.presupuestoReparacion !== undefined) o.presupuestoReparacion = d.presupuestoReparacion
  o.estado = d.estado
  o.actualizadoEn = ctx.ahora
  const cliente = e.clientes[o.clienteId]
  const sucursal = sucursalDe(e, o.sucursalId)
  const conAviso = d.avisar && ESTADOS_CON_AVISO.includes(d.estado) && cliente
  o.eventos.push({
    fecha: ctx.ahora,
    estado: d.estado,
    nota: d.nota.trim(),
    usuarioId: op.usuarioId,
    aviso: conAviso
      ? {
          canal: "whatsapp",
          mensaje: mensajeAvisoServicio(d.estado, cliente.nombre, `${o.equipo.marca} ${o.equipo.modelo}`.trim(), o.numero ?? o.numeroLocal, o.presupuestoReparacion, sucursal?.nombre ?? ""),
          emulado: true,
        }
      : null,
  })
  auditar(e, ctx, op, "servicio", o.id, `Orden ST #${o.numero ?? o.numeroLocal} → ${NOMBRE_ESTADO_SERVICIO[d.estado]}${conAviso ? " · aviso WhatsApp (emulado)" : ""}`)
}

const servicioAsignar: Manejador<"servicio.asignar"> = (e, d, ctx, op) => {
  const o = e.servicio[d.ordenId]
  exigir(o, "no_existe", "La orden no existe")
  exigir(puedeSucursal(ctx, o.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  if (d.tecnicoId) exigir(e.usuarios.some((u) => u.id === d.tecnicoId && u.activo), "no_existe", "Técnico inexistente")
  o.tecnicoId = d.tecnicoId
  o.actualizadoEn = ctx.ahora
  const t = e.usuarios.find((u) => u.id === d.tecnicoId)
  auditar(e, ctx, op, "servicio", o.id, `Orden ST #${o.numero ?? o.numeroLocal} asignada a ${t?.nombre ?? "nadie"}`)
}

// ───────────────────────────── Compras ─────────────────────────────

const compraGuardar: Manejador<"compra.guardar"> = (e, d, ctx, op) => {
  const o = d.orden
  exigirSucursal(e, ctx, o.sucursalId)
  exigir(e.proveedores.some((p) => p.id === o.proveedorId), "no_existe", "Proveedor inexistente")
  const existente = e.compras[o.id]
  if (existente) exigir(existente.estado === "borrador", "estado", "Solo se editan órdenes en borrador")
  exigir(o.items.length > 0, "invalida", "La orden no tiene productos")
  for (const it of o.items) {
    exigir(e.productos[it.productoId], "no_existe", "Producto inexistente")
    exigir(Number.isFinite(it.cantidad) && it.cantidad > 0, "invalida", "Cantidad inválida")
    exigir(Number.isInteger(it.costoUnitario) && it.costoUnitario >= 0, "invalida", "Costo inválido")
  }
  e.compras[o.id] = {
    ...o,
    orgId: e.org.id,
    numero: existente?.numero ?? null,
    estado: "borrador",
    items: o.items.map((it) => ({ ...it, recibido: 0 })),
    total: o.items.reduce((t, it) => t + Math.round(it.cantidad * it.costoUnitario), 0),
    actualizadoEn: ctx.ahora,
  }
  auditar(e, ctx, op, "compra", o.id, `${existente ? "Edición" : "Nueva"} orden de compra ${o.numeroLocal}`)
}

const compraEnviar: Manejador<"compra.enviar"> = (e, d, ctx, op) => {
  const o = e.compras[d.ordenId]
  exigir(o, "no_existe", "La orden no existe")
  exigir(puedeSucursal(ctx, o.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(o.estado === "borrador", "estado", "La orden ya fue enviada")
  o.numero = numeroDefinitivo(e, ctx, "compra:OC") ?? o.numero
  o.estado = "enviada"
  o.actualizadoEn = ctx.ahora
  const prov = e.proveedores.find((p) => p.id === o.proveedorId)
  auditar(e, ctx, op, "compra", o.id, `OC ${o.numero ? `#${o.numero}` : o.numeroLocal} enviada a ${prov?.nombre ?? ""}`)
  return o.numero ? { asignado: { numero: o.numero } } : undefined
}

const compraRecibir: Manejador<"compra.recibir"> = (e, d, ctx, op) => {
  const o = e.compras[d.ordenId]
  exigir(o, "no_existe", "La orden no existe")
  exigir(puedeSucursal(ctx, o.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(o.estado === "enviada" || o.estado === "recibida_parcial", "estado", "La orden no está pendiente de recepción")
  exigir(d.items.length > 0, "invalida", "No hay cantidades recibidas")
  for (const r of d.items) {
    exigir(o.items.some((x) => x.productoId === r.productoId), "invalida", "Producto que no está en la orden")
    exigir(Number.isFinite(r.cantidad) && r.cantidad > 0, "invalida", "Cantidad inválida")
  }
  const avisos: string[] = []
  d.items.forEach((r, i) => {
    const it = o.items.find((x) => x.productoId === r.productoId)!
    it.recibido = Math.round((it.recibido + r.cantidad) * 1000) / 1000
    if (it.recibido > it.cantidad) avisos.push(`sobrante: ${e.productos[it.productoId].sku} recibido de más (${formatoCantidad(it.recibido - it.cantidad)})`)
    moverStock(e, op, ctx, o.sucursalId, r.productoId, r.cantidad, "compra", o.id, `Recepción OC ${o.numero ? `#${o.numero}` : o.numeroLocal}`, String(i))
  })
  o.estado = o.items.every((x) => x.recibido >= x.cantidad) ? "recibida" : "recibida_parcial"
  o.actualizadoEn = ctx.ahora
  auditar(e, ctx, op, "compra", o.id, `Recepción OC ${o.numero ? `#${o.numero}` : o.numeroLocal} · ${d.items.length} producto(s)`)
  return { avisos }
}

// ───────────────────────────── Entregas ─────────────────────────────

const entregaEstado: Manejador<"entrega.estado"> = (e, d, ctx, op) => {
  const en = e.entregas[d.entregaId]
  exigir(en, "no_existe", "La entrega no existe")
  exigir(puedeSucursal(ctx, en.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(en.estado !== "entregada" || d.estado === "entregada", "estado", "La entrega ya figura como entregada")
  en.estado = d.estado
  if (d.nota.trim()) en.notas = d.nota.trim()
  en.actualizadoEn = ctx.ahora
  auditar(e, ctx, op, "entrega", en.id, `Entrega a ${en.destinatario} → ${d.estado}`)
}

const entregaOrden: Manejador<"entrega.orden"> = (e, d, ctx, op) => {
  for (const id of d.entregaIds) exigir(e.entregas[id], "no_existe", "Entrega inexistente")
  d.entregaIds.forEach((id, i) => {
    e.entregas[id].orden = i + 1
  })
  auditar(e, ctx, op, "entrega", null, `Hoja de ruta reordenada · ${d.entregaIds.length} entregas`)
}

// ───────────────────────────── Caja ─────────────────────────────

const cajaAbrir: Manejador<"caja.abrir"> = (e, d, ctx, op) => {
  const s = exigirSucursal(e, ctx, d.sucursalId)
  exigir(d.puesto >= 1 && d.puesto <= s.puestos, "invalida", "Puesto inválido")
  exigir(!cajaAbierta(e, s.id, d.puesto), "estado", `Ya hay una caja abierta en el puesto ${d.puesto} de ${s.nombre}`)
  exigir(Number.isInteger(d.montoInicial) && d.montoInicial >= 0, "invalida", "Monto inicial inválido")
  e.cajas[d.sesionId] = {
    id: d.sesionId,
    orgId: e.org.id,
    sucursalId: s.id,
    puesto: d.puesto,
    abiertaPor: op.usuarioId,
    apertura: ctx.ahora,
    montoInicial: d.montoInicial,
    cerradaPor: null,
    cierre: null,
    montoContado: null,
    esperado: null,
    estado: "abierta",
  }
  auditar(e, ctx, op, "caja", d.sesionId, `Apertura de caja ${s.codigo} puesto ${d.puesto} · ${formatoPesos(d.montoInicial)}`)
}

const cajaMovimiento: Manejador<"caja.movimiento"> = (e, d, ctx, op) => {
  const c = e.cajas[d.sesionId]
  exigir(c, "no_existe", "La caja no existe")
  exigir(puedeSucursal(ctx, c.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(c.estado === "abierta", "estado", "La caja está cerrada")
  exigir(Number.isInteger(d.importe) && d.importe > 0, "invalida", "Importe inválido")
  exigir(d.motivo.trim().length >= 3, "invalida", "Indicá el motivo")
  e.movimientosCaja.push({ id: d.movimientoId, orgId: e.org.id, sesionId: c.id, fecha: ctx.ahora, tipo: d.tipo, importe: d.importe, motivo: d.motivo.trim(), usuarioId: op.usuarioId })
  auditar(e, ctx, op, "caja", c.id, `${d.tipo} de caja ${formatoPesos(d.importe)} · ${d.motivo}`)
}

const cajaCerrar: Manejador<"caja.cerrar"> = (e, d, ctx, op) => {
  const c = e.cajas[d.sesionId]
  exigir(c, "no_existe", "La caja no existe")
  exigir(puedeSucursal(ctx, c.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
  exigir(c.estado === "abierta", "estado", "La caja ya fue cerrada desde otro puesto")
  exigir(Number.isInteger(d.montoContado) && d.montoContado >= 0, "invalida", "Monto contado inválido")
  const esperado = efectivoEsperado(e, c, ctx.ahora)
  c.estado = "cerrada"
  c.cierre = ctx.ahora
  c.cerradaPor = op.usuarioId
  c.esperado = esperado
  c.montoContado = d.montoContado
  const diferencia = d.montoContado - esperado
  const s = sucursalDe(e, c.sucursalId)
  auditar(e, ctx, op, "caja", c.id, `Cierre ${s?.codigo ?? ""} puesto ${c.puesto} · diferencia ${formatoPesos(diferencia)}`)
  return { asignado: { diferencia, esperado } }
}

// ───────────────────────────── Organización ─────────────────────────────

const orgConfig: Manejador<"org.config"> = (e, d, ctx, op) => {
  const c = d.cambios
  if (c.nombre !== undefined) exigir(c.nombre.trim().length >= 2 && c.nombre.length <= 120, "invalida", "Nombre inválido")
  if (c.colorAcento !== undefined) exigir(esHexValido(c.colorAcento), "invalida", "Color inválido")
  for (const logo of [c.logo, c.logoNegativo]) {
    if (logo) exigir(logo.length <= 400_000 && /^(data:image\/(svg\+xml|png|jpeg|webp);base64,|\/)/.test(logo), "invalida", "Logo inválido o demasiado pesado (máx. 300 KB)")
  }
  if (c.modulos) for (const m of Object.keys(c.modulos)) exigir(MODULOS.includes(m as Modulo), "invalida", `Módulo desconocido: ${m}`)
  const { modulos, ...resto } = c
  Object.assign(e.org, resto)
  if (modulos) e.org.modulos = { ...e.org.modulos, ...modulos }
  if (c.nombre) e.org.nombre = c.nombre.trim()
  auditar(e, ctx, op, "organizacion", e.org.id, `Configuración: ${Object.keys(c).join(", ")}`)
}

const usuarioGuardar: Manejador<"usuario.guardar"> = (e, d, ctx, op) => {
  const existente = e.usuarios.find((u) => u.id === d.usuarioId)
  if (d.nuevo) {
    exigir(!existente, "duplicada", "El usuario ya existe")
    exigir(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.nuevo.email), "invalida", "Email inválido")
    exigir(!e.usuarios.some((u) => u.email === d.nuevo!.email.toLowerCase()), "duplicada", "Ya hay un usuario con ese email")
    exigir(puedeAsignarRol(ctx.usuario.rol, d.nuevo.rol), "permiso", "No podés asignar ese rol")
    e.usuarios.push({ ...d.nuevo, orgId: e.org.id, email: d.nuevo.email.toLowerCase(), dosFactor: false, ultimoIngreso: null })
    auditar(e, ctx, op, "usuario", d.usuarioId, `Alta usuario ${d.nuevo.nombre} (${d.nuevo.rol})`)
    return
  }
  exigir(existente, "no_existe", "El usuario no existe")
  const c = d.cambios ?? {}
  exigir(existente.rol !== "dueno" || ctx.usuario.rol === "dueno", "permiso", "Solo un dueño modifica a otro dueño")
  if (c.rol) exigir(puedeAsignarRol(ctx.usuario.rol, c.rol), "permiso", "No podés asignar ese rol")
  if (c.rol || c.activo === false) exigir(existente.id !== ctx.usuario.id, "invalida", "No podés cambiar tu propio rol ni desactivarte")
  const quedanDuenos = e.usuarios.filter((u) => u.rol === "dueno" && u.activo && u.id !== existente.id).length
  if (existente.rol === "dueno" && ((c.rol && c.rol !== "dueno") || c.activo === false)) exigir(quedanDuenos > 0, "ultimo_dueno", "Tiene que quedar al menos un dueño activo")
  Object.assign(existente, c)
  auditar(e, ctx, op, "usuario", existente.id, `Edición usuario ${existente.nombre}: ${Object.keys(c).join(", ")}`)
}

// ───────────────────────────── Importación ─────────────────────────────

const importarProductos: Manejador<"importar.productos"> = (e, d, ctx, op) => {
  exigir(d.filas.length > 0 && d.filas.length <= 5000, "invalida", "La importación debe tener entre 1 y 5.000 filas")
  exigir(e.listas.some((l) => l.id === d.listaId), "no_existe", "Lista inexistente")
  if (d.sucursalId) exigirSucursal(e, ctx, d.sucursalId)
  const skus = new Set<string>()
  for (const f of d.filas) {
    exigir(/^[\w.\-/]{1,40}$/.test(f.sku), "invalida", `SKU inválido: ${f.sku}`)
    exigir(!skus.has(f.sku.toLowerCase()), "invalida", `SKU repetido en el archivo: ${f.sku}`)
    skus.add(f.sku.toLowerCase())
    exigir(f.nombre.trim().length >= 2, "invalida", `Falta el nombre (SKU ${f.sku})`)
    exigir(Number.isInteger(f.costo) && f.costo >= 0, "invalida", `Costo inválido (SKU ${f.sku})`)
  }
  let creados = 0
  let actualizados = 0
  const porSku = new Map(Object.values(e.productos).map((p) => [p.sku.toLowerCase(), p]))
  const categoria = (nombre: string) => {
    const n = nombre.trim() || "Sin categoría"
    let c = e.categorias.find((x) => x.nombre.toLowerCase() === n.toLowerCase())
    if (!c) {
      c = { id: `${op.id}:c${e.categorias.length}`, orgId: e.org.id, nombre: n, ilustracion: "tornillo" }
      e.categorias.push(c)
    }
    return c
  }
  const marca = (nombre: string) => {
    const n = nombre.trim() || "Sin marca"
    let m = e.marcas.find((x) => x.nombre.toLowerCase() === n.toLowerCase())
    if (!m) {
      m = { id: `${op.id}:m${e.marcas.length}`, orgId: e.org.id, nombre: n }
      e.marcas.push(m)
    }
    return m
  }
  const proveedorDefault = e.proveedores[0]?.id ?? ""
  d.filas.forEach((f, i) => {
    const cat = categoria(f.categoria)
    const mar = marca(f.marca)
    const existente = porSku.get(f.sku.toLowerCase())
    let p: Producto
    if (existente) {
      Object.assign(existente, { nombre: f.nombre.trim(), categoriaId: cat.id, marcaId: mar.id, codigoBarras: f.codigoBarras, unidad: f.unidad, costo: f.costo, iva: f.iva, actualizadoEn: ctx.ahora })
      p = existente
      actualizados++
    } else {
      p = {
        id: `${op.id}:p${i}`,
        orgId: e.org.id,
        sku: f.sku,
        codigoBarras: f.codigoBarras,
        nombre: f.nombre.trim(),
        categoriaId: cat.id,
        marcaId: mar.id,
        proveedorId: proveedorDefault,
        unidad: f.unidad,
        costo: f.costo,
        iva: f.iva,
        ilustracion: cat.ilustracion,
        activo: true,
        actualizadoEn: ctx.ahora,
      }
      e.productos[p.id] = p
      creados++
    }
    if (f.precio !== null) e.precios[clavePrecio(d.listaId, p.id)] = { orgId: e.org.id, productoId: p.id, listaId: d.listaId, precio: f.precio, actualizadoEn: ctx.ahora }
    if (d.sucursalId && f.stock !== null) {
      const actual = e.stock[claveStock(d.sucursalId, p.id)]?.cantidad ?? 0
      const delta = Math.round((f.stock - actual) * 1000) / 1000
      if (delta !== 0) moverStock(e, op, ctx, d.sucursalId, p.id, delta, "inicial", d.importacionId, "Importación de datos", String(i))
    }
  })
  auditar(e, ctx, op, "importacion", d.importacionId, `Importación: ${creados} producto(s) nuevos, ${actualizados} actualizados`)
  return { asignado: { creados, actualizados } }
}

// ───────────────────────────── Estructura ─────────────────────────────

const sucursalGuardar: Manejador<"sucursal.guardar"> = (e, d, ctx, op) => {
  const s = e.sucursales.find((x) => x.id === d.sucursalId)
  exigir(s, "no_existe", "La sucursal no existe")
  const c = d.cambios
  if (c.nombre !== undefined) exigir(c.nombre.trim().length >= 2, "invalida", "Nombre inválido")
  if (c.puestos !== undefined) exigir(Number.isInteger(c.puestos) && c.puestos >= 1 && c.puestos <= 50, "invalida", "Cantidad de puestos inválida")
  if (c.puestos !== undefined && c.puestos < s.puestos) {
    for (let p = c.puestos + 1; p <= s.puestos; p++) exigir(!cajaAbierta(e, s.id, p), "estado", `Cerrá la caja del puesto ${p} antes de quitarlo`)
  }
  Object.assign(s, { ...c, nombre: c.nombre?.trim() ?? s.nombre, direccion: c.direccion?.trim() ?? s.direccion })
  auditar(e, ctx, op, "sucursal", s.id, `Sucursal ${s.codigo}: ${Object.keys(c).join(", ")}`)
}

const listaGuardar: Manejador<"lista.guardar"> = (e, d, ctx, op) => {
  const datos = d.nuevo ?? d.cambios ?? {}
  if (datos.nombre !== undefined) exigir(datos.nombre.trim().length >= 2 && datos.nombre.length <= 60, "invalida", "Nombre inválido")
  if (datos.margenSugerido !== undefined) exigir(Number.isFinite(datos.margenSugerido) && datos.margenSugerido >= 0 && datos.margenSugerido <= 1000, "invalida", "Margen inválido")
  if (d.nuevo) {
    exigir(!e.listas.some((l) => l.id === d.listaId), "duplicada", "La lista ya existe")
    e.listas.push({ id: d.listaId, orgId: e.org.id, nombre: d.nuevo.nombre.trim(), margenSugerido: d.nuevo.margenSugerido, esDefault: false })
    auditar(e, ctx, op, "lista", d.listaId, `Nueva lista de precios: ${d.nuevo.nombre}`)
    return
  }
  const l = e.listas.find((x) => x.id === d.listaId)
  exigir(l, "no_existe", "La lista no existe")
  Object.assign(l, { ...d.cambios, nombre: d.cambios?.nombre?.trim() ?? l.nombre })
  auditar(e, ctx, op, "lista", l.id, `Lista ${l.nombre}: ${Object.keys(d.cambios ?? {}).join(", ")}`)
}

// ───────────────────────────── Despacho ─────────────────────────────

const MANEJADORES: { [K in TipoOp]: Manejador<K> } = {
  "venta.crear": ventaCrear,
  "venta.anular": ventaAnular,
  "presupuesto.guardar": presupuestoGuardar,
  "presupuesto.estado": presupuestoEstado,
  "presupuesto.convertir": presupuestoConvertir,
  "stock.ajustar": stockAjustar,
  "stock.transferir": stockTransferir,
  "stock.minimo": stockMinimo,
  "conteo.crear": conteoCrear,
  "conteo.registrar": conteoRegistrar,
  "conteo.cerrar": conteoCerrar,
  "precios.aumento": preciosAumento,
  "precios.revertir": preciosRevertir,
  "precio.editar": precioEditar,
  "producto.guardar": productoGuardar,
  "cliente.guardar": clienteGuardar,
  "cuenta.pago": cuentaPago,
  "servicio.crear": servicioCrear,
  "servicio.estado": servicioEstado,
  "servicio.asignar": servicioAsignar,
  "compra.guardar": compraGuardar,
  "compra.enviar": compraEnviar,
  "compra.recibir": compraRecibir,
  "entrega.estado": entregaEstado,
  "entrega.orden": entregaOrden,
  "caja.abrir": cajaAbrir,
  "caja.movimiento": cajaMovimiento,
  "caja.cerrar": cajaCerrar,
  "org.config": orgConfig,
  "usuario.guardar": usuarioGuardar,
  "importar.productos": importarProductos,
  "sucursal.guardar": sucursalGuardar,
  "lista.guardar": listaGuardar,
}

/**
 * Aplica una operación. Si se rechaza, el estado NO cambia.
 * (Las validaciones ocurren antes de cualquier modificación.)
 */
export function aplicarOperacion(e: EstadoEmpresa, op: Operacion, ctx: Contexto): Resultado {
  try {
    exigir(op.orgId === e.org.id, "permiso", "La operación pertenece a otra organización")
    exigir(MANEJADORES[op.tipo], "invalida", `Operación desconocida: ${op.tipo}`)
    exigir(tienePermiso(ctx.usuario.rol, PERMISO_OPERACION[op.tipo]), "permiso", "Tu rol no permite esta acción")
    if (op.sucursalId) exigir(puedeSucursal(ctx, op.sucursalId), "sucursal", "No tenés permiso en esa sucursal")
    const modulo = MODULO_DE_OPERACION[op.tipo.split(".")[0]]
    if (modulo) exigir(e.org.modulos[modulo] !== false, "permiso", `El módulo ${modulo} no está activo`)
    const salida = (MANEJADORES[op.tipo] as Manejador<TipoOp>)(e, op.datos as never, ctx, op as never)
    return { ok: true, avisos: salida?.avisos ?? [], asignado: salida?.asignado }
  } catch (err) {
    if (err instanceof Rechazo) return { ok: false, codigo: err.codigo, error: err.message }
    throw err
  }
}
