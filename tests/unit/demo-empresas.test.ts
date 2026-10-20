import { describe, expect, it } from "vitest"
import { hash, u01 } from "@/demo/azar"
import { EMPRESAS, EMPRESAS_ORDEN, MODULOS_DEMO } from "@/demo/empresas"
import { catalogoGrupo, ean13, generarEmpresa, stockGrupo, ANCLA_MS } from "@/demo/generar"
import { datosEmpresa } from "@/demo/datos"
import { eventosEntre, acumuladoSimulado } from "@/demo/simulador"
import { resumenDistribuidora, resumenGrupo, resumenKiosco } from "@/demo/resumen"
import type { AccionesEmpresa } from "@/demo/estado-visitante"

const sinAcciones = (): AccionesEmpresa => ({ ventas: [], fiados: [], cierre: null, cobranzas: [], aprobaciones: [], movimientos: [] })

describe("las cuatro empresas de la demo", () => {
  it("son ficticias, llevan su escala y sus módulos tienen la forma de Organizacion.modulos", () => {
    expect(EMPRESAS_ORDEN).toEqual(["kiosco", "ferreteria", "distribuidora", "grupo"])
    for (const id of EMPRESAS_ORDEN) {
      const e = EMPRESAS[id]
      expect(Object.keys(e.modulos).sort()).toEqual([...MODULOS_DEMO].sort())
      expect(Object.values(e.modulos).every((v) => typeof v === "boolean")).toBe(true)
      // Cada item de la navegación es un módulo encendido.
      for (const g of e.navegacion) for (const i of g.items) expect(e.modulos[i.modulo]).toBe(true)
    }
    expect(EMPRESAS.kiosco.modulos.fiado).toBe(true)
    expect(EMPRESAS.distribuidora.modulos.preventa).toBe(true)
    expect(EMPRESAS.grupo.modulos.aprobaciones).toBe(true)
    expect(EMPRESAS.kiosco.modulos.aprobaciones).toBe(false)
  })

  it("tienen el tamaño de su escala", () => {
    expect(datosEmpresa("kiosco").productos.length).toBeGreaterThan(300)
    expect(datosEmpresa("kiosco").sucursales).toHaveLength(1)
    expect(datosEmpresa("ferreteria").sucursales).toHaveLength(3)
    expect(datosEmpresa("distribuidora").productos).toHaveLength(1800)
    expect(datosEmpresa("distribuidora").clientes).toHaveLength(400)
    expect(datosEmpresa("grupo").sucursales).toHaveLength(40)
    expect(new Set(datosEmpresa("grupo").sucursales.map((s) => s.provincia)).size).toBe(6)
    expect(datosEmpresa("grupo").productos.length).toBeGreaterThan(24000)
  })

  it("se generan siempre iguales (semilla fija y fecha ancla)", () => {
    const a = generarEmpresa("distribuidora")
    expect(hash("quvant", 1)).toBe(hash("quvant", 1))
    expect(u01("x", 2)).toBe(u01("x", 2))
    expect(catalogoGrupo()[1234]).toEqual(catalogoGrupo()[1234])
    expect(stockGrupo(5000, 12)).toBe(stockGrupo(5000, 12))
    expect(a.dias.at(-1)).toEqual(generarEmpresa("distribuidora").dias.at(-1))
  })

  it("tienen 90 días de ventas y el último es la fecha ancla", () => {
    for (const id of EMPRESAS_ORDEN) {
      const d = datosEmpresa(id)
      expect(d.dias).toHaveLength(90)
      expect(d.dias.at(-1)!.fecha).toBe("2026-10-16")
    }
  })

  it("respetan la estacionalidad: el kiosco vende más los viernes y la distribuidora, a fin de mes", () => {
    const k = datosEmpresa("kiosco").dias.slice(0, -1)
    const prom = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const dia = (f: string) => new Date(`${f}T12:00:00Z`).getUTCDay()
    const total = (d: (typeof k)[number]) => d.porSucursal.reduce((a, b) => a + b, 0)
    expect(prom(k.filter((d) => dia(d.fecha) === 5).map(total))).toBeGreaterThan(prom(k.filter((d) => dia(d.fecha) === 2).map(total)) * 1.15)
    const dist = datosEmpresa("distribuidora").dias.slice(0, -1).filter((d) => dia(d.fecha) >= 1 && dia(d.fecha) <= 5)
    const finDeMes = dist.filter((d) => Number(d.fecha.slice(8)) >= 27).map(total)
    const medio = dist.filter((d) => Number(d.fecha.slice(8)) >= 10 && Number(d.fecha.slice(8)) <= 20).map(total)
    expect(prom(finDeMes)).toBeGreaterThan(prom(medio) * 1.15)
  })

  it("usan códigos de barras internos (rango 2xx de GS1) con dígito verificador válido", () => {
    const c = ean13("prueba", 7)
    expect(c).toMatch(/^2\d{12}$/)
    const suma = [...c.slice(0, 12)].reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0)
    expect(Number(c[12])).toBe((10 - (suma % 10)) % 10)
  })
})

describe("el simulador del día", () => {
  it("es una función del tiempo: los mismos eventos para el mismo tramo, en cualquier orden de consulta", () => {
    const d = datosEmpresa("kiosco")
    const todo = eventosEntre("kiosco", d, ANCLA_MS, ANCLA_MS + 600_000)
    const partes = [...eventosEntre("kiosco", d, ANCLA_MS, ANCLA_MS + 300_000), ...eventosEntre("kiosco", d, ANCLA_MS + 300_000, ANCLA_MS + 600_000)]
    expect(partes).toEqual(todo)
    expect(todo.length).toBeGreaterThan(40) // una venta cada pocos segundos
    expect(eventosEntre("kiosco", d, ANCLA_MS - 100_000, ANCLA_MS)).toHaveLength(0)
  })

  it("en el grupo mueve muchas sucursales a la vez", () => {
    const d = datosEmpresa("grupo")
    const sim = acumuladoSimulado("grupo", d, ANCLA_MS + 120_000)
    expect(sim.porSucursal.filter((v) => v > 0).length).toBeGreaterThan(25)
  })
})

describe("el resumen de cada tablero", () => {
  it("suma las ventas del visitante y el fiado al kiosco", () => {
    const d = datosEmpresa("kiosco")
    const base = resumenKiosco(d, sinAcciones(), ANCLA_MS)
    const acciones = { ...sinAcciones(), ventas: [{ id: "v1", t: ANCLA_MS, monto: 500000, items: [], medio: "efectivo" as const, sinConexion: false, sincronizada: true }], fiados: [{ id: "f1", t: ANCLA_MS, clienteId: "v-40", monto: 300000, detalle: "", tipo: "fiado" as const }] }
    const con = resumenKiosco(d, acciones, ANCLA_MS)
    expect(con.ventasHoy - base.ventasHoy).toBe(500000)
    expect(con.caja.esperado - base.caja.esperado).toBe(500000)
    expect(con.fiado.total - base.fiado.total).toBe(300000)
    expect(con.fiado.vecinos).toBe(base.fiado.vecinos + 1)
  })

  it("baja la deuda de la distribuidora con una cobranza", () => {
    const d = datosEmpresa("distribuidora")
    const deudor = d.clientes.find((c) => c.saldo > 0)!
    const antes = resumenDistribuidora(d, sinAcciones(), ANCLA_MS)
    const despues = resumenDistribuidora(d, { ...sinAcciones(), cobranzas: [{ id: "c1", t: ANCLA_MS, clienteId: deudor.id, monto: 10000 }] }, ANCLA_MS)
    expect(antes.deuda.total - despues.deuda.total).toBe(10000)
    expect(despues.cobradoHoy - antes.cobradoHoy).toBe(10000)
  })

  it("aprueba una compra del grupo en dos niveles cuando supera el monto", () => {
    const d = datosEmpresa("grupo")
    const x = d.extras.tipo === "grupo" ? d.extras : null
    const grande = x!.aprobaciones.find((a) => a.nivel === 2)!
    const antes = resumenGrupo(d, sinAcciones(), ANCLA_MS).aprobacionesPendientes
    expect(resumenGrupo(d, { ...sinAcciones(), aprobaciones: [{ id: grande.id, nivel1: ANCLA_MS }] }, ANCLA_MS).aprobacionesPendientes).toBe(antes)
    expect(resumenGrupo(d, { ...sinAcciones(), aprobaciones: [{ id: grande.id, nivel1: ANCLA_MS, nivel2: ANCLA_MS }] }, ANCLA_MS).aprobacionesPendientes).toBe(antes - 1)
  })
})
