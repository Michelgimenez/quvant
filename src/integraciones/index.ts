/**
 * Integraciones externas detrás de interfaces. En la demo TODAS están emuladas
 * (lo dicen en pantalla y en el registro de funcionalidades). Para conectar
 * una real se implementa la interfaz y se cambia `integraciones()`; el resto
 * de la app no se toca.
 */
import { hashTexto } from "@/lib/azar"

export type EstadoIntegracion = {
  id: "arca" | "mercadopago" | "mercadolibre" | "whatsapp"
  nombre: string
  descripcion: string
  estado: "emulada" | "conectada" | "proximamente"
  detalle: string
}

/** Facturación electrónica (ARCA, ex AFIP): pedir CAE para un comprobante. */
export interface Facturador {
  autorizar(c: { ventaId: string; tipo: "FA" | "FB"; total: number; cuitCliente?: string }): Promise<{ cae: string; vencimiento: string; emulado: boolean }>
}

/** Cobro con QR (Mercado Pago). */
export interface Cobrador {
  crearCobroQR(monto: number, referencia: string): Promise<{ id: string; qrTexto: string; emulado: boolean }>
  consultar(id: string): Promise<"pendiente" | "aprobado" | "rechazado">
}

/** Mensajes al cliente (WhatsApp Business). */
export interface Mensajeria {
  enviar(telefono: string, mensaje: string): Promise<{ id: string; emulado: boolean }>
}

/** Publicaciones en un marketplace (Mercado Libre): stock y precio. */
export interface Marketplace {
  sincronizarStock(items: { sku: string; cantidad: number; precio: number }[]): Promise<{ actualizados: number; emulado: boolean }>
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

class FacturadorEmulado implements Facturador {
  async autorizar(c: Parameters<Facturador["autorizar"]>[0]) {
    await esperar(300)
    const cae = (hashTexto(c.ventaId).toString() + hashTexto(`${c.ventaId}:cae`).toString()).padEnd(14, "0").slice(0, 14)
    return { cae, vencimiento: new Date(Date.now() + 10 * 86_400_000).toISOString(), emulado: true }
  }
}

class CobradorEmulado implements Cobrador {
  private aprobados = new Set<string>()
  async crearCobroQR(monto: number, referencia: string) {
    await esperar(200)
    const id = `demo-${hashTexto(`${referencia}:${monto}`).toString(16)}`
    return { id, qrTexto: `QUVANT-DEMO|cobro-emulado|${id}|${monto}`, emulado: true }
  }
  /** Solo demo: simula que el cliente pagó. */
  simularAprobacion(id: string) {
    this.aprobados.add(id)
  }
  async consultar(id: string) {
    await esperar(150)
    return this.aprobados.has(id) ? ("aprobado" as const) : ("pendiente" as const)
  }
}

class MensajeriaEmulada implements Mensajeria {
  async enviar(telefono: string, mensaje: string) {
    await esperar(250)
    return { id: `wa-demo-${hashTexto(telefono + mensaje).toString(16)}`, emulado: true }
  }
}

class MarketplaceEmulado implements Marketplace {
  async sincronizarStock(items: Parameters<Marketplace["sincronizarStock"]>[0]) {
    await esperar(400)
    return { actualizados: items.length, emulado: true }
  }
}

const emuladas = {
  facturador: new FacturadorEmulado(),
  cobrador: new CobradorEmulado(),
  mensajeria: new MensajeriaEmulada(),
  marketplace: new MarketplaceEmulado(),
}

export function integraciones() {
  return emuladas
}

export const ESTADO_INTEGRACIONES: EstadoIntegracion[] = [
  { id: "arca", nombre: "ARCA · factura electrónica", descripcion: "Facturas A y B con CAE.", estado: "emulada", detalle: "La demo emula el CAE. La conexión real (certificado y WSFE) está en la hoja de ruta." },
  { id: "mercadopago", nombre: "Mercado Pago", descripcion: "Cobro con QR desde el mostrador.", estado: "emulada", detalle: "QR y acreditación emulados. Falta la cuenta y credenciales del comercio." },
  { id: "whatsapp", nombre: "WhatsApp Business", descripcion: "Avisos de servicio técnico y presupuestos.", estado: "emulada", detalle: "Se arma el mensaje y se registra; no se envía. Requiere cuenta de WhatsApp Business API." },
  { id: "mercadolibre", nombre: "Mercado Libre", descripcion: "Stock y precios sincronizados con publicaciones.", estado: "proximamente", detalle: "Interfaz definida; la sincronización real no está construida." },
]
