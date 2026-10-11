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

describe("Forja · plano de planta", () => {
  it("cada elemento cae dentro de su zona y la losa contiene las zonas", async () => {
    const { planoTaller, ANCHO, FONDO } = await import("@/forja/dominio/plano")
    const cc = e.sucursales.find((s) => s.codigo === "CC")!
    const t = tallerForja(e, cc.id, AHORA)
    const plano = planoTaller(t, "sucursal")
    const dentro = (x: number, z: number, tipo: string) => {
      const zona = plano.zonas.find((zz) => zz.tipo === tipo)!
      return x >= zona.x && x <= zona.x + zona.ancho && z >= zona.z && z <= zona.z + zona.fondo
    }
    expect(plano.puestos).toHaveLength(cc.puestos)
    expect(plano.racks).toHaveLength(t.racks.length)
    for (const r of plano.racks) expect(dentro(r.x, r.z, "deposito")).toBe(true)
    for (const b of plano.bancos) expect(dentro(b.x, b.z, "servicio")).toBe(true)
    for (const r of plano.retiro) expect(dentro(r.x, r.z, "servicio")).toBe(true)
    for (const p of plano.puestos) expect(dentro(p.x, p.z, "mostrador")).toBe(true)
    for (const p of plano.palets) expect(dentro(p.x, p.z, "muelle")).toBe(true)
    for (const z of plano.zonas) {
      expect(z.x).toBeGreaterThanOrEqual(-ANCHO / 2)
      expect(z.x + z.ancho).toBeLessThanOrEqual(ANCHO / 2)
      expect(z.z).toBeGreaterThanOrEqual(-FONDO / 2)
      expect(z.z + z.fondo).toBeLessThanOrEqual(FONDO / 2)
    }
    // Las zonas no se pisan
    for (const a of plano.zonas)
      for (const b of plano.zonas) {
        if (a === b) continue
        const solapan = a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.z < b.z + b.fondo && b.z < a.z + a.fondo
        expect(solapan).toBe(false)
      }
  })

  it("un bloque por producto ubicado; los racks no se pisan entre sí", async () => {
    const { planoTaller } = await import("@/forja/dominio/plano")
    const cc = e.sucursales.find((s) => s.codigo === "CC")!
    const t = tallerForja(e, cc.id, AHORA)
    const plano = planoTaller(t, "sucursal")
    expect(plano.bloques).toHaveLength(t.racks.reduce((a, r) => a + r.productos.length, 0))
    for (let i = 0; i < plano.racks.length; i++)
      for (let j = i + 1; j < plano.racks.length; j++) {
        const a = plano.racks[i]
        const b = plano.racks[j]
        const solapan = Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 && Math.abs(a.z - b.z) < (a.fondo + b.fondo) / 2
        expect(solapan, `${a.rack.id} y ${b.rack.id}`).toBe(false)
      }
    // Cada bloque queda dentro del ancho de su rack y por debajo del techo del nivel
    for (const bl of plano.bloques) {
      const r = plano.racks.find((x) => x.rack.id === bl.rackId)!
      expect(bl.x - bl.ancho / 2).toBeGreaterThanOrEqual(r.x - r.ancho / 2)
      expect(bl.x + bl.ancho / 2).toBeLessThanOrEqual(r.x + r.ancho / 2)
      expect(bl.y + bl.alto / 2).toBeLessThanOrEqual(r.alto)
    }
  })

  it("estado y altura de cada bloque siguen al stock", async () => {
    const { estadoBloque, rellenoBloque, nivelDeEstante, rackDeUbicacion } = await import("@/forja/dominio/plano")
    expect(estadoBloque({ cantidad: 0, minimo: 5 })).toBe("sin_stock")
    expect(estadoBloque({ cantidad: -2, minimo: 0 })).toBe("sin_stock")
    expect(estadoBloque({ cantidad: 5, minimo: 5 })).toBe("critico")
    expect(estadoBloque({ cantidad: 6, minimo: 5 })).toBe("normal")
    expect(rellenoBloque({ cantidad: 0, minimo: 5 })).toBe(0)
    expect(rellenoBloque({ cantidad: 15, minimo: 5 })).toBe(1)
    expect(rellenoBloque({ cantidad: 1, minimo: 50 })).toBeGreaterThan(0)
    expect([1, 3, 4, 6, 7, 9, 10, 12].map(nivelDeEstante)).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
    expect(rackDeUbicacion("HE-A3")).toBe("HE-A")
    expect(rackDeUbicacion("sin ubicación")).toBeNull()
  })

  it("los equipos listos van al estante de retiro y el resto a los bancos", async () => {
    const { planoTaller } = await import("@/forja/dominio/plano")
    const cc = e.sucursales.find((s) => s.codigo === "CC")!
    const t = tallerForja(e, cc.id, AHORA)
    const plano = planoTaller(t, "sucursal")
    expect(plano.retiro.every((r) => ["listo", "sin_reparacion"].includes(r.banco.estado))).toBe(true)
    expect(plano.bancos.every((b) => !b.banco || !["listo", "sin_reparacion"].includes(b.banco.estado))).toBe(true)
    // En la demo entran todas: ninguna orden queda sin dibujar
    expect(plano.bancos.filter((b) => b.banco).length + plano.retiro.length).toBe(t.bancos.length)
    // Solo las entregas pendientes están físicamente en el muelle
    expect(plano.palets.every((p) => p.bulto.tipo === "entrega" && p.bulto.estado === "pendiente")).toBe(true)
  })

  it("un depósito sin mostrador no tiene puestos ni zona de mostrador", async () => {
    const { planoTaller } = await import("@/forja/dominio/plano")
    const cc = e.sucursales.find((s) => s.codigo === "CC")!
    const plano = planoTaller(tallerForja(e, cc.id, AHORA), "deposito")
    expect(plano.puestos).toHaveLength(0)
    expect(plano.mostrador).toBeNull()
    expect(plano.zonas.some((z) => z.tipo === "mostrador")).toBe(false)
  })
})

describe("Forja · la red a otra hora del día (repetición)", () => {
  it("cuenta solo las ventas hasta esa hora y el calor sale de esa hora", () => {
    const cc = e.sucursales.find((s) => s.codigo === "CC")!
    const mediodia = new Date("2026-10-07T15:00:00.000Z")
    const red = redForja(e, mediodia)
    const nodo = red.nodos.find((n) => n.id === cc.id)!
    const esperadas = Object.values(e.ventas).filter((v) => v.sucursalId === cc.id && v.estado === "confirmada" && v.fecha >= "2026-10-07T03:00:00.000Z" && v.fecha <= mediodia.toISOString()).length
    expect(nodo.ventasHoy).toBe(esperadas)
    expect(nodo.ventasHoy).toBeLessThanOrEqual(redForja(e, AHORA).nodos.find((n) => n.id === cc.id)!.ventasHoy)
  })

  it("una transferencia no existe antes de salir, está en camino hasta que llega y después figura recibida", () => {
    const copia = structuredClone(e)
    const [a, b] = copia.sucursales
    copia.transferencias["t-hoy"] = {
      id: "t-hoy",
      orgId: copia.org.id,
      desdeId: a.id,
      haciaId: b.id,
      estado: "recibida",
      despachadaEn: "2026-10-07T13:00:00.000Z",
      llegadaEstimada: "2026-10-07T14:00:00.000Z",
      recibidaEn: "2026-10-07T14:10:00.000Z",
      items: [],
      motivo: "Prueba",
      usuarioId: copia.usuarios[0].id,
    } as unknown as (typeof copia.transferencias)[string]
    const en = (iso: string) => redForja(copia, new Date(iso)).transferencias.find((t) => t.id === "t-hoy")
    expect(en("2026-10-07T12:59:00.000Z")).toBeUndefined()
    expect(en("2026-10-07T13:30:00.000Z")).toMatchObject({ estado: "en_transito", recibidaEn: null })
    expect(en("2026-10-07T14:30:00.000Z")).toMatchObject({ estado: "recibida", recibidaEn: "2026-10-07T14:10:00.000Z" })
  })

  it("el stock crítico se reconstruye con los movimientos posteriores", () => {
    const copia = structuredClone(e)
    const cc = copia.sucursales.find((s) => s.codigo === "CC")!
    const st = Object.values(copia.stock).find((x) => x.sucursalId === cc.id && x.minimo > 0)!
    st.minimo = 3
    st.cantidad = 0
    // Sin otros movimientos de Casa Central en esa franja: solo cambia el producto de la prueba
    copia.movimientos = copia.movimientos.filter((m) => !(m.sucursalId === cc.id && (m.productoId === st.productoId || (m.fecha > "2026-10-07T13:00:00.000Z" && m.fecha < "2026-10-07T15:00:00.000Z"))))
    copia.movimientos.push({ id: "m-rep", orgId: copia.org.id, sucursalId: cc.id, productoId: st.productoId, tipo: "venta", cantidad: -5, refId: null, motivo: "", usuarioId: copia.usuarios[0].id, fecha: "2026-10-07T14:00:00.000Z" })
    const sin = (iso: string) => redForja(copia, new Date(iso)).nodos.find((n) => n.id === cc.id)!.sinStock
    expect(sin("2026-10-07T14:30:00.000Z") - sin("2026-10-07T13:30:00.000Z")).toBe(1)
  })
})

describe("Forja · repetición y titulares", () => {
  it("el tramo va de la apertura a ahora y a 1200× diez horas pasan en 30 s", async () => {
    const { tramoDelDia, avanzar, duracionReal } = await import("@/forja/dominio/repeticion")
    const tramo = tramoDelDia([], new Date("2026-10-07T21:00:00.000Z"))
    expect(new Date(tramo.inicio).toISOString()).toBe("2026-10-07T11:00:00.000Z")
    expect(tramo.fin - tramo.inicio).toBe(10 * 3_600_000)
    expect(duracionReal(tramo, 1200)).toBe(30_000)
    expect(avanzar(tramo.inicio, 30_000, 1200, tramo.fin)).toBe(tramo.fin)
    expect(avanzar(tramo.inicio, 1000, 60, tramo.fin)).toBe(tramo.inicio + 60_000)
  })

  it("los eventos hasta el cursor coinciden con filtrar por hora", async () => {
    const { hastaCursor } = await import("@/forja/dominio/repeticion")
    const evs = eventosDelDia(e, AHORA)
    for (const iso of ["2026-10-07T10:00:00.000Z", "2026-10-07T14:22:00.000Z", "2026-10-07T18:30:00.000Z"]) {
      const t = Date.parse(iso)
      expect(hastaCursor(evs, t)).toEqual(evs.filter((x) => Date.parse(x.en) <= t))
    }
  })

  it("titulares: del más nuevo al más viejo, con quiebres de stock como alerta", async () => {
    const { titulares } = await import("@/forja/dominio/repeticion")
    const red = redForja(e, AHORA)
    const evs = eventosDelDia(e, AHORA)
    const lista = titulares(evs, red)
    expect(lista.length).toBeGreaterThan(0)
    for (let i = 1; i < lista.length; i++) expect(lista[i - 1].en >= lista[i].en).toBe(true)
    const quiebre = evs.find((x) => x.tipo === "stock_critico")
    if (quiebre) expect(lista.find((t) => t.id === quiebre.id)?.tono).toBe("alerta")
  })

  it("la sala de control recorre la red completa y después cada sucursal", async () => {
    const { recorridoSala } = await import("@/forja/dominio/repeticion")
    const red = redForja(e, AHORA)
    expect(recorridoSala(red)).toEqual([null, ...red.nodos.map((n) => n.id)])
  })
})

describe("Forja · activación", () => {
  it("dura 4,5 s como máximo y cada tramo cae dentro", async () => {
    const { CRONOGRAMA, DURACION_ACTIVACION, tramo } = await import("@/forja/dominio/activacion")
    expect(DURACION_ACTIVACION).toBeLessThanOrEqual(4.5)
    for (const r of Object.values(CRONOGRAMA)) {
      const lista = "desde" in r ? [r] : r.map((x) => ({ desde: x, hasta: x }))
      for (const x of lista) {
        expect(x.desde).toBeGreaterThanOrEqual(0)
        expect(x.hasta).toBeLessThanOrEqual(DURACION_ACTIVACION)
        expect(x.desde).toBeLessThanOrEqual(x.hasta)
      }
    }
    expect(tramo(0, CRONOGRAMA.caida)).toBe(0)
    expect(tramo(0.36, CRONOGRAMA.caida)).toBeCloseTo(0.5)
    expect(tramo(9, CRONOGRAMA.iris)).toBe(1)
  })

  it("se muestra la primera vez o cuando se pide, y no otra vez sola", async () => {
    const { debeMostrarActivacion, PREFERENCIA_ACTIVACION } = await import("@/forja/dominio/activacion")
    expect(debeMostrarActivacion(false, {})).toBe(true)
    expect(debeMostrarActivacion(false, { [PREFERENCIA_ACTIVACION]: "2026-10-07T18:30:00.000Z" })).toBe(false)
    expect(debeMostrarActivacion(true, { [PREFERENCIA_ACTIVACION]: "2026-10-07T18:30:00.000Z" })).toBe(true)
  })

  it("el isotipo se extruye desde su trazo poligonal", async () => {
    const { poligonoDeTrazo } = await import("@/forja/dominio/activacion")
    const { TRAZO_YUNQUE } = await import("@/components/marca/trazos")
    const p = poligonoDeTrazo(TRAZO_YUNQUE)
    expect(p.length).toBe(19)
    expect(p[0]).toEqual([2, 34])
    for (const [x, y] of p) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(100)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(88)
    }
  })
})
