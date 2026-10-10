import { clavePrecio, type EstadoEmpresa } from "./estado"
import type { Centavos, FiltroProductos, Id, Producto, Redondeo } from "./tipos"

/**
 * Lógica de precios: filtros, aumento masivo con vista previa, redondeo y márgenes.
 * Pura y testeada (tests/unit/precios.test.ts). La misma función la usan la
 * vista previa en el navegador y el servidor al aplicar el aumento.
 */

export function filtrarProductos(e: EstadoEmpresa, f: FiltroProductos): Producto[] {
  const texto = f.texto?.trim().toLowerCase()
  return Object.values(e.productos).filter(
    (p) =>
      p.activo &&
      (!f.marcaIds?.length || f.marcaIds.includes(p.marcaId)) &&
      (!f.categoriaIds?.length || f.categoriaIds.includes(p.categoriaId)) &&
      (!f.proveedorIds?.length || f.proveedorIds.includes(p.proveedorId)) &&
      (!texto || p.nombre.toLowerCase().includes(texto) || p.sku.toLowerCase().includes(texto)),
  )
}

/** Redondeo comercial de un precio en centavos. */
export function redondear(centavos: Centavos, modo: Redondeo): Centavos {
  switch (modo) {
    case "ninguno":
      return Math.round(centavos)
    case "10":
      return Math.max(1000, Math.round(centavos / 1000) * 1000)
    case "100":
      return Math.max(10000, Math.round(centavos / 10000) * 10000)
    case "1000":
      return Math.max(100000, Math.round(centavos / 100000) * 100000)
    case "99": {
      // Terminación en ,99 sobre el peso entero superior: 12.345,67 → 12.345,99
      const pesos = Math.floor(centavos / 100)
      return pesos * 100 + 99
    }
  }
}

/** Precio sin IVA a partir del precio final. */
export function sinIva(precioFinal: Centavos, iva: number) {
  return precioFinal / (1 + iva / 100)
}

/** Margen sobre costo (%): (precio sin IVA − costo) / costo. */
export function margen(precioFinal: Centavos, costo: Centavos, iva: number) {
  if (costo <= 0) return null
  return ((sinIva(precioFinal, iva) - costo) / costo) * 100
}

/** Precio final sugerido para un margen dado. */
export function precioParaMargen(costo: Centavos, margenPct: number, iva: number, modo: Redondeo = "10") {
  return redondear(costo * (1 + margenPct / 100) * (1 + iva / 100), modo)
}

export type ParametrosAumento = {
  filtro: FiltroProductos
  porcentaje: number
  listaIds: Id[]
  redondeo: Redondeo
}

export type CambioPrecio = {
  productoId: Id
  listaId: Id
  antes: Centavos
  despues: Centavos
  margenAntes: number | null
  margenDespues: number | null
}

export type VistaPrevia = {
  cambios: CambioPrecio[]
  productos: number
  /** Aumento promedio real luego del redondeo (%). */
  aumentoPromedio: number
  /** Productos (en alguna lista) que quedan con margen menor al umbral. */
  margenBajo: number
  /** Diferencia del stock valorizado a precio de lista principal. */
  impactoStock: Centavos
}

export const UMBRAL_MARGEN_BAJO = 20

export function calcularAumento(e: EstadoEmpresa, p: ParametrosAumento): VistaPrevia {
  if (!Number.isFinite(p.porcentaje) || p.porcentaje <= -90 || p.porcentaje > 500) {
    throw new Error("Porcentaje fuera de rango")
  }
  const productos = filtrarProductos(e, p.filtro)
  const cambios: CambioPrecio[] = []
  const listaPrincipal = p.listaIds[0]
  let impactoStock = 0
  let sumaRelativa = 0
  const conMargenBajo = new Set<Id>()

  for (const prod of productos) {
    for (const listaId of p.listaIds) {
      const actual = e.precios[clavePrecio(listaId, prod.id)]?.precio
      if (actual === undefined) continue
      const despues = redondear(actual * (1 + p.porcentaje / 100), p.redondeo)
      if (despues === actual) continue
      const mAntes = margen(actual, prod.costo, prod.iva)
      const mDespues = margen(despues, prod.costo, prod.iva)
      cambios.push({ productoId: prod.id, listaId, antes: actual, despues, margenAntes: mAntes, margenDespues: mDespues })
      sumaRelativa += (despues - actual) / actual
      if (mDespues !== null && mDespues < UMBRAL_MARGEN_BAJO) conMargenBajo.add(prod.id)
      if (listaId === listaPrincipal) {
        const unidades = e.sucursales.reduce((s, suc) => s + Math.max(0, e.stock[`${suc.id}:${prod.id}`]?.cantidad ?? 0), 0)
        impactoStock += Math.round(unidades * (despues - actual))
      }
    }
  }

  return {
    cambios,
    productos: new Set(cambios.map((c) => c.productoId)).size,
    aumentoPromedio: cambios.length ? (sumaRelativa / cambios.length) * 100 : 0,
    margenBajo: conMargenBajo.size,
    impactoStock,
  }
}
