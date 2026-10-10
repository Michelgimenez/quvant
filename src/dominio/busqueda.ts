import type { EstadoEmpresa } from "./estado"
import type { Producto } from "./tipos"
import { normalizar } from "@/lib/texto"

/**
 * Búsqueda de productos para el mostrador y el inventario.
 * Orden: código de barras exacto → SKU exacto → SKU que empieza → palabras en el nombre.
 */
export function buscarProductos(e: EstadoEmpresa, texto: string, limite = 20): Producto[] {
  const q = texto.trim()
  if (!q) return []
  const productos = Object.values(e.productos).filter((p) => p.activo)
  const porCodigo = productos.find((p) => p.codigoBarras && p.codigoBarras === q)
  if (porCodigo) return [porCodigo]
  const qn = normalizar(q)
  const porSku = productos.find((p) => p.sku.toLowerCase() === qn)
  if (porSku) return [porSku]
  const palabras = qn.split(/\s+/).filter(Boolean)
  const marcas = new Map(e.marcas.map((m) => [m.id, normalizar(m.nombre)]))
  const puntaje = (p: Producto) => {
    const nombre = normalizar(p.nombre)
    const sku = p.sku.toLowerCase()
    if (sku.startsWith(qn)) return 3
    if (!palabras.every((w) => nombre.includes(w) || sku.includes(w) || marcas.get(p.marcaId)?.includes(w))) return 0
    return nombre.startsWith(palabras[0]) ? 2 : 1
  }
  return productos
    .map((p) => [p, puntaje(p)] as const)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1] || a[0].nombre.localeCompare(b[0].nombre, "es"))
    .slice(0, limite)
    .map(([p]) => p)
}

/** Productos de ejemplo con código de barras (para "simular lectura" en la demo). */
export function ejemplosEscaneo(e: EstadoEmpresa, cantidad = 4) {
  return Object.values(e.productos)
    .filter((p) => p.codigoBarras)
    .filter((_, i) => i % 37 === 3)
    .slice(0, cantidad)
    .map((p) => ({ codigo: p.codigoBarras, nombre: p.nombre }))
}
