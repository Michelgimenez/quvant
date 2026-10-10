import { beforeAll, describe, expect, it } from "vitest"
import { generarEmpresaDemo } from "@/datos/demo/generar"
import { claveStock, type EstadoEmpresa } from "@/dominio/estado"
import { CALOR_MAXIMO, PARADAS_CALOR, calorRelativo, colorCalor, hexAOklab, nombreCalor } from "@/forja/dominio/calor"
import { avanceTransito, distanciaKm, minutosDeViaje, proyeccion } from "@/forja/dominio/geo"
import { eventosDelDia, redForja, tallerForja } from "@/forja/dominio/modelo"
import { operacionSimulada } from "@/forja/dominio/simulacion-operaciones"
import { SimuladorForja, mundoDesdeEstado } from "@/forja/dominio/simulador"
import { aplicarOperacion } from "@/sync/reductores"
import type { Operacion, UsuarioContexto } from "@/sync/tipos"

// Miércoles 15:30 en Argentina: horario comercial, hay transferencias en tránsito
const AHORA = new Date("2026-10-07T18:30:00.000Z")
let e: EstadoEmpresa
beforeAll(() => {
  e = generarEmpresaDemo({ ahora: AHORA, dias: 40 })
})

const uuid = (() => {
  let n = 0
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`
})()

function aplicarComoServidor(estado: EstadoEmpresa, op: Operacion, autor: UsuarioContexto) {
  return aplicarOperacion(estado, op, { modo: "servidor", usuario: autor, ahora: op.creadaEn })
}

describe("Forja · escala de calor", () => {
  it("va de frío a blanco caliente pasando por las paradas de la paleta", () => {
    expect(colorCalor(0)).toBe("#3a4450")
    expect(colorCalor(CALOR_MAXIMO)).toBe("#fff4e0")
    for (const p of PARADAS_CALOR) expect(colorCalor(p.calor)).toBe(p.hex)
  })

  it("la luminosidad sube de forma continua (interpolación en OKLab)", () => {
    let anterior = -1
    for (let c = 0; c <= CALOR_MAXIMO; c += 0.05) {
      const L = hexAOklab(colorCalor(c))[0]
      expect(L).toBeGreaterThanOrEqual(anterior - 0.005)
      anterior = L
    }
  })

  it("calor relativo al promedio de la sucursal, acotado", () => {
    expect(calorRelativo(0, 3)).toBe(0)
    expect(calorRelativo(3, 3)).toBe(1)
    expect(calorRelativo(100, 3)).toBe(CALOR_MAXIMO)
    expect(calorRelativo(0, 0)).toBe(0)
    expect(nombreCalor(0)).toBe("frío")
    expect(nombreCalor(1.1)).toBe("brasa")
  })
})

describe("Forja · geometría", () => {
  it("distancia y tiempo de viaje plausibles en el conurbano", () => {
    const km = distanciaKm({ lat: -34.6704, lng: -58.3686 }, { lat: -34.4613, lng: -58.6557 })
    expect(km).toBeGreaterThan(30)
    expect(km).toBeLessThan(40)
    expect(minutosDeViaje(km)).toBeGreaterThan(60)
    expect(avanceTransito("2026-10-07T10:00:00Z", "2026-10-07T11:00:00Z", Date.parse("2026-10-07T10:30:00Z"))).toBeCloseTo(0.5)
  })

  it("la proyección 2D deja todos los puntos dentro del lienzo", () => {
    const puntos = e.sucursales.map((s) => ({ lat: s.lat!, lng: s.lng! }))
    const p = proyeccion(puntos, 800, 500)
    for (const pt of puntos.map(p)) {
      expect(pt.x).toBeGreaterThanOrEqual(0)
      expect(pt.x).toBeLessThanOrEqual(800)
      expect(pt.y).toBeGreaterThanOrEqual(0)
      expect(pt.y).toBeLessThanOrEqual(500)
    }
  })
})

describe("Forja · modelo desde el estado de Yunque", () => {
  it("la red tiene cada sucursal con ubicación, marca DEMO y sus números del día", () => {
    const red = redForja(e, AHORA)
    expect(red.nodos).toHaveLength(3)
    for (const n of red.nodos) {
      expect(n.lat).not.toBeNull()
      expect(n.demo).toBe(true)
      expect(n.calor).toBeGreaterThanOrEqual(0)
    }
    const cc = red.nodos.find((n) => n.codigo === "CC")!
    const ventasHoy = Object.values(e.ventas).filter((v) => v.sucursalId === cc.id && v.estado === "confirmada" && v.fecha >= "2026-10-07T03:00:00.000Z" && v.fecha <= AHORA.toISOString()).length
    expect(cc.ventasHoy).toBe(ventasHoy)
    expect(red.transferencias.some((t) => t.estado === "en_transito")).toBe(true)
  })

  it("solo las sucursales permitidas (y sus transferencias)", () => {
    const no = e.sucursales.find((s) => s.codigo === "NO")!
    const red = redForja(e, AHORA, [no.id])
    expect(red.nodos.map((n) => n.id)).toEqual([no.id])
    expect(red.transferencias.every((t) => t.desdeId === no.id || t.haciaId === no.id)).toBe(true)
  })

  it("el taller trae puestos, racks por ubicación, bancos y muelle", () => {
    const cc = e.sucursales.find((s) => s.codigo === "CC")!
    const t = tallerForja(e, cc.id, AHORA)
    expect(t.puestos).toHaveLength(cc.puestos)
    expect(t.racks.length).toBeGreaterThan(10)
    for (const r of t.racks) {
      expect(r.id).toMatch(/^[A-Z0-9]+-[A-Z]$/)
      for (const n of r.niveles) expect(n).toBeGreaterThanOrEqual(0)
      for (const n of r.niveles) expect(n).toBeLessThanOrEqual(1)
    }
    expect(t.bancos.every((b) => b.estado !== "entregado")).toBe(true)
    expect(t.muelle.some((b) => b.tipo === "transferencia")).toBe(true)
  })

  it("los eventos del día van en orden y los quiebres de stock se reconstruyen", () => {
    const evs = eventosDelDia(e, AHORA)
    expect(evs.length).toBeGreaterThan(10)
    for (let i = 1; i < evs.length; i++) expect(evs[i].en >= evs[i - 1].en).toBe(true)
    // Escenario armado: un producto que hoy pasa de 6 a 2 con mínimo 4
    const copia = structuredClone(e)
    const cc = copia.sucursales.find((s) => s.codigo === "CC")!
    const st = Object.values(copia.stock).find((x) => x.sucursalId === cc.id)!
    st.cantidad = 2
    st.minimo = 4
    copia.movimientos = copia.movimientos.filter((m) => !(m.sucursalId === cc.id && m.productoId === st.productoId))
    copia.movimientos.push({ id: "m1", orgId: copia.org.id, sucursalId: cc.id, productoId: st.productoId, tipo: "venta", cantidad: -4, refId: null, motivo: "", usuarioId: copia.usuarios[0].id, fecha: "2026-10-07T15:00:00.000Z" })
    const quiebres = eventosDelDia(copia, AHORA).filter((x) => x.tipo === "stock_critico" && x.sucursalId === cc.id && x.productoId === st.productoId)
    expect(quiebres).toHaveLength(1)
  })
})

describe("Forja · simulador", () => {
  it("es determinístico con la misma semilla", () => {
    const a = new SimuladorForja("x")
    const b = new SimuladorForja("x")
    const m = mundoDesdeEstado(e, AHORA)
    for (let i = 0; i < 20; i++) expect(a.siguiente(m, AHORA)).toEqual(b.siguiente(m, AHORA))
  })

  it("lo que ya llegó se recibe primero", () => {
    const tarde = new Date(AHORA.getTime() + 6 * 3_600_000)
    const intencion = new SimuladorForja("y").siguiente(mundoDesdeEstado(e, tarde), tarde)
    expect(intencion?.tipo).toBe("recepcion")
  })

  it("cada intención se vuelve una operación que las reglas de Yunque aceptan", () => {
    const estado = structuredClone(e)
    const sim = new SimuladorForja("z")
    const tipos = new Set<string>()
    let ahora = AHORA
    for (let i = 0; i < 60; i++) {
      ahora = new Date(ahora.getTime() + sim.pausa())
      const intencion = sim.siguiente(mundoDesdeEstado(estado, ahora), ahora)
      if (!intencion) continue
      const r = operacionSimulada(estado, intencion, ahora, uuid, i)
      expect(r).not.toBeNull()
      const res = aplicarComoServidor(estado, r!.op, r!.autor)
      expect(res.ok, `${intencion.tipo}: ${res.ok ? "" : res.error}`).toBe(true)
      tipos.add(r!.op.tipo)
    }
    expect(tipos).toContain("venta.crear")
  })
})

describe("Forja · operaciones en el reductor", () => {
  const deposito = () => {
    const u = e.usuarios.find((x) => x.rol === "deposito")!
    return { id: u.id, rol: u.rol, sucursalIds: u.sucursalIds } as UsuarioContexto
  }
  const op = (tipo: string, datos: unknown, usuario: UsuarioContexto, sucursalId: string | null = null) =>
    ({ id: uuid(), tipo, orgId: e.org.id, usuarioId: usuario.id, sucursalId, creadaEn: AHORA.toISOString(), dispositivo: "t", sinConexion: false, datos }) as Operacion

  it("despachar deja en tránsito; recibir suma en destino una sola vez", () => {
    const estado = structuredClone(e)
    const [cc, no] = ["CC", "NO"].map((c) => estado.sucursales.find((s) => s.codigo === c)!)
    const st = Object.values(estado.stock).find((x) => x.sucursalId === cc.id && x.cantidad > 10)!
    const antesCC = st.cantidad
    const antesNO = estado.stock[claveStock(no.id, st.productoId)]?.cantidad ?? 0
    const u = deposito()
    const t = uuid()
    expect(aplicarComoServidor(estado, op("transferencia.despachar", { transferenciaId: t, desdeId: cc.id, haciaId: no.id, items: [{ productoId: st.productoId, cantidad: 3 }], motivo: "x", llegadaEstimada: new Date(AHORA.getTime() + 3_600_000).toISOString() }, u, cc.id), u).ok).toBe(true)
    expect(estado.stock[claveStock(cc.id, st.productoId)].cantidad).toBe(antesCC - 3)
    expect(estado.transferencias[t].estado).toBe("en_transito")
    expect(aplicarComoServidor(estado, op("transferencia.recibir", { transferenciaId: t }, u, no.id), u).ok).toBe(true)
    expect(estado.stock[claveStock(no.id, st.productoId)].cantidad).toBe(antesNO + 3)
    const otra = aplicarComoServidor(estado, op("transferencia.recibir", { transferenciaId: t }, u, no.id), u)
    expect(otra).toMatchObject({ ok: false, codigo: "estado" })
  })

  it("activar Forja es de dueño o administración; las preferencias, de cada persona", () => {
    const estado = structuredClone(e)
    const mostrador = estado.usuarios.find((x) => x.rol === "mostrador")!
    const ctxM = { id: mostrador.id, rol: mostrador.rol, sucursalIds: mostrador.sucursalIds } as UsuarioContexto
    expect(aplicarComoServidor(estado, op("extension.activar", { extension: "forja", activa: true }, ctxM), ctxM)).toMatchObject({ ok: false, codigo: "permiso" })
    const duena = estado.usuarios.find((x) => x.rol === "dueno")!
    const ctxD = { id: duena.id, rol: duena.rol, sucursalIds: null } as UsuarioContexto
    expect(aplicarComoServidor(estado, op("extension.activar", { extension: "forja", activa: true }, ctxD), ctxD).ok).toBe(true)
    expect(estado.org.extensiones.forja?.activa).toBe(true)
    expect(aplicarComoServidor(estado, op("usuario.preferencia", { clave: "forja.animacion_vista", valor: true }, ctxM), ctxM).ok).toBe(true)
    expect(estado.usuarios.find((x) => x.id === mostrador.id)!.preferencias["forja.animacion_vista"]).toBe(true)
  })

  it("un permiso extra habilita ver Forja sin cambiar el rol", () => {
    const lucia = e.usuarios.find((u) => u.email === "mostrador.norte@demo.yunque.app")!
    expect(lucia.permisosExtra).toContain("forja.ver")
  })
})
