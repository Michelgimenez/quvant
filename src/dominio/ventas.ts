import { claveStock, precioDe, saldoCliente, type EstadoEmpresa } from "./estado"
import type { Centavos, Cliente, Id, ItemComercial, MedioPago, Pago, Producto } from "./tipos"

/** Subtotal de un ítem (con descuento), redondeado a centavos. */
export function subtotalItem(it: Pick<ItemComercial, "cantidad" | "precioUnitario" | "descuentoPct">): Centavos {
  return Math.round(it.cantidad * it.precioUnitario * (1 - it.descuentoPct / 100))
}

export function totalItems(items: Pick<ItemComercial, "cantidad" | "precioUnitario" | "descuentoPct">[]): Centavos {
  return items.reduce((t, it) => t + subtotalItem(it), 0)
}

export function totalPagos(pagos: Pago[]): Centavos {
  return pagos.reduce((t, p) => t + p.importe, 0)
}

/** IVA contenido en un precio final. */
export function ivaContenido(total: Centavos, alicuota = 21) {
  return Math.round(total - total / (1 + alicuota / 100))
}

/** Arma un ítem para el carrito desde el producto y la lista de precios. */
export function itemDesdeProducto(e: EstadoEmpresa, p: Producto, listaId: Id, cantidad = 1): ItemComercial {
  return {
    productoId: p.id,
    descripcion: p.nombre,
    cantidad,
    precioUnitario: precioDe(e, listaId, p.id),
    descuentoPct: 0,
    costoUnitario: p.costo,
  }
}

/** Agrega un producto al carrito: si ya está, suma cantidad. */
export function agregarAlCarrito(items: ItemComercial[], nuevo: ItemComercial): ItemComercial[] {
  const i = items.findIndex((x) => x.productoId === nuevo.productoId && x.precioUnitario === nuevo.precioUnitario)
  if (i === -1) return [...items, nuevo]
  return items.map((x, k) => (k === i ? { ...x, cantidad: Math.round((x.cantidad + nuevo.cantidad) * 1000) / 1000 } : x))
}

/** Vuelto a entregar al cliente cuando paga en efectivo. */
export function vuelto(total: Centavos, entregado: Centavos) {
  return Math.max(0, entregado - total)
}

export type ProblemaVenta =
  | { tipo: "sin_items" }
  | { tipo: "pagos_no_cubren"; falta: Centavos }
  | { tipo: "pagos_exceden"; sobra: Centavos }
  | { tipo: "cuenta_sin_cliente" }
  | { tipo: "cuenta_sin_credito" }
  | { tipo: "limite_excedido"; disponible: Centavos }
  | { tipo: "sin_stock"; productoId: Id; disponible: number }
  | { tipo: "cantidad_invalida"; productoId: Id }

/**
 * Valida una venta antes de confirmarla. Devuelve problemas bloqueantes
 * (los que impiden cobrar) y avisos (se puede seguir).
 * Sin conexión, el stock y el saldo son los últimos conocidos: por eso
 * sin_stock y limite_excedido son AVISOS, no bloqueos (ver ARQUITECTURA.md).
 */
export function validarVenta(
  e: EstadoEmpresa,
  v: { sucursalId: Id; clienteId: Id | null; items: ItemComercial[]; pagos: Pago[] },
): { bloqueos: ProblemaVenta[]; avisos: ProblemaVenta[] } {
  const bloqueos: ProblemaVenta[] = []
  const avisos: ProblemaVenta[] = []
  if (v.items.length === 0) bloqueos.push({ tipo: "sin_items" })
  for (const it of v.items) {
    if (!(it.cantidad > 0)) bloqueos.push({ tipo: "cantidad_invalida", productoId: it.productoId })
    const disponible = e.stock[claveStock(v.sucursalId, it.productoId)]?.cantidad ?? 0
    if (it.cantidad > disponible) avisos.push({ tipo: "sin_stock", productoId: it.productoId, disponible })
  }
  const total = totalItems(v.items)
  const pagado = totalPagos(v.pagos)
  if (pagado < total) bloqueos.push({ tipo: "pagos_no_cubren", falta: total - pagado })
  if (pagado > total) bloqueos.push({ tipo: "pagos_exceden", sobra: pagado - total })

  const enCuenta = v.pagos.filter((p) => p.medio === "cuenta_corriente").reduce((t, p) => t + p.importe, 0)
  if (enCuenta > 0) {
    const cliente: Cliente | undefined = v.clienteId ? e.clientes[v.clienteId] : undefined
    if (!cliente) bloqueos.push({ tipo: "cuenta_sin_cliente" })
    else if (cliente.limiteCredito <= 0) bloqueos.push({ tipo: "cuenta_sin_credito" })
    else {
      const disponible = cliente.limiteCredito - saldoCliente(e, cliente.id)
      if (enCuenta > disponible) avisos.push({ tipo: "limite_excedido", disponible })
    }
  }
  return { bloqueos, avisos }
}

export const NOMBRE_MEDIO: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago",
  cuenta_corriente: "Cuenta corriente",
}
