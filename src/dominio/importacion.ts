import { aCentavos } from "./dinero"
import type { EstadoEmpresa } from "./estado"
import type { Unidad } from "./tipos"
import type { FilaImportada } from "@/sync/tipos"
import { normalizar } from "@/lib/texto"

/**
 * Importador de catálogo desde Excel o CSV: la puerta de entrada de cada
 * migración. Detecta columnas por nombre, entiende números argentinos
 * ("1.234,56", "$ 12.500") y valida fila por fila sin frenar todo el archivo.
 */

export const CAMPOS = ["sku", "nombre", "categoria", "marca", "codigoBarras", "unidad", "costo", "iva", "precio", "stock"] as const
export type Campo = (typeof CAMPOS)[number]
export type Mapeo = Record<Campo, number | null>

export const NOMBRE_CAMPO: Record<Campo, string> = {
  sku: "Código interno (SKU)",
  nombre: "Descripción",
  categoria: "Categoría / rubro",
  marca: "Marca",
  codigoBarras: "Código de barras",
  unidad: "Unidad",
  costo: "Costo sin IVA",
  iva: "IVA %",
  precio: "Precio de venta (con IVA)",
  stock: "Stock",
}

export const OBLIGATORIOS: Campo[] = ["sku", "nombre", "costo"]

const SINONIMOS: Record<Campo, string[]> = {
  sku: ["sku", "codigo", "cod", "codigo interno", "articulo", "cod articulo", "id"],
  nombre: ["nombre", "descripcion", "producto", "detalle", "articulo descripcion"],
  categoria: ["categoria", "rubro", "familia", "grupo", "linea"],
  marca: ["marca", "fabricante"],
  codigoBarras: ["codigo de barras", "ean", "ean13", "barras", "cod barras", "gtin"],
  unidad: ["unidad", "um", "unidad de medida", "medida"],
  costo: ["costo", "costo sin iva", "precio costo", "costo neto", "p costo"],
  iva: ["iva", "alicuota", "iva %"],
  precio: ["precio", "precio venta", "pvp", "precio final", "precio lista", "p venta"],
  stock: ["stock", "existencia", "cantidad", "saldo", "disponible"],
}

/** Sugiere qué columna del archivo corresponde a cada campo. */
export function detectarColumnas(encabezados: string[]): Mapeo {
  const norm = encabezados.map((h) => normalizar(h).replace(/[^a-z0-9% ]/g, " ").replace(/\s+/g, " ").trim())
  const usados = new Set<number>()
  const mapeo = Object.fromEntries(CAMPOS.map((c) => [c, null])) as Mapeo
  // Primero coincidencias exactas, después parciales
  for (const exacta of [true, false]) {
    for (const campo of CAMPOS) {
      if (mapeo[campo] !== null) continue
      const i = norm.findIndex((h, k) => !usados.has(k) && SINONIMOS[campo].some((s) => (exacta ? h === s : h.includes(s))))
      if (i >= 0) {
        mapeo[campo] = i
        usados.add(i)
      }
    }
  }
  return mapeo
}

/** "1.234,56" → 1234.56 · "$ 12.500" → 12500 · "1234.5" → 1234.5 · "" → null */
export function parsearNumeroAR(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null
  let s = valor.trim().replace(/\$|ars|\s/gi, "")
  if (!s) return null
  const negativo = /^-|^\(.*\)$/.test(s)
  s = s.replace(/[()-]/g, "")
  const coma = s.lastIndexOf(",")
  const punto = s.lastIndexOf(".")
  if (coma >= 0 && punto >= 0) {
    // El último separador es el decimal
    s = coma > punto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "")
  } else if (coma >= 0) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (punto >= 0) {
    const partes = s.split(".")
    // "12.500" o "1.234.567" → miles; "1234.5" → decimal
    if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) s = s.replace(/\./g, "")
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return negativo ? -n : n
}

function unidadDe(v: string): Unidad {
  const n = normalizar(v)
  if (/^(m|mt|mts|metro|metros)$/.test(n)) return "m"
  if (/^(kg|kilo|kilos)$/.test(n)) return "kg"
  if (/^(l|lt|lts|litro|litros)$/.test(n)) return "l"
  if (/^(caja|cj|cajas)$/.test(n)) return "caja"
  return "u"
}

export type ErrorFila = { fila: number; campo?: Campo; mensaje: string }

export type Validacion = {
  validas: FilaImportada[]
  errores: ErrorFila[]
  nuevos: number
  actualizados: number
}

/**
 * Valida y convierte las filas. `fila` en los errores es la fila del archivo
 * (1 = encabezado, así coincide con lo que se ve en Excel).
 */
export function validarFilas(e: EstadoEmpresa, filas: (string | number | null)[][], mapeo: Mapeo): Validacion {
  const errores: ErrorFila[] = []
  const validas: FilaImportada[] = []
  const vistos = new Map<string, number>()
  const existentes = new Set(Object.values(e.productos).map((p) => p.sku.toLowerCase()))
  let nuevos = 0
  let actualizados = 0
  const celda = (fila: (string | number | null)[], campo: Campo) => {
    const i = mapeo[campo]
    if (i === null) return ""
    const v = fila[i]
    return v === null || v === undefined ? "" : String(v).trim()
  }
  for (const c of OBLIGATORIOS) if (mapeo[c] === null) errores.push({ fila: 1, campo: c, mensaje: `Falta asignar la columna "${NOMBRE_CAMPO[c]}"` })
  if (errores.length) return { validas, errores, nuevos, actualizados }

  filas.forEach((fila, k) => {
    const n = k + 2
    if (fila.every((x) => x === null || String(x).trim() === "")) return
    const sku = celda(fila, "sku")
    const nombre = celda(fila, "nombre")
    const costo = parsearNumeroAR(celda(fila, "costo"))
    const precioTxt = celda(fila, "precio")
    const precio = precioTxt ? parsearNumeroAR(precioTxt) : null
    const stockTxt = celda(fila, "stock")
    const stock = stockTxt ? parsearNumeroAR(stockTxt) : null
    const ivaTxt = celda(fila, "iva")
    const iva = ivaTxt ? parsearNumeroAR(ivaTxt) : 21
    const barras = celda(fila, "codigoBarras").replace(/\D/g, "")
    const problemas: ErrorFila[] = []
    if (!/^[\w.\-/]{1,40}$/.test(sku)) problemas.push({ fila: n, campo: "sku", mensaje: sku ? `SKU inválido: "${sku}"` : "Falta el SKU" })
    if (nombre.length < 2) problemas.push({ fila: n, campo: "nombre", mensaje: "Falta la descripción" })
    if (costo === null || costo < 0) problemas.push({ fila: n, campo: "costo", mensaje: `Costo inválido: "${celda(fila, "costo")}"` })
    if (precioTxt && (precio === null || precio < 0)) problemas.push({ fila: n, campo: "precio", mensaje: `Precio inválido: "${precioTxt}"` })
    if (stockTxt && stock === null) problemas.push({ fila: n, campo: "stock", mensaje: `Stock inválido: "${stockTxt}"` })
    if (iva !== 21 && iva !== 10.5) problemas.push({ fila: n, campo: "iva", mensaje: `IVA debe ser 21 o 10,5 (vino "${ivaTxt}")` })
    if (barras.length > 14) problemas.push({ fila: n, campo: "codigoBarras", mensaje: "Código de barras demasiado largo" })
    const clave = sku.toLowerCase()
    if (sku && vistos.has(clave)) problemas.push({ fila: n, campo: "sku", mensaje: `SKU repetido (también en la fila ${vistos.get(clave)})` })
    if (problemas.length) {
      errores.push(...problemas)
      return
    }
    vistos.set(clave, n)
    if (existentes.has(clave)) actualizados++
    else nuevos++
    validas.push({
      sku,
      nombre,
      categoria: celda(fila, "categoria"),
      marca: celda(fila, "marca"),
      codigoBarras: barras,
      unidad: unidadDe(celda(fila, "unidad")),
      costo: aCentavos(costo!),
      iva: iva === 10.5 ? 10.5 : 21,
      precio: precio === null ? null : aCentavos(precio),
      stock,
    })
  })
  return { validas, errores, nuevos, actualizados }
}

export const PLANTILLA_CSV = [
  "SKU;Descripción;Rubro;Marca;Código de barras;Unidad;Costo;IVA;Precio venta;Stock",
  "HE-9001;Taladro percutor 710 W;Herramientas eléctricas;Marca Ejemplo;2900000000017;u;58.400,00;21;112.990,00;12",
  "EL-9002;Cable unipolar 2,5 mm² (por metro);Electricidad;Marca Ejemplo;;m;890,50;21;1.720,00;300",
].join("\r\n")
