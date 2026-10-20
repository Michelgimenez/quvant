import { beforeAll, describe, expect, it } from "vitest"
import { generarEmpresaDemo } from "@/datos/demo/generar"
import { claveStock, listaDefault, precioDe, stockDe, type EstadoEmpresa } from "@/dominio/estado"
import type { Producto } from "@/dominio/tipos"
import { AlmacenMemoria, AlmacenServidorMemoria } from "@/sync/almacen"
import { MotorSync, type EventoMotor } from "@/sync/motor"
import { ServidorDemo } from "@/sync/servidor-demo"
import type { Operacion, UsuarioContexto, VentaNueva } from "@/sync/tipos"

const AHORA = new Date("2026-10-07T15:30:00.000Z")
let SEMILLA: EstadoEmpresa
beforeAll(() => {
  SEMILLA = generarEmpresaDemo({ ahora: AHORA, dias: 30 })
})

type Sincronizado = Extract<EventoMotor, { tipo: "sincronizado" }>

function escenario() {
  const almacenServidor = new AlmacenServidorMemoria()
  let red = true
  const servidor = new ServidorDemo({ semilla: () => structuredClone(SEMILLA), almacen: almacenServidor, disponible: () => red })
  const cc = SEMILLA.sucursales.find((s) => s.codigo === "CC")!
  const usuario = (email: string): UsuarioContexto => {
    const u = SEMILLA.usuarios.find((x) => x.email === email)!
    return { id: u.id, rol: u.rol, sucursalIds: u.sucursalIds }
  }
  const crearMotor = (u: UsuarioContexto, almacen = new AlmacenMemoria()) =>
    new MotorSync({ almacen, servidor, semilla: () => structuredClone(SEMILLA), usuario: u, hayRed: () => red, demoraSyncMs: 100_000 }).iniciar()
  return {
    servidor,
    cc,
    usuario,
    crearMotor,
    cortar: () => {
      red = false
    },
    reconectar: () => {
      red = true
    },
  }
}

function conStock(e: EstadoEmpresa, sucursalId: string, minimo = 1): Producto {
  return Object.values(e.productos).find((p) => stockDe(e, sucursalId, p.id) >= minimo && precioDe(e, listaDefault(e).id, p.id) > 0)!
}

function venta(m: MotorSync, sucursalId: string, p: Producto, cantidad = 1, extra: Partial<VentaNueva> = {}): VentaNueva {
  const lista = listaDefault(m.estado).id
  const precio = precioDe(m.estado, lista, p.id)
  return {
    id: m.uuid(),
    sucursalId,
    puesto: 1,
    numeroLocal: `CC1-L${Math.floor(Math.random() * 9999)}`,
    fecha: new Date().toISOString(),
    clienteId: null,
    listaId: lista,
    items: [{ productoId: p.id, descripcion: p.nombre, cantidad, precioUnitario: precio, descuentoPct: 0, costoUnitario: 0 }],
    pagos: [{ medio: "efectivo", importe: Math.round(precio * cantidad) }],
    entrega: null,
    ...extra,
  }
}

function eventoSync(eventos: EventoMotor[]) {
  return eventos.find((e) => e.tipo === "sincronizado") as Sincronizado
}

describe("motor de sincronización", () => {
  it("una venta en línea se sincroniza y recibe número definitivo", async () => {
    const { crearMotor, usuario, cc, servidor } = escenario()
    const m = await crearMotor(usuario("mostrador@demo.quvant.app"))
    const p = conStock(m.estado, cc.id)
    const antes = stockDe(m.estado, cc.id, p.id)
    const v = venta(m, cc.id, p)
    const r = await m.ejecutar("venta.crear", { venta: v }, { sucursalId: cc.id })
    expect(r.ok).toBe(true)
    expect(m.estado.ventas[v.id].numero).toBeNull() // provisorio hasta sincronizar
    expect(stockDe(m.estado, cc.id, p.id)).toBe(antes - 1)
    await m.sincronizar()
    expect(m.pendientes).toHaveLength(0)
    expect(m.estado.ventas[v.id].numero).toBeGreaterThan(0)
    expect(m.estado.ventas[v.id].comprobante.cae).toMatch(/^\d{14}$/)
    const srv = await servidor.estadoActual()
    expect(srv.ventas[v.id].numero).toBe(m.estado.ventas[v.id].numero)
  })

  it("una venta hecha mientras se sincroniza la anterior no queda esperando en la cola", async () => {
    const { crearMotor, usuario, cc, servidor } = escenario()
    const m = await crearMotor(usuario("mostrador@demo.quvant.app"))
    const p = conStock(m.estado, cc.id, 2)
    // Servidor lento: la segunda venta entra con el primer ciclo en curso
    const enviar = servidor.enviar.bind(servidor)
    let primera = true
    servidor.enviar = async (ops, autor) => {
      if (primera) {
        primera = false
        await m.ejecutar("venta.crear", { venta: venta(m, cc.id, p) }, { sucursalId: cc.id })
        void m.sincronizar()
      }
      return enviar(ops, autor)
    }
    await m.ejecutar("venta.crear", { venta: venta(m, cc.id, p) }, { sucursalId: cc.id })
    await m.sincronizar()
    expect(m.pendientes).toHaveLength(0)
    expect(Object.values(m.estado.ventas).filter((v) => v.numeroLocal.startsWith("CC1-L") && v.numero !== null).length).toBeGreaterThanOrEqual(2)
  })

  it("sin conexión: se sigue vendiendo, la cola persiste y se sincroniza al volver", async () => {
    const { crearMotor, usuario, cc, cortar, reconectar } = escenario()
    const almacen = new AlmacenMemoria()
    const m = await crearMotor(usuario("mostrador@demo.quvant.app"), almacen)
    cortar()
    const p = conStock(m.estado, cc.id, 3)
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const v = venta(m, cc.id, p)
      ids.push(v.id)
      expect((await m.ejecutar("venta.crear", { venta: v }, { sucursalId: cc.id })).ok).toBe(true)
    }
    await m.sincronizar()
    expect(m.conexion).toBe("sin_conexion")
    expect(m.pendientes).toHaveLength(3)
    expect(m.pendientes.every((o) => o.sinConexion)).toBe(true)

    // "Recarga" de la app sin conexión: la cola sigue ahí y el estado la incluye.
    const recargado = await crearMotor(usuario("mostrador@demo.quvant.app"), almacen)
    expect(recargado.pendientes).toHaveLength(3)
    expect(stockDe(recargado.estado, cc.id, p.id)).toBe(stockDe(m.estado, cc.id, p.id))

    const eventos: EventoMotor[] = []
    recargado.suscribir((e) => eventos.push(e))
    reconectar()
    await recargado.sincronizar()
    expect(recargado.pendientes).toHaveLength(0)
    expect(eventoSync(eventos)).toMatchObject({ enviadas: 3, sinConexion: 3, ventasSinConexion: 3 })
    const numeros = ids.map((id) => recargado.estado.ventas[id].numero)
    expect(numeros.every((n) => typeof n === "number")).toBe(true)
    expect(new Set(numeros).size).toBe(3)
    expect(ids.every((id) => recargado.estado.ventas[id].origen === "sin_conexion")).toBe(true)
  })

  it("reenviar una operación es seguro (idempotencia)", async () => {
    const { crearMotor, usuario, cc, servidor } = escenario()
    const u = usuario("mostrador@demo.quvant.app")
    const m = await crearMotor(u)
    const p = conStock(m.estado, cc.id)
    const v = venta(m, cc.id, p)
    const op: Operacion = {
      id: m.uuid(),
      tipo: "venta.crear",
      orgId: m.estado.org.id,
      usuarioId: u.id,
      sucursalId: cc.id,
      creadaEn: new Date().toISOString(),
      dispositivo: "x",
      sinConexion: false,
      datos: { venta: v },
    }
    const [a] = await servidor.enviar([op], u)
    const [b] = await servidor.enviar([op], u)
    expect(a.seq).toBe(b.seq)
    const srv = await servidor.estadoActual()
    expect(Object.values(srv.ventas).filter((x) => x.id === v.id)).toHaveLength(1)
    expect(stockDe(srv, cc.id, p.id)).toBe(stockDe(SEMILLA, cc.id, p.id) - 1)
  })

  it("conflicto: dos puestos convierten el mismo presupuesto; gana el primero y el segundo se informa", async () => {
    const { crearMotor, usuario, cc, cortar, reconectar, servidor } = escenario()
    const uA = usuario("mostrador@demo.quvant.app")
    const uB = usuario("admin@demo.quvant.app")
    const a = await crearMotor(uA)
    const pre = Object.values(a.estado.presupuestos).find((p) => p.sucursalId === cc.id && (p.estado === "enviado" || p.estado === "aceptado"))!
    expect(pre).toBeTruthy()
    const datosVenta = (): VentaNueva => ({
      id: a.uuid(),
      sucursalId: cc.id,
      puesto: 1,
      numeroLocal: "X",
      fecha: new Date().toISOString(),
      clienteId: pre.clienteId,
      listaId: pre.listaId,
      items: pre.items,
      pagos: [{ medio: "transferencia", importe: pre.total }],
      entrega: null,
    })
    // A convierte sin conexión
    cortar()
    const ra = await a.ejecutar("presupuesto.convertir", { presupuestoId: pre.id, venta: datosVenta() }, { sucursalId: cc.id })
    expect(ra.ok).toBe(true)
    expect(a.estado.presupuestos[pre.id].estado).toBe("convertido")
    // B (otro dispositivo) lo convierte y sincroniza primero
    const ventaB = datosVenta()
    const rb = await servidor.inyectar(
      {
        id: a.uuid(),
        tipo: "presupuesto.convertir",
        orgId: a.estado.org.id,
        usuarioId: uB.id,
        sucursalId: cc.id,
        creadaEn: new Date().toISOString(),
        dispositivo: "B",
        sinConexion: false,
        datos: { presupuestoId: pre.id, venta: ventaB },
      },
      uB,
    )
    expect(rb.resultado.ok).toBe(true)
    // A vuelve: su conversión se rechaza y la réplica queda igual al servidor
    const eventos: EventoMotor[] = []
    a.suscribir((e) => eventos.push(e))
    reconectar()
    await a.sincronizar()
    const sync = eventoSync(eventos)
    expect(sync.rechazadas).toHaveLength(1)
    expect(sync.rechazadas[0].error).toMatch(/ya se convirtió/)
    expect(a.estado.presupuestos[pre.id].ventaId).toBe(ventaB.id)
    expect(a.pendientes).toHaveLength(0)
    const srv = await servidor.estadoActual()
    for (const it of pre.items) expect(stockDe(a.estado, cc.id, it.productoId)).toBe(stockDe(srv, cc.id, it.productoId))
  })

  it("dos puestos venden la última unidad sin conexión: ambas se aceptan con advertencia de stock negativo", async () => {
    const { crearMotor, usuario, cc, cortar, reconectar } = escenario()
    const a = await crearMotor(usuario("mostrador@demo.quvant.app"))
    const b = await crearMotor(usuario("admin@demo.quvant.app"))
    const p = conStock(a.estado, cc.id)
    const unidades = stockDe(a.estado, cc.id, p.id)
    cortar()
    await a.ejecutar("venta.crear", { venta: venta(a, cc.id, p, unidades) }, { sucursalId: cc.id })
    await b.ejecutar("venta.crear", { venta: venta(b, cc.id, p, 1, { puesto: 2 }) }, { sucursalId: cc.id })
    reconectar()
    const eventos: EventoMotor[] = []
    b.suscribir((e) => eventos.push(e))
    await a.sincronizar()
    await b.sincronizar()
    await a.sincronizar()
    expect(stockDe(a.estado, cc.id, p.id)).toBe(-1)
    expect(stockDe(b.estado, cc.id, p.id)).toBe(-1)
    expect(eventoSync(eventos).avisos[0].avisos.some((x) => x.startsWith("stock_negativo"))).toBe(true)
  })

  it("venta sin conexión con precio viejo: se acepta y queda marcada", async () => {
    const { crearMotor, usuario, cc, cortar, reconectar, servidor } = escenario()
    const m = await crearMotor(usuario("mostrador@demo.quvant.app"))
    const p = conStock(m.estado, cc.id)
    cortar()
    const v = venta(m, cc.id, p)
    await m.ejecutar("venta.crear", { venta: v }, { sucursalId: cc.id })
    const compras = usuario("compras@demo.quvant.app")
    await servidor.inyectar(
      {
        id: m.uuid(),
        tipo: "precio.editar",
        orgId: m.estado.org.id,
        usuarioId: compras.id,
        sucursalId: null,
        creadaEn: new Date().toISOString(),
        dispositivo: "C",
        sinConexion: false,
        datos: { productoId: p.id, listaId: v.listaId, precio: v.items[0].precioUnitario + 100000 },
      },
      compras,
    )
    reconectar()
    await m.sincronizar()
    expect(m.estado.ventas[v.id].advertencias.some((a) => a.startsWith("precio_distinto"))).toBe(true)
    expect(m.estado.ventas[v.id].total).toBe(v.pagos[0].importe)
  })

  it("cerrar una caja ya cerrada desde otro puesto se rechaza", async () => {
    const { crearMotor, usuario, cc, cortar, reconectar } = escenario()
    const a = await crearMotor(usuario("mostrador@demo.quvant.app"))
    const b = await crearMotor(usuario("admin@demo.quvant.app"))
    const caja = Object.values(a.estado.cajas).find((c) => c.sucursalId === cc.id && c.estado === "abierta")!
    await b.ejecutar("caja.cerrar", { sesionId: caja.id, montoContado: 100 }, { sucursalId: cc.id })
    await b.sincronizar()
    cortar()
    const r = await a.ejecutar("caja.cerrar", { sesionId: caja.id, montoContado: 100 }, { sucursalId: cc.id })
    expect(r.ok).toBe(true) // localmente todavía figuraba abierta
    reconectar()
    const eventos: EventoMotor[] = []
    a.suscribir((e) => eventos.push(e))
    await a.sincronizar()
    expect(eventoSync(eventos).rechazadas[0].error).toMatch(/ya fue cerrada/)
    expect(a.estado.cajas[caja.id].cerradaPor).toBe(usuario("admin@demo.quvant.app").id)
  })

  it("las operaciones inválidas o sin permiso no entran a la cola", async () => {
    const { crearMotor, usuario, cc } = escenario()
    const tecnico = await crearMotor(usuario("tecnico@demo.quvant.app"))
    const p = conStock(tecnico.estado, cc.id)
    const r = await tecnico.ejecutar("venta.crear", { venta: venta(tecnico, cc.id, p) }, { sucursalId: cc.id })
    expect(r.ok).toBe(false)
    expect(tecnico.pendientes).toHaveLength(0)

    const norte = SEMILLA.sucursales.find((s) => s.codigo === "NO")!
    const m = await crearMotor(usuario("mostrador@demo.quvant.app"))
    const fuera = await m.ejecutar("venta.crear", { venta: venta(m, norte.id, conStock(m.estado, norte.id)) }, { sucursalId: norte.id })
    expect(fuera).toMatchObject({ ok: false, codigo: "sucursal" })

    const mal = venta(m, cc.id, p)
    mal.pagos = [{ medio: "efectivo", importe: 1 }]
    expect((await m.ejecutar("venta.crear", { venta: mal }, { sucursalId: cc.id })).ok).toBe(false)
    expect(m.pendientes).toHaveLength(0)
  })

  it("tras sincronizar, la réplica local coincide con el servidor", async () => {
    const { crearMotor, usuario, cc, servidor, cortar, reconectar } = escenario()
    const a = await crearMotor(usuario("mostrador@demo.quvant.app"))
    const dep = await crearMotor(usuario("deposito@demo.quvant.app"))
    const p = conStock(a.estado, cc.id, 5)
    cortar()
    await a.ejecutar("venta.crear", { venta: venta(a, cc.id, p, 2) }, { sucursalId: cc.id })
    await dep.ejecutar("stock.ajustar", { sucursalId: cc.id, productoId: p.id, cantidad: 10, motivo: "Ingreso sin remito" }, { sucursalId: cc.id })
    reconectar()
    await dep.sincronizar()
    await a.sincronizar()
    await dep.sincronizar()
    const srv = await servidor.estadoActual()
    const k = claveStock(cc.id, p.id)
    expect(a.estado.stock[k]).toEqual(srv.stock[k])
    expect(dep.estado.stock[k]).toEqual(srv.stock[k])
    expect(Object.keys(a.estado.ventas).length).toBe(Object.keys(srv.ventas).length)
  })
})
