import { beforeAll, describe, expect, it } from "vitest"
import { generarEmpresaDemo } from "@/datos/demo/generar"
import { efectivoEsperado } from "@/dominio/caja"
import { clavePrecio, claveStock, listaDefault, stockDe, type EstadoEmpresa } from "@/dominio/estado"
import { calcularAumento, filtrarProductos, margen, precioParaMargen, redondear } from "@/dominio/precios"
import { agregarAlCarrito, subtotalItem, totalItems, validarVenta, vuelto } from "@/dominio/ventas"
import { aplicarOperacion } from "@/sync/reductores"
import type { Contexto, Operacion } from "@/sync/tipos"

let E: EstadoEmpresa
beforeAll(() => {
  E = generarEmpresaDemo({ ahora: new Date("2026-10-07T15:30:00.000Z"), dias: 30 })
})
const copia = () => structuredClone(E)

function ctxDe(e: EstadoEmpresa, email: string, modo: Contexto["modo"] = "servidor"): Contexto {
  const u = e.usuarios.find((x) => x.email === email)!
  return { modo, usuario: { id: u.id, rol: u.rol, sucursalIds: u.sucursalIds }, ahora: "2026-10-07T16:00:00.000Z" }
}
function op<T extends Operacion["tipo"]>(e: EstadoEmpresa, ctx: Contexto, tipo: T, datos: Extract<Operacion, { tipo: T }>["datos"], sucursalId: string | null = null) {
  return { id: `op-${Math.random()}`, tipo, orgId: e.org.id, usuarioId: ctx.usuario.id, sucursalId, creadaEn: ctx.ahora, dispositivo: "t", sinConexion: false, datos } as Operacion
}

describe("precios", () => {
  it("redondea como se usa en el mostrador", () => {
    expect(redondear(1234567, "ninguno")).toBe(1234567)
    expect(redondear(1234567, "10")).toBe(1235000) // $12.345,67 → $12.350
    expect(redondear(1234567, "100")).toBe(1230000) // → $12.300
    expect(redondear(1234567, "1000")).toBe(1200000) // → $12.000
    expect(redondear(1234567, "99")).toBe(1234599) // → $12.345,99
  })

  it("calcula margen sobre costo sin IVA", () => {
    // costo $100, precio final $121 con IVA 21 → sin IVA $100 → margen 0
    expect(margen(12100, 10000, 21)).toBeCloseTo(0)
    expect(margen(18150, 10000, 21)).toBeCloseTo(50)
    expect(precioParaMargen(10000, 50, 21, "ninguno")).toBe(18150)
  })

  it("el aumento por marca solo toca esa marca y las listas elegidas", () => {
    const marca = E.marcas.find((m) => m.nombre === "Torkan")!
    const minorista = listaDefault(E)
    const vista = calcularAumento(E, { filtro: { marcaIds: [marca.id] }, porcentaje: 10, listaIds: [minorista.id], redondeo: "10" })
    const productos = filtrarProductos(E, { marcaIds: [marca.id] })
    expect(vista.productos).toBe(productos.length)
    expect(vista.cambios.every((c) => c.listaId === minorista.id && E.productos[c.productoId].marcaId === marca.id)).toBe(true)
    for (const c of vista.cambios) {
      expect(c.despues % 1000).toBe(0)
      expect(Math.abs(c.despues / c.antes - 1.1)).toBeLessThan(0.01)
    }
    expect(vista.aumentoPromedio).toBeGreaterThan(9.5)
    expect(vista.aumentoPromedio).toBeLessThan(10.5)
    expect(vista.impactoStock).toBeGreaterThan(0)
  })

  it("aplicar y revertir un aumento deja los precios como estaban", () => {
    const e = copia()
    const ctx = ctxDe(e, "compras@demo.yunque.app")
    const cat = e.categorias[0]
    const listas = e.listas.map((l) => l.id)
    const antes = Object.fromEntries(Object.entries(e.precios).map(([k, v]) => [k, v.precio]))
    const r = aplicarOperacion(e, op(e, ctx, "precios.aumento", { aumentoId: "a1", descripcion: "Prueba", parametros: { filtro: { categoriaIds: [cat.id] }, porcentaje: 7, listaIds: listas, redondeo: "10" } }), ctx)
    expect(r.ok).toBe(true)
    const p = Object.values(e.productos).find((x) => x.categoriaId === cat.id)!
    expect(e.precios[clavePrecio(listas[0], p.id)].precio).not.toBe(antes[clavePrecio(listas[0], p.id)])
    expect(aplicarOperacion(e, op(e, ctx, "precios.revertir", { aumentoId: "a1" }), ctx).ok).toBe(true)
    expect(Object.fromEntries(Object.entries(e.precios).map(([k, v]) => [k, v.precio]))).toEqual(antes)
  })

  it("el mostrador no puede aplicar aumentos", () => {
    const e = copia()
    const ctx = ctxDe(e, "mostrador@demo.yunque.app")
    const r = aplicarOperacion(e, op(e, ctx, "precios.aumento", { aumentoId: "a2", descripcion: "", parametros: { filtro: {}, porcentaje: 5, listaIds: [e.listas[0].id], redondeo: "10" } }), ctx)
    expect(r).toMatchObject({ ok: false, codigo: "permiso" })
  })
})

describe("ventas", () => {
  it("subtotales con descuento y carrito acumulativo", () => {
    expect(subtotalItem({ cantidad: 3, precioUnitario: 10000, descuentoPct: 10 })).toBe(27000)
    const a = { productoId: "p", descripcion: "x", cantidad: 1, precioUnitario: 500, descuentoPct: 0, costoUnitario: 0 }
    const carrito = agregarAlCarrito(agregarAlCarrito([], a), { ...a, cantidad: 2 })
    expect(carrito).toHaveLength(1)
    expect(carrito[0].cantidad).toBe(3)
    expect(totalItems(carrito)).toBe(1500)
    expect(vuelto(1500, 2000)).toBe(500)
  })

  it("valida pagos, cuenta corriente y stock (sin stock es aviso, no bloqueo)", () => {
    const cc = E.sucursales.find((s) => s.codigo === "CC")!
    const p = Object.values(E.productos).find((x) => stockDe(E, cc.id, x.id) > 0)!
    const disp = stockDe(E, cc.id, p.id)
    const items = [{ productoId: p.id, descripcion: p.nombre, cantidad: disp + 1, precioUnitario: 1000, descuentoPct: 0, costoUnitario: 0 }]
    const total = totalItems(items)
    const ok = validarVenta(E, { sucursalId: cc.id, clienteId: null, items, pagos: [{ medio: "efectivo", importe: total }] })
    expect(ok.bloqueos).toEqual([])
    expect(ok.avisos[0]).toMatchObject({ tipo: "sin_stock" })
    const falta = validarVenta(E, { sucursalId: cc.id, clienteId: null, items, pagos: [{ medio: "efectivo", importe: total - 1 }] })
    expect(falta.bloqueos[0]).toMatchObject({ tipo: "pagos_no_cubren", falta: 1 })
    const sinCliente = validarVenta(E, { sucursalId: cc.id, clienteId: null, items, pagos: [{ medio: "cuenta_corriente", importe: total }] })
    expect(sinCliente.bloqueos.map((b) => b.tipo)).toContain("cuenta_sin_cliente")
  })

  it("anular una venta devuelve el stock", () => {
    const e = copia()
    const ctx = ctxDe(e, "admin@demo.yunque.app")
    const v = Object.values(e.ventas).find((x) => x.estado === "confirmada")!
    const antes = v.items.map((it) => stockDe(e, v.sucursalId, it.productoId))
    expect(aplicarOperacion(e, op(e, ctx, "venta.anular", { ventaId: v.id, motivo: "Error de carga" }), ctx).ok).toBe(true)
    v.items.forEach((it, i) => expect(stockDe(e, v.sucursalId, it.productoId)).toBeCloseTo(antes[i] + it.cantidad))
    expect(aplicarOperacion(e, op(e, ctx, "venta.anular", { ventaId: v.id, motivo: "Otra vez" }), ctx)).toMatchObject({ ok: false, codigo: "estado" })
  })
})

describe("caja y conteos", () => {
  it("el efectivo esperado suma ventas en efectivo y resta retiros", () => {
    const e = copia()
    const caja = Object.values(e.cajas).find((c) => c.estado === "abierta")!
    const base = efectivoEsperado(e, caja, "2026-10-07T23:00:00.000Z")
    const ctx = ctxDe(e, "admin@demo.yunque.app")
    aplicarOperacion(e, op(e, ctx, "caja.movimiento", { movimientoId: "m1", sesionId: caja.id, tipo: "retiro", importe: 1000, motivo: "Retiro a caja fuerte" }), ctx)
    expect(efectivoEsperado(e, caja, "2026-10-07T23:00:00.000Z")).toBe(base - 1000)
  })

  it("cerrar un conteo sin diferencias informa 0; con diferencias ajusta el stock", () => {
    const e = copia()
    const ctx = ctxDe(e, "deposito@demo.yunque.app")
    const cc = e.sucursales.find((s) => s.codigo === "CC")!
    const productos = Object.values(e.productos).filter((p) => e.stock[claveStock(cc.id, p.id)]).slice(0, 3)
    aplicarOperacion(e, op(e, ctx, "conteo.crear", { conteoId: "c1", sucursalId: cc.id, nombre: "Prueba", productoIds: productos.map((p) => p.id) }), ctx)
    for (const p of productos) aplicarOperacion(e, op(e, ctx, "conteo.registrar", { conteoId: "c1", productoId: p.id, contado: stockDe(e, cc.id, p.id) }), ctx)
    const r = aplicarOperacion(e, op(e, ctx, "conteo.cerrar", { conteoId: "c1" }), ctx)
    expect(r).toMatchObject({ ok: true, asignado: { diferencias: 0 } })

    aplicarOperacion(e, op(e, ctx, "conteo.crear", { conteoId: "c2", sucursalId: cc.id, nombre: "Prueba 2", productoIds: [productos[0].id] }), ctx)
    const antes = stockDe(e, cc.id, productos[0].id)
    aplicarOperacion(e, op(e, ctx, "conteo.registrar", { conteoId: "c2", productoId: productos[0].id, contado: antes - 2 }), ctx)
    expect(aplicarOperacion(e, op(e, ctx, "conteo.cerrar", { conteoId: "c2" }), ctx)).toMatchObject({ ok: true, asignado: { diferencias: 1 } })
    expect(stockDe(e, cc.id, productos[0].id)).toBe(antes - 2)
  })

  it("una operación rechazada no modifica el estado", () => {
    const e = copia()
    const ctx = ctxDe(e, "mostrador@demo.yunque.app")
    const antes = JSON.stringify(e)
    const r = aplicarOperacion(e, op(e, ctx, "stock.ajustar", { sucursalId: e.sucursales[0].id, productoId: Object.keys(e.productos)[0], cantidad: 5, motivo: "x" }), ctx)
    expect(r.ok).toBe(false)
    expect(JSON.stringify(e)).toBe(antes)
  })
})
