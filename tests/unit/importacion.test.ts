import { describe, expect, it } from "vitest"
import { generarEmpresaDemo } from "@/datos/demo/generar"
import { detectarColumnas, parsearNumeroAR, validarFilas } from "@/dominio/importacion"

describe("números argentinos", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["$ 12.500", 12500],
    ["12.500,00", 12500],
    ["1234.5", 1234.5],
    ["1,234.56", 1234.56],
    ["1.234.567", 1234567],
    ["890,5", 890.5],
    ["-15", -15],
    ["(200,00)", -200],
    ["", null],
    ["abc", null],
  ])("%s → %s", (entrada, esperado) => {
    expect(parsearNumeroAR(entrada)).toBe(esperado)
  })
})

describe("detección de columnas", () => {
  it("reconoce encabezados típicos de sistemas viejos y Excel", () => {
    const m = detectarColumnas(["Cód. Artículo", "Descripción", "Rubro", "Marca", "EAN", "Precio Costo", "Precio Venta", "Existencia"])
    expect(m).toMatchObject({ sku: 0, nombre: 1, categoria: 2, marca: 3, codigoBarras: 4, costo: 5, precio: 6, stock: 7 })
  })
})

describe("validación de filas", () => {
  const e = generarEmpresaDemo({ ahora: new Date("2026-10-07T15:30:00.000Z"), dias: 10 })
  const mapeo = detectarColumnas(["SKU", "Descripción", "Rubro", "Marca", "Costo", "Precio venta", "Stock", "IVA"])

  it("separa filas válidas, errores, nuevos y actualizados", () => {
    const existente = Object.values(e.productos)[0]
    const r = validarFilas(e, [
      ["X-1", "Producto nuevo", "Varios", "Marca", "1.000,50", "2.000", "5", "21"],
      [existente.sku, "Actualizado", "Varios", "Marca", "100", "", "", ""],
      ["", "Sin SKU", "", "", "10", "", "", ""],
      ["X-2", "Costo raro", "", "", "diez", "", "", ""],
      ["X-1", "Repetido", "", "", "10", "", "", ""],
      ["X-3", "IVA raro", "", "", "10", "", "", "27"],
      [null, null, null, null, null, null, null, null],
    ], mapeo)
    expect(r.validas.map((v) => v.sku)).toEqual(["X-1", existente.sku])
    expect(r.validas[0]).toMatchObject({ costo: 100050, precio: 200000, stock: 5, iva: 21 })
    expect(r.nuevos).toBe(1)
    expect(r.actualizados).toBe(1)
    expect(r.errores.map((x) => x.fila)).toEqual([4, 5, 6, 7])
    expect(r.errores.find((x) => x.fila === 6)?.mensaje).toMatch(/repetido.*fila 2/)
  })

  it("exige las columnas obligatorias", () => {
    const r = validarFilas(e, [["a", "b"]], { ...mapeo, costo: null })
    expect(r.errores[0].mensaje).toMatch(/Costo/)
  })
})
