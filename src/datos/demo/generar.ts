import { Azar, uuidDe } from "@/lib/azar"
import { claveStock, clavePrecio, type EstadoEmpresa } from "@/dominio/estado"
import { MODULOS, type AumentoPrecio, type Categoria, type Cliente, type Conteo, type Entrega, type EstadoServicio, type EventoServicio, type Id, type ItemComercial, type ListaPrecio, type Marca, type MedioPago, type MovimientoStock, type OrdenCompra, type OrdenServicio, type Organizacion, type Pago, type Presupuesto, type Producto, type Proveedor, type RegistroAuditoria, type Sucursal, type TipoMovimiento, type Transferencia, type Usuario, type Venta } from "@/dominio/tipos"
import { formatoPesos } from "@/dominio/dinero"
import { mensajeAvisoServicio } from "@/dominio/servicio"
import {
  APELLIDOS,
  CALLES,
  CATEGORIAS_DEMO,
  EMPRESAS_NOMBRE,
  EMPRESAS_PREFIJO,
  EMPRESAS_SUFIJO,
  FACTOR_MARCA,
  LISTAS_DEMO,
  NEGOCIOS_DEMO,
  NOMBRES,
  PROVEEDORES_DEMO,
  USUARIOS_DEMO,
  SEMILLA_DEMO,
  COLOR_DEMO,
  type CategoriaDemo,
} from "./catalogo"
import { claveDia, diaART, diaSemana, enART, sumarDias } from "./tiempo"

export type OpcionesDemo = {
  semilla?: string
  /** Momento "actual" de la demo. Fijarlo da datos idénticos (tests y capturas). */
  ahora?: Date
  dias?: number
  org?: Partial<Pick<Organizacion, "nombre" | "slug" | "colorAcento" | "logo" | "logoNegativo">>
  categorias?: CategoriaDemo[]
}

export { SEMILLA_DEMO, COLOR_DEMO } from "./catalogo"

type InfoProducto = { pop: number; maquina: boolean; cantidad: [number, number]; cat: CategoriaDemo }

const FALLAS: Record<string, { falla: string; diagnostico: string }[]> = {
  default: [
    { falla: "No enciende", diagnostico: "Interruptor quemado. Se reemplaza interruptor y se prueba bajo carga." },
    { falla: "Hace ruido en el reductor", diagnostico: "Engranajes del reductor desgastados. Se cambian engranajes y rulemanes." },
    { falla: "Recalienta y se apaga", diagnostico: "Inducido con espiras en corto. Se rebobina inducido." },
    { falla: "Chispea mucho en los carbones", diagnostico: "Carbones gastados y colector marcado. Se cambian carbones y se rectifica colector." },
  ],
  soldadora: [
    { falla: "No abre arco", diagnostico: "Placa de potencia con IGBT dañado. Se reemplaza módulo." },
    { falla: "Corta el arco al rato", diagnostico: "Sensor térmico defectuoso y ventilador trabado. Se reemplazan." },
  ],
  compresor: [
    { falla: "No llega a presión", diagnostico: "Válvula de retención y aros del pistón gastados. Se reemplazan." },
    { falla: "Pierde aire por la válvula", diagnostico: "Presostato con membrana rota. Se cambia presostato." },
  ],
  generador: [
    { falla: "Arranca pero no genera tensión", diagnostico: "AVR quemado. Se reemplaza regulador de tensión." },
    { falla: "No arranca", diagnostico: "Carburador sucio y bujía en mal estado. Limpieza y cambio de bujía." },
  ],
  hidrolavadora: [
    { falla: "Pierde presión", diagnostico: "Válvulas de la bomba desgastadas. Kit de válvulas y sellos." },
    { falla: "Pierde agua por la bomba", diagnostico: "Sellos de la bomba vencidos. Se cambian sellos." },
  ],
  bomba: [{ falla: "No levanta agua", diagnostico: "Impulsor desgastado y sello mecánico roto. Se reemplazan." }],
  sierra: [{ falla: "Se frena al cortar", diagnostico: "Embrague y carbones gastados. Se reemplazan." }],
}

const ACCESORIOS = ["Sin accesorios", "Con valija", "Con cargador y 1 batería", "Con manguera", "Con disco", "Con cable y pinza"]
const CHOFERES = ["Hugo · camioneta 1", "Ezequiel · camioneta 2"]

/**
 * Genera la empresa demo completa, determinística para una semilla y un día.
 * Simula día por día: ventas, reposición, presupuestos, servicio técnico,
 * cuentas corrientes, cajas, conteos y entregas, para que los números cierren.
 */
export function generarEmpresaDemo(opciones: OpcionesDemo = {}): EstadoEmpresa {
  const ahora = opciones.ahora ?? new Date()
  const semilla = opciones.semilla ?? SEMILLA_DEMO
  const DIAS = opciones.dias ?? 182
  const hoy = diaART(ahora)
  const az = new Azar(`${semilla}:${claveDia(hoy)}`)
  const azEstable = new Azar(semilla) // catálogo estable entre días
  const categoriasDemo = opciones.categorias ?? CATEGORIAS_DEMO
  const iso = (d: Date) => d.toISOString()

  // ───────── Organización y estructura ─────────
  const orgId = uuidDe(`${semilla}:org`)
  const org: Organizacion = {
    id: orgId,
    nombre: opciones.org?.nombre ?? "Ferretería Industrial Demo",
    slug: opciones.org?.slug ?? "ferreteria-industrial-demo",
    logo: opciones.org?.logo ?? "/demo/ferreteria-industrial-demo-claro.svg",
    logoNegativo: opciones.org?.logoNegativo ?? "/demo/ferreteria-industrial-demo-oscuro.svg",
    colorAcento: opciones.org?.colorAcento ?? COLOR_DEMO,
    modulos: Object.fromEntries(MODULOS.map((m) => [m, true])) as Organizacion["modulos"],
    esDemo: true,
    creadaEn: iso(enART(sumarDias(hoy, -DIAS - 30), 9)),
    extensiones: {},
  }

  const negocios = NEGOCIOS_DEMO.map((n, i) => ({
    id: uuidDe(`${semilla}:negocio:${i}`),
    orgId,
    nombre: i === 0 && opciones.org?.nombre ? opciones.org.nombre : n.nombre,
    rubro: n.rubro,
    cuit: i === 0 ? "30-71234567-1" : "30-71765432-8",
  }))

  const sucursales: (Sucursal & { ventasDia: number })[] = NEGOCIOS_DEMO.flatMap((n, i) =>
    n.sucursales.map((s) => ({
      id: uuidDe(`${semilla}:sucursal:${s.codigo}`),
      orgId,
      negocioId: negocios[i].id,
      nombre: s.nombre,
      codigo: s.codigo,
      direccion: s.direccion,
      puestos: s.puestos,
      tipo: "sucursal" as const,
      lat: s.lat,
      lng: s.lng,
      demo: true,
      ventasDia: s.ventasDia,
    })),
  )
  const sucPorCodigo = (c: string) => sucursales.find((s) => s.codigo === c)!

  const usuarios: Usuario[] = USUARIOS_DEMO.map((u, i) => ({
    id: uuidDe(`usuario:${u.email}`),
    orgId,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    sucursalIds: u.sucursales ? u.sucursales.map((c) => sucPorCodigo(c).id) : null,
    activo: true,
    dosFactor: u.rol === "dueno" || u.rol === "administracion",
    ultimoIngreso: iso(enART(sumarDias(hoy, -(i % 3)), 8, 5 + i * 3)),
    permisosExtra: u.permisosExtra ?? [],
    preferencias: {},
  }))
  const U = (email: string) => usuarios.find((u) => u.email === email)!.id
  const vendedoresPor: Record<string, Id[]> = {
    CC: [U("mostrador@demo.yunque.app"), U("admin@demo.yunque.app")],
    NO: [U("mostrador.norte@demo.yunque.app")],
    DM: [U("maquinaria@demo.yunque.app"), U("dueno@demo.yunque.app")],
  }
  const tecnicos = [U("tecnico@demo.yunque.app"), U("tecnico2@demo.yunque.app")]
  const deposito = U("deposito@demo.yunque.app")
  const compras = U("compras@demo.yunque.app")

  const listas: ListaPrecio[] = LISTAS_DEMO.map((l, i) => ({
    id: uuidDe(`${semilla}:lista:${i}`),
    orgId,
    nombre: l.nombre,
    margenSugerido: l.margen,
    esDefault: l.esDefault,
  }))
  const listaMinorista = listas[0]

  const proveedores: Proveedor[] = PROVEEDORES_DEMO.map((p, i) => ({
    id: uuidDe(`${semilla}:proveedor:${i}`),
    orgId,
    nombre: p.nombre,
    cuit: cuit(azEstable, "30"),
    contacto: `${azEstable.elegir(NOMBRES)} ${azEstable.elegir(APELLIDOS)}`,
    telefono: telefonoFicticio(azEstable),
    email: `ventas@${p.nombre.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, "")}.example`,
    diasEntrega: p.dias,
  }))

  const marcasNombres = [...new Set(categoriasDemo.flatMap((c) => c.marcas))]
  const marcas: Marca[] = marcasNombres.map((nombre) => ({ id: uuidDe(`${semilla}:marca:${nombre}`), orgId, nombre }))
  const marcaId = (n: string) => marcas.find((m) => m.nombre === n)!.id

  const categorias: Categoria[] = categoriasDemo.map((c) => ({
    id: uuidDe(`${semilla}:categoria:${c.codigo}`),
    orgId,
    nombre: c.nombre,
    ilustracion: c.ilustracion,
  }))

  // ───────── Productos ─────────
  const productos: Record<Id, Producto> = {}
  const info: Record<Id, InfoProducto> = {}
  let secuenciaBarras = 1
  categoriasDemo.forEach((cat, ci) => {
    let n = 1
    for (const pl of cat.plantillas) {
      const variantes = pl.variantes ?? [{ v: "", costo: pl.costo ?? 1000 }]
      const cantMarcas = Math.min(pl.marcas ?? cat.marcasPorProducto, cat.marcas.length)
      for (const variante of variantes) {
        const marcasDe = rotar(cat.marcas, n).slice(0, cantMarcas)
        for (const marca of marcasDe) {
          const id = uuidDe(`${semilla}:producto:${cat.codigo}:${n}`)
          const costoPesos = variante.costo * (FACTOR_MARCA[marca] ?? 1) * (1 + azEstable.normal(0, 0.035))
          const nombre = `${pl.nombre.replace("{v}", String(variante.v))} ${marca}`.replace(/\s+/g, " ").trim()
          productos[id] = {
            id,
            orgId,
            sku: `${cat.codigo}-${String(n).padStart(4, "0")}`,
            codigoBarras: ean13(`29${String(ci).padStart(2, "0")}${String(secuenciaBarras++).padStart(8, "0")}`),
            nombre,
            categoriaId: categorias[ci].id,
            marcaId: marcaId(marca),
            proveedorId: proveedores[(cat.proveedor + (n % 7 === 0 ? 1 : 0)) % proveedores.length].id,
            unidad: pl.unidad ?? "u",
            costo: redondearA(costoPesos, costoPesos > 5000 ? 100 : 10) * 100,
            iva: cat.codigo === "BF" && n % 5 === 0 ? 10.5 : 21,
            ilustracion: cat.ilustracion,
            activo: true,
            actualizadoEn: iso(enART(sumarDias(hoy, -azEstable.entero(1, 60)), 10)),
          }
          info[id] = {
            pop: (pl.pop ?? 1) * (marca === cat.marcas[0] ? 1.15 : 0.9) * azEstable.decimal(0.6, 1.4),
            maquina: Boolean(pl.maquina),
            cantidad: pl.cantidad ?? [1, pl.maquina ? 1 : 3],
            cat,
          }
          n++
        }
      }
    }
  })
  const listaProductos = Object.values(productos)

  // ───────── Precios actuales e historial de aumentos ─────────
  const precios: EstadoEmpresa["precios"] = {}
  const ruidoMargen: Record<Id, number> = {}
  for (const p of listaProductos) {
    ruidoMargen[p.id] = azEstable.normal(0, 4)
    listas.forEach((l) => {
      const margen = (l.margenSugerido + ruidoMargen[p.id] - (info[p.id].maquina ? 6 : 0)) / 100
      precios[clavePrecio(l.id, p.id)] = {
        orgId,
        productoId: p.id,
        listaId: l.id,
        precio: redondearPrecio(p.costo * (1 + margen) * (1 + p.iva / 100)),
        actualizadoEn: p.actualizadoEn,
      }
    })
  }

  const catPorCodigo = (c: string) => categorias[categoriasDemo.findIndex((x) => x.codigo === c)]?.id
  const definicionAumentos = [
    { dia: -128, pct: 8, descripcion: "Aumento lista de proveedor · marca Torkan", filtro: { marcaIds: marcas.filter((m) => m.nombre === "Torkan").map((m) => m.id) }, listaIds: listas.map((l) => l.id) },
    { dia: -84, pct: 6, descripcion: "Actualización general minorista y gremio", filtro: {}, listaIds: [listas[0].id, listas[1].id] },
    { dia: -33, pct: 12, descripcion: "Aumento abrasivos y bulonería", filtro: { categoriaIds: [catPorCodigo("AD"), catPorCodigo("BF")].filter(Boolean) as Id[] }, listaIds: listas.map((l) => l.id) },
  ].filter((a) => -a.dia <= DIAS)

  const afecta = (a: (typeof definicionAumentos)[number], p: Producto, listaId: Id) =>
    a.listaIds.includes(listaId) &&
    (!a.filtro.marcaIds || a.filtro.marcaIds.includes(p.marcaId)) &&
    (!("categoriaIds" in a.filtro) || !a.filtro.categoriaIds || a.filtro.categoriaIds.includes(p.categoriaId))

  /** Factor acumulado de aumentos posteriores al día `d` (relativo a hoy). */
  const factorPosterior = (p: Producto, listaId: Id, d: number) =>
    definicionAumentos.reduce((f, a) => (a.dia > d && afecta(a, p, listaId) ? f * (1 + a.pct / 100) : f), 1)

  const precioEnDia = (p: Producto, listaId: Id, d: number) =>
    redondearPrecio((precios[clavePrecio(listaId, p.id)]?.precio ?? 0) / factorPosterior(p, listaId, d))
  const costoEnDia = (p: Producto, d: number) => Math.round(p.costo / factorPosterior(p, listaMinorista.id, d))

  const aumentos: AumentoPrecio[] = definicionAumentos.map((a, i) => {
    const cambios: AumentoPrecio["cambios"] = []
    for (const p of listaProductos)
      for (const listaId of a.listaIds)
        if (afecta(a, p, listaId)) {
          const despues = precioEnDia(p, listaId, a.dia)
          cambios.push({ productoId: p.id, listaId, antes: redondearPrecio(despues / (1 + a.pct / 100)), despues })
        }
    return {
      id: uuidDe(`${semilla}:aumento:${i}`),
      orgId,
      fecha: iso(enART(sumarDias(hoy, a.dia), 8, 40)),
      usuarioId: compras,
      descripcion: a.descripcion,
      filtro: a.filtro,
      porcentaje: a.pct,
      listaIds: a.listaIds,
      redondeo: "100",
      cambios,
      revertido: false,
    }
  })

  // ───────── Stock inicial ─────────
  const stock: EstadoEmpresa["stock"] = {}
  const movimientos: MovimientoStock[] = []
  const lleva = (s: { codigo: string }, p: Producto) => {
    const i = info[p.id]
    if (s.codigo === "DM") return i.maquina && ["GE", "CN", "HL", "SO", "BA", "SI"].includes(i.cat.codigo)
    if (s.codigo === "NO") return p.costo < 150_000_000
    return true
  }
  const inicio = sumarDias(hoy, -DIAS)
  for (const s of sucursales) {
    for (const p of listaProductos) {
      if (!lleva(s, p)) continue
      const i = info[p.id]
      const escala = s.codigo === "CC" ? 1 : s.codigo === "NO" ? 0.55 : 0.8
      const semanal = (s.ventasDia * 6 * i.pop * ((i.cantidad[0] + i.cantidad[1]) / 2)) / 60
      const minimo = Math.max(i.maquina ? 1 : 2, Math.round(semanal * 1.5 * escala))
      const cantidad = Math.round(minimo * azEstable.decimal(1.8, 3.2)) + (i.maquina ? 1 : 3)
      stock[claveStock(s.id, p.id)] = {
        orgId,
        sucursalId: s.id,
        productoId: p.id,
        cantidad,
        minimo,
        ubicacion: `${i.cat.codigo}-${String.fromCharCode(65 + azEstable.entero(0, 5))}${azEstable.entero(1, 12)}`,
      }
    }
  }

  const transferencias: Record<Id, Transferencia> = {}
  const mover = (sucursalId: Id, productoId: Id, cantidad: number, tipo: TipoMovimiento, fecha: Date, refId: Id | null, motivo: string, usuarioId: Id) => {
    const st = stock[claveStock(sucursalId, productoId)]
    if (st) st.cantidad = Math.round((st.cantidad + cantidad) * 1000) / 1000
    movimientos.push({ id: az.uuid(), orgId, sucursalId, productoId, tipo, cantidad, refId, motivo, usuarioId, fecha: iso(fecha) })
  }

  // ───────── Clientes ─────────
  const clientes: Record<Id, Cliente> = {}
  const clientesEmpresa: Id[] = []
  const clientesParticulares: Id[] = []
  for (let i = 0; i < 120; i++) {
    const empresa = i < 58
    const id = uuidDe(`${semilla}:cliente:${i}`)
    const nombre = empresa
      ? `${azEstable.elegir(EMPRESAS_PREFIJO)} ${azEstable.elegir(EMPRESAS_NOMBRE)} ${azEstable.elegir(EMPRESAS_SUFIJO)}`.trim()
      : `${azEstable.elegir(NOMBRES)} ${azEstable.elegir(APELLIDOS)}`
    const condicionIva = empresa ? (azEstable.probabilidad(0.8) ? "RI" : "MT") : "CF"
    const lista = empresa ? azEstable.ponderado([[listas[1], 50], [listas[2], 25], [listas[0], 25]] as const) : listaMinorista
    const conCuenta = empresa && azEstable.probabilidad(0.62)
    clientes[id] = {
      id,
      orgId,
      nombre,
      cuit: empresa ? cuit(azEstable, "30") : azEstable.probabilidad(0.4) ? cuit(azEstable, azEstable.elegir(["20", "27"])) : "",
      condicionIva,
      telefono: telefonoFicticio(azEstable),
      whatsapp: telefonoFicticio(azEstable),
      email: empresa
        ? `compras@${nombre.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, "").slice(0, 18)}.example`
        : azEstable.probabilidad(0.5)
          ? `${nombre.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, ".")}@correo.example`
          : "",
      direccion: `${azEstable.elegir(CALLES)} ${azEstable.entero(100, 4800)}, Ciudad Demo`,
      listaId: lista.id,
      limiteCredito: conCuenta ? azEstable.elegir([500_000, 1_000_000, 2_000_000, 3_500_000, 5_000_000, 8_000_000]) * 100 : 0,
      notas: conCuenta && azEstable.probabilidad(0.3) ? "Paga a 30 días. Pedir orden de compra." : "",
      creadoEn: iso(enART(sumarDias(hoy, -DIAS - azEstable.entero(10, 700)), 11)),
    }
    ;(empresa ? clientesEmpresa : clientesParticulares).push(id)
  }
  const movimientosCuenta: EstadoEmpresa["movimientosCuenta"] = []
  const saldo: Record<Id, number> = {}
  const cargarCuenta = (clienteId: Id, importe: number, tipo: "venta" | "pago" | "ajuste", fecha: Date, refId: Id | null, descripcion: string) => {
    movimientosCuenta.push({ id: az.uuid(), orgId, clienteId, fecha: iso(fecha), tipo, importe, refId, descripcion })
    saldo[clienteId] = (saldo[clienteId] ?? 0) + importe
  }
  // Saldos iniciales de cuentas corrientes
  for (const id of clientesEmpresa) {
    const c = clientes[id]
    if (c.limiteCredito > 0 && az.probabilidad(0.6)) {
      cargarCuenta(id, Math.round((c.limiteCredito * az.decimal(0.05, 0.45)) / 10000) * 10000, "ajuste", enART(inicio, 8), null, "Saldo inicial migrado")
    }
  }

  // ───────── Simulación diaria ─────────
  const ventas: Record<Id, Venta> = {}
  const presupuestos: Record<Id, Presupuesto> = {}
  const servicio: Record<Id, OrdenServicio> = {}
  const comprasOC: Record<Id, OrdenCompra> = {}
  const entregas: Record<Id, Entrega> = {}
  const auditoria: RegistroAuditoria[] = []
  const numeradores: Record<string, number> = {}
  const recepciones: { dia: number; ocId: Id }[] = []
  const numInicial: Record<string, number> = { CC: 10480, NO: 4210, DM: 1730 }
  const numero = (tipo: string, cod: string) => {
    const k = `${tipo}:${cod}`
    numeradores[k] = (numeradores[k] ?? (tipo === "venta" ? numInicial[cod] ?? 1000 : tipo === "presupuesto" ? 3100 : tipo === "servicio" ? 820 : 210)) + 1
    return numeradores[k]
  }
  const auditar = (fecha: Date, usuarioId: Id, accion: string, entidad: string, entidadId: Id | null, resumen: string, origen: RegistroAuditoria["origen"] = "en_linea") => {
    if (fecha.getTime() > ahora.getTime() - 30 * 86_400_000) {
      auditoria.push({ id: az.uuid(), orgId, fecha: iso(fecha), usuarioId, accion, entidad, entidadId, resumen, origen })
    }
  }

  const pesosPorSucursal: Record<Id, [Producto, number][]> = {}
  for (const s of sucursales) {
    pesosPorSucursal[s.id] = listaProductos
      .filter((p) => lleva(s, p))
      .map((p) => [p, info[p.id].pop * (s.codigo === "DM" ? 1 : info[p.id].maquina ? 0.3 : 1.5)] as [Producto, number])
  }

  const armarItems = (s: Sucursal, d: number, listaId: Id, maxItems: number, verificarStock: boolean): ItemComercial[] => {
    const cantItems = Math.min(maxItems, az.ponderado([[1, 40], [2, 28], [3, 16], [4, 10], [5, 6]] as const))
    const items: ItemComercial[] = []
    const usados = new Set<Id>()
    for (let k = 0; k < cantItems * 2 && items.length < cantItems; k++) {
      const p = az.ponderado(pesosPorSucursal[s.id])
      if (usados.has(p.id)) continue
      const i = info[p.id]
      let cantidad = i.maquina ? (az.probabilidad(0.06) ? 2 : 1) : az.entero(i.cantidad[0], i.cantidad[1])
      if (verificarStock) {
        const disp = stock[claveStock(s.id, p.id)]?.cantidad ?? 0
        if (disp <= 0) continue
        cantidad = Math.min(cantidad, disp)
      }
      usados.add(p.id)
      items.push({
        productoId: p.id,
        descripcion: p.nombre,
        cantidad,
        precioUnitario: precioEnDia(p, listaId, d),
        descuentoPct: !i.maquina && cantidad >= 10 && az.probabilidad(0.3) ? 5 : 0,
        costoUnitario: costoEnDia(p, d),
      })
    }
    return items
  }
  const totalItems = (items: ItemComercial[]) =>
    items.reduce((t, it) => t + Math.round(it.cantidad * it.precioUnitario * (1 - it.descuentoPct / 100)), 0)

  const registrarVenta = (s: Sucursal, fecha: Date, d: number, opciones: { clienteId?: Id | null; items?: ItemComercial[]; presupuestoId?: Id | null } = {}) => {
    const clienteId =
      opciones.clienteId !== undefined
        ? opciones.clienteId
        : az.probabilidad(s.codigo === "DM" ? 0.75 : 0.42)
          ? az.probabilidad(0.7) ? az.elegir(clientesEmpresa) : az.elegir(clientesParticulares)
          : null
    const cliente = clienteId ? clientes[clienteId] : null
    const listaId = cliente?.listaId ?? listaMinorista.id
    const items = opciones.items ?? armarItems(s, d, listaId, s.codigo === "DM" ? 2 : 5, true)
    if (items.length === 0) return null
    const total = totalItems(items)
    const id = az.uuid()
    const puesto = az.entero(1, s.puestos)
    const medio: MedioPago =
      cliente && cliente.limiteCredito > 0 && az.probabilidad(0.45) && (saldo[cliente.id] ?? 0) + total < cliente.limiteCredito * 1.05
        ? "cuenta_corriente"
        : az.ponderado([["efectivo", 30], ["debito", 21], ["credito", 15], ["transferencia", 22], ["mercadopago", 12]] as const)
    let pagos: Pago[] = [{ medio, importe: total }]
    if (medio === "efectivo" && total > 20_000_00 && az.probabilidad(0.15)) {
      const parte = Math.round((total * 0.4) / 100) * 100
      pagos = [{ medio: "efectivo", importe: parte }, { medio: "debito", importe: total - parte }]
    }
    const num = numero("venta", s.codigo)
    const sinConexion = az.probabilidad(0.03)
    const entrega = (s.codigo === "DM" && az.probabilidad(0.35)) || (s.codigo !== "DM" && total > 150_000_00 && az.probabilidad(0.3))
    const vendedorId = az.elegir(vendedoresPor[s.codigo])
    const venta: Venta = {
      id,
      orgId,
      negocioId: s.negocioId,
      sucursalId: s.id,
      puesto,
      numero: num,
      numeroLocal: `${s.codigo}${puesto}-L${String(num).slice(-4)}`,
      fecha: iso(fecha),
      clienteId,
      listaId,
      items,
      total,
      pagos,
      estado: "confirmada",
      comprobante: {
        tipo: cliente?.condicionIva === "RI" ? "FA" : "FB",
        cae: String(az.entero(10_000_000, 99_999_999)) + String(az.entero(100_000, 999_999)),
        emulado: true,
      },
      presupuestoId: opciones.presupuestoId ?? null,
      vendedorId,
      origen: sinConexion ? "sin_conexion" : "en_linea",
      entrega,
      advertencias: [],
    }
    ventas[id] = venta
    for (const it of items) mover(s.id, it.productoId, -it.cantidad, "venta", fecha, id, `Venta #${num}`, vendedorId)
    if (medio === "cuenta_corriente" && clienteId) cargarCuenta(clienteId, total, "venta", fecha, id, `Venta #${num}`)
    auditar(fecha, vendedorId, "venta.crear", "venta", id, `Venta #${num} · ${formatoPesos(total)}`, sinConexion ? "sin_conexion" : "en_linea")

    if (entrega) {
      const programada = sumarDias(diaART(fecha), az.entero(1, 3))
      const fechaProg = enART(programada, 9)
      const pasada = fechaProg.getTime() < ahora.getTime() - 86_400_000 * 0.4
      const eid = az.uuid()
      entregas[eid] = {
        id: eid,
        orgId,
        sucursalId: s.id,
        ventaId: id,
        clienteId,
        destinatario: cliente?.nombre ?? `${az.elegir(NOMBRES)} ${az.elegir(APELLIDOS)}`,
        direccion: cliente?.direccion ?? `${az.elegir(CALLES)} ${az.entero(100, 4800)}, Ciudad Demo`,
        telefono: cliente?.telefono ?? telefonoFicticio(az),
        fechaProgramada: iso(fechaProg),
        franja: az.probabilidad(0.55) ? "mañana" : "tarde",
        estado: pasada ? (az.probabilidad(0.95) ? "entregada" : "fallida") : "pendiente",
        chofer: az.elegir(CHOFERES),
        orden: 0,
        notas: az.probabilidad(0.2) ? "Llamar antes de llegar" : "",
        actualizadoEn: iso(fechaProg),
      }
    }
    return venta
  }

  for (let d = -DIAS; d <= 0; d++) {
    const dia = sumarDias(hoy, d)
    const ds = diaSemana(dia)
    const progreso = (d + DIAS) / DIAS
    const esHoy = d === 0

    // Recepciones de compras
    for (const r of recepciones.filter((x) => x.dia === d)) {
      const oc = comprasOC[r.ocId]
      const fecha = enART(dia, 10, 15)
      if (esHoy && fecha > ahora) continue
      for (const it of oc.items) {
        it.recibido = it.cantidad
        mover(oc.sucursalId, it.productoId, it.cantidad, "compra", fecha, oc.id, `Recepción OC #${oc.numero}`, deposito)
      }
      oc.estado = "recibida"
      oc.actualizadoEn = iso(fecha)
      auditar(fecha, deposito, "compra.recibir", "compra", oc.id, `Recepción OC #${oc.numero}`)
    }

    if (ds === 0) continue // domingo cerrado

    // Reposición semanal (lunes): órdenes de compra por proveedor y sucursal
    if (ds === 1 && d < 0) {
      const fecha = enART(dia, 9, 30)
      for (const s of sucursales) {
        const porProveedor: Record<Id, OrdenCompra["items"]> = {}
        for (const p of listaProductos) {
          const st = stock[claveStock(s.id, p.id)]
          if (!st || st.cantidad > st.minimo * 1.4) continue
          const cant = Math.max(st.minimo * 3 - st.cantidad, info[p.id].maquina ? 1 : 5)
          ;(porProveedor[p.proveedorId] ??= []).push({ productoId: p.id, cantidad: Math.ceil(cant), costoUnitario: costoEnDia(p, d), recibido: 0 })
        }
        for (const [provId, items] of Object.entries(porProveedor)) {
          const prov = proveedores.find((x) => x.id === provId)!
          const id = az.uuid()
          const num = numero("compra", "OC")
          const llega = d + prov.diasEntrega + az.entero(0, 2)
          comprasOC[id] = {
            id,
            orgId,
            sucursalId: s.id,
            proveedorId: provId,
            numero: num,
            numeroLocal: `OC-${num}`,
            fecha: iso(fecha),
            estado: "enviada",
            items,
            total: items.reduce((t, it) => t + it.cantidad * it.costoUnitario, 0),
            notas: "",
            actualizadoEn: iso(fecha),
          }
          recepciones.push({ dia: llega, ocId: id })
          auditar(fecha, compras, "compra.guardar", "compra", id, `OC #${num} a ${prov.nombre}`)
        }
      }
    }

    // Transferencias (miércoles): Casa Central abastece a Norte
    if (ds === 3 && d < 0) {
      const cc = sucPorCodigo("CC")
      const no = sucPorCodigo("NO")
      const fecha = enART(dia, 8, 30)
      let n = 0
      const items: { productoId: Id; cantidad: number }[] = []
      for (const p of listaProductos) {
        const a = stock[claveStock(no.id, p.id)]
        const b = stock[claveStock(cc.id, p.id)]
        if (!a || !b || a.cantidad > a.minimo || b.cantidad < b.minimo * 2 || n >= 8) continue
        const cant = Math.min(Math.ceil(a.minimo), Math.floor(b.cantidad - b.minimo))
        if (cant <= 0) continue
        items.push({ productoId: p.id, cantidad: cant })
        n++
      }
      if (n) {
        const ref = az.uuid()
        const llega = enART(dia, 10, 10)
        for (const it of items) {
          mover(cc.id, it.productoId, -it.cantidad, "transferencia_salida", fecha, ref, "Transferencia a Sucursal Norte", deposito)
          mover(no.id, it.productoId, it.cantidad, "transferencia_entrada", llega, ref, "Transferencia desde Casa Central", deposito)
        }
        transferencias[ref] = { id: ref, orgId, desdeId: cc.id, haciaId: no.id, items, estado: "recibida", motivo: "Reposición semanal", despachadaEn: iso(fecha), llegadaEstimada: iso(llega), recibidaEn: iso(llega), usuarioId: deposito }
        auditar(fecha, deposito, "transferencia.despachar", "stock", ref, `Transferencia CC → NO · ${n} productos`)
      }
    }

    // Ventas del día
    for (const s of sucursales) {
      const factorDia = ds === 6 ? 0.45 : ds === 1 ? 1.15 : 1
      const finDeMes = dia.d >= 26 ? 1.12 : 1
      const media = s.ventasDia * factorDia * finDeMes * (0.88 + 0.24 * progreso)
      const cantidad = poisson(az, media)
      const horas: number[] = []
      for (let k = 0; k < cantidad; k++) horas.push(ds === 6 ? az.decimal(8, 13) : az.decimal(8, 19))
      horas.sort((a, b) => a - b)
      for (const h of horas) {
        const fecha = enART(dia, Math.floor(h), Math.floor((h % 1) * 60))
        if (esHoy && fecha > ahora) continue
        registrarVenta(s, fecha, d)
      }
    }

    // Presupuestos
    for (const s of sucursales) {
      const media = s.codigo === "CC" ? 1.6 : s.codigo === "DM" ? 0.9 : 0.5
      const n = poisson(az, ds === 6 ? media * 0.4 : media)
      for (let k = 0; k < n; k++) {
        const fecha = enART(dia, az.entero(8, 18), az.entero(0, 59))
        if (esHoy && fecha > ahora) continue
        const clienteId = az.probabilidad(0.8) ? az.elegir(clientesEmpresa) : az.elegir(clientesParticulares)
        const cliente = clientes[clienteId]
        const items = armarItems(s, d, cliente.listaId, s.codigo === "DM" ? 3 : 5, false).map((it) => ({
          ...it,
          cantidad: info[it.productoId].maquina ? it.cantidad : it.cantidad * az.entero(1, 4),
        }))
        if (!items.length) continue
        const id = az.uuid()
        const num = numero("presupuesto", s.codigo)
        const edad = -d
        const destino = az.ponderado([["convertido", 36], ["vencido", 24], ["rechazado", 10], ["enviado", 18], ["aceptado", 5], ["borrador", 7]] as const)
        let estado: Presupuesto["estado"] = destino
        if (edad <= 15 && (destino === "vencido" || destino === "rechazado")) estado = "enviado"
        if (edad > 15 && (destino === "enviado" || destino === "borrador" || destino === "aceptado")) estado = "vencido"
        if (edad > 4 && destino === "borrador") estado = "vencido"
        const vendedorId = az.elegir(vendedoresPor[s.codigo])
        const p: Presupuesto = {
          id,
          orgId,
          negocioId: s.negocioId,
          sucursalId: s.id,
          numero: num,
          numeroLocal: `P${s.codigo}-L${String(num).slice(-4)}`,
          fecha: iso(fecha),
          vencimiento: iso(enART(sumarDias(dia, 15), 23, 59)),
          clienteId,
          clienteNombre: cliente.nombre,
          listaId: cliente.listaId,
          items,
          total: totalItems(items),
          estado,
          ventaId: null,
          notas: az.probabilidad(0.3) ? "Precios sujetos a disponibilidad. Entrega en obra a coordinar." : "",
          vendedorId,
          actualizadoEn: iso(fecha),
        }
        presupuestos[id] = p
        auditar(fecha, vendedorId, "presupuesto.guardar", "presupuesto", id, `Presupuesto #${num} · ${clienteNombreCorto(cliente.nombre)}`)
        if (estado === "convertido") {
          const dConv = Math.min(0, d + az.entero(1, 9))
          const fConv = enART(sumarDias(hoy, dConv), az.entero(9, 17), az.entero(0, 59))
          if (fConv > ahora) {
            p.estado = "aceptado"
          } else {
            const v = registrarVenta(s, fConv, dConv, { clienteId, items: p.items, presupuestoId: id })
            if (v) {
              p.ventaId = v.id
              p.actualizadoEn = v.fecha
              auditar(fConv, v.vendedorId, "presupuesto.convertir", "presupuesto", id, `Presupuesto #${num} → venta #${v.numero}`)
            } else p.estado = "vencido"
          }
        }
      }
    }

    // Servicio técnico (taller en Casa Central)
    if (ds !== 6) {
      const cc = sucPorCodigo("CC")
      const n = poisson(az, 1.5)
      for (let k = 0; k < n; k++) {
        const fecha = enART(dia, az.entero(9, 17), az.entero(0, 59))
        if (esHoy && fecha > ahora) continue
        const tipoCat = az.ponderado([["taladro", 22], ["amoladora", 20], ["soldadora", 14], ["compresor", 10], ["generador", 10], ["hidrolavadora", 10], ["sierra", 8], ["bomba", 6]] as const)
        const catDemo = categoriasDemo.find((c) => c.ilustracion === tipoCat) ?? categoriasDemo[0]
        const clienteId = az.probabilidad(0.5) ? az.elegir(clientesEmpresa) : az.elegir(clientesParticulares)
        const cliente = clientes[clienteId]
        const falla = az.elegir(FALLAS[tipoCat] ?? FALLAS.default)
        const id = az.uuid()
        const num = numero("servicio", "ST")
        const tecnicoId = az.elegir(tecnicos)
        const marca = az.elegir(catDemo.marcas)
        const equipoNombre = `${catDemo.plantillas[0].nombre.split(" {")[0]} ${marca}`
        const presupuestoRep = Math.round(az.decimal(15000, 185000) / 500) * 500 * 100
        const eventos: EventoServicio[] = []
        const pasos: [EstadoServicio, number][] = [
          ["diagnostico", az.entero(0, 2)],
          ["esperando_aprobacion", az.entero(1, 4)],
          ["en_reparacion", az.entero(2, 6)],
          ["listo", az.entero(2, 6)],
          ["entregado", az.entero(1, 7)],
        ]
        const sinReparacion = az.probabilidad(0.08)
        let estado: EstadoServicio = "ingresado"
        let t = d
        eventos.push({ fecha: iso(fecha), estado: "ingresado", nota: `Ingresa con falla: ${falla.falla.toLowerCase()}.`, usuarioId: az.elegir(vendedoresPor.CC), aviso: null })
        for (const [paso, demora] of pasos) {
          t += demora
          if (t > 0) break
          const f = enART(sumarDias(hoy, t), az.entero(9, 18), az.entero(0, 59))
          if (f > ahora) break
          if (sinReparacion && paso === "en_reparacion") {
            estado = "sin_reparacion"
            eventos.push({ fecha: iso(f), estado, nota: "El cliente no aprobó el presupuesto.", usuarioId: tecnicoId, aviso: null })
            break
          }
          estado = paso
          const conAviso = paso === "esperando_aprobacion" || paso === "listo"
          eventos.push({
            fecha: iso(f),
            estado: paso,
            nota: paso === "diagnostico" ? "En revisión." : paso === "esperando_aprobacion" ? falla.diagnostico : paso === "en_reparacion" ? "Presupuesto aprobado por el cliente." : paso === "listo" ? "Reparado y probado." : "Retirado por el cliente.",
            usuarioId: paso === "entregado" ? az.elegir(vendedoresPor.CC) : tecnicoId,
            aviso: conAviso
              ? { canal: "whatsapp", mensaje: mensajeAvisoServicio(paso, cliente.nombre, equipoNombre, num, presupuestoRep, cc.nombre), emulado: true }
              : null,
          })
        }
        servicio[id] = {
          id,
          orgId,
          sucursalId: cc.id,
          numero: num,
          numeroLocal: `ST-L${String(num).slice(-4)}`,
          fechaIngreso: iso(fecha),
          fechaPrometida: iso(enART(sumarDias(dia, az.entero(5, 10)), 18)),
          clienteId,
          equipo: { tipo: catDemo.ilustracion, marca, modelo: `${marca.slice(0, 2).toUpperCase()}-${az.entero(100, 990)}`, serie: `SN${az.entero(1_000_000, 9_999_999)}` },
          falla: falla.falla,
          accesorios: az.elegir(ACCESORIOS),
          diagnostico: estado === "ingresado" || estado === "diagnostico" ? "" : falla.diagnostico,
          estado,
          prioridad: az.probabilidad(0.12) ? "urgente" : "normal",
          tecnicoId,
          presupuestoReparacion: estado === "ingresado" || estado === "diagnostico" ? null : presupuestoRep,
          repuestos: [],
          eventos,
          actualizadoEn: eventos[eventos.length - 1].fecha,
        }
        for (const ev of eventos.slice(1)) auditar(new Date(ev.fecha), ev.usuarioId, "servicio.estado", "servicio", id, `Orden ST #${num} → ${ev.estado}`)
      }
    }

    // Cobranzas de cuenta corriente
    for (const id of clientesEmpresa) {
      const deuda = saldo[id] ?? 0
      if (deuda > 0 && az.probabilidad(0.05)) {
        const fecha = enART(dia, az.entero(9, 18), az.entero(0, 59))
        if (esHoy && fecha > ahora) continue
        const pago = Math.min(deuda, Math.round((deuda * az.decimal(0.35, 1)) / 10000) * 10000)
        if (pago > 0) {
          cargarCuenta(id, -pago, "pago", fecha, null, `Pago ${az.elegir(["transferencia", "cheque", "efectivo"])}`)
          auditar(fecha, az.elegir(vendedoresPor.CC), "cuenta.pago", "cliente", id, `Cobro ${formatoPesos(pago)} · ${clienteNombreCorto(clientes[id].nombre)}`)
        }
      }
    }

    // Ajustes ocasionales
    if (ds === 5 && az.probabilidad(0.6) && d < 0) {
      const s = sucPorCodigo(az.elegir(["CC", "NO"]))
      const [p] = az.ponderado(pesosPorSucursal[s.id].map((x) => [x, x[1]] as const))
      if (stock[claveStock(s.id, p.id)].cantidad < 1) continue
      const motivo = az.elegir(["Rotura en depósito", "Faltante detectado", "Uso interno taller", "Devolución a proveedor por falla"])
      mover(s.id, p.id, -1, "ajuste", enART(dia, 17, 30), null, motivo, deposito)
      auditar(enART(dia, 17, 30), deposito, "stock.ajustar", "producto", p.id, `Ajuste −1 ${p.sku} · ${motivo}`)
    }
  }

  // Órdenes de compra recientes que todavía no llegaron + un borrador
  const bajos = listaProductos.filter((p) => {
    const st = stock[claveStock(sucPorCodigo("CC").id, p.id)]
    return st && st.cantidad <= st.minimo
  })
  if (bajos.length) {
    const id = az.uuid()
    const num = numero("compra", "OC")
    const items = bajos.slice(0, 6).map((p) => ({ productoId: p.id, cantidad: Math.max(5, Math.ceil(stock[claveStock(sucPorCodigo("CC").id, p.id)].minimo * 2)), costoUnitario: p.costo, recibido: 0 }))
    comprasOC[id] = {
      id,
      orgId,
      sucursalId: sucPorCodigo("CC").id,
      proveedorId: productos[items[0].productoId].proveedorId,
      numero: null,
      numeroLocal: `OC-B${num}`,
      fecha: iso(enART(hoy, 8, 45)),
      estado: "borrador",
      items,
      total: items.reduce((t, it) => t + it.cantidad * it.costoUnitario, 0),
      notas: "Sugerida por stock mínimo",
      actualizadoEn: iso(enART(hoy, 8, 45)),
    }
  }

  // ───────── Conteos ─────────
  const conteos: Record<Id, Conteo> = {}
  const cc = sucPorCodigo("CC")
  const no = sucPorCodigo("NO")
  for (const [i, dRel, codigoCat] of [[0, -92, "HM"], [1, -61, "SE"], [2, -29, "EL"], [3, -8, "LU"]] as const) {
    if (-dRel > DIAS) continue
    const catId = catPorCodigo(codigoCat)
    const fecha = enART(sumarDias(hoy, dRel), 18, 10)
    const items = listaProductos
      .filter((p) => p.categoriaId === catId && stock[claveStock(cc.id, p.id)])
      .map((p) => {
        const esperado = stock[claveStock(cc.id, p.id)].cantidad
        const contado = i === 3 ? esperado : az.probabilidad(0.12) ? Math.max(0, esperado + az.elegir([-2, -1, -1, 1])) : esperado
        return { productoId: p.id, esperado, contado }
      })
    const id = uuidDe(`${semilla}:conteo:${i}`)
    conteos[id] = { id, orgId, sucursalId: cc.id, fecha: iso(fecha), nombre: `Conteo ${categorias.find((c) => c.id === catId)?.nombre}`, estado: "cerrado", items, usuarioId: deposito, cerradoEn: iso(fecha) }
    for (const it of items) if (it.contado !== it.esperado) mover(cc.id, it.productoId, (it.contado ?? 0) - it.esperado, "conteo", fecha, id, "Diferencia de conteo", deposito)
    auditar(fecha, deposito, "conteo.cerrar", "conteo", id, `${conteos[id].nombre} · ${items.filter((x) => x.contado !== x.esperado).length} diferencias`)
  }
  {
    const catId = catPorCodigo("AD")
    const items = listaProductos
      .filter((p) => p.categoriaId === catId && stock[claveStock(no.id, p.id)])
      .map((p, k) => ({ productoId: p.id, esperado: stock[claveStock(no.id, p.id)].cantidad, contado: k % 2 === 0 ? stock[claveStock(no.id, p.id)].cantidad : null }))
    const id = uuidDe(`${semilla}:conteo:abierto`)
    conteos[id] = { id, orgId, sucursalId: no.id, fecha: iso(enART(hoy, 8, 15)), nombre: "Conteo Abrasivos y discos", estado: "en_curso", items, usuarioId: deposito, cerradoEn: null }
  }

  // ───────── Cajas: últimos 7 días cerradas, hoy abiertas ─────────
  const cajas: EstadoEmpresa["cajas"] = {}
  const movimientosCaja: EstadoEmpresa["movimientosCaja"] = []
  const efectivoEn = (sucursalId: Id, puesto: number, desde: Date, hasta: Date) =>
    Object.values(ventas)
      .filter((v) => v.sucursalId === sucursalId && v.puesto === puesto && v.estado === "confirmada" && v.fecha >= iso(desde) && v.fecha <= iso(hasta))
      .reduce((t, v) => t + v.pagos.filter((p) => p.medio === "efectivo").reduce((s, p) => s + p.importe, 0), 0)
  for (let d = -7; d <= 0; d++) {
    const dia = sumarDias(hoy, d)
    if (diaSemana(dia) === 0) continue
    for (const s of sucursales) {
      for (let puesto = 1; puesto <= s.puestos; puesto++) {
        const apertura = enART(dia, 7, 55)
        if (apertura > ahora) continue
        const cierre = enART(dia, diaSemana(dia) === 6 ? 13 : 19, 10)
        const abierta = d === 0
        const id = uuidDe(`${semilla}:caja:${claveDia(dia)}:${s.codigo}:${puesto}`)
        const usuarioId = vendedoresPor[s.codigo][(puesto - 1) % vendedoresPor[s.codigo].length]
        const inicial = 50_000_00
        const retiro = !abierta && az.probabilidad(0.4) ? 200_000_00 : 0
        if (retiro) movimientosCaja.push({ id: az.uuid(), orgId, sesionId: id, fecha: iso(enART(dia, 14, 0)), tipo: "retiro", importe: retiro, motivo: "Retiro a caja fuerte", usuarioId })
        const esperado = inicial + efectivoEn(s.id, puesto, apertura, abierta ? ahora : cierre) - retiro
        const diferencia = abierta ? 0 : az.ponderado([[0, 80], [-500_00, 8], [1_000_00, 6], [-2_000_00, 6]] as const)
        cajas[id] = {
          id,
          orgId,
          sucursalId: s.id,
          puesto,
          abiertaPor: usuarioId,
          apertura: iso(apertura),
          montoInicial: inicial,
          cerradaPor: abierta ? null : usuarioId,
          cierre: abierta ? null : iso(cierre),
          montoContado: abierta ? null : esperado + diferencia,
          esperado: abierta ? null : esperado,
          estado: abierta ? "abierta" : "cerrada",
        }
        if (!abierta) auditar(cierre, usuarioId, "caja.cerrar", "caja", id, `Cierre ${s.codigo} puesto ${puesto} · diferencia ${formatoPesos(diferencia)}`)
      }
    }
  }

  // Orden de reparto de entregas pendientes
  const pendientes = Object.values(entregas).filter((e) => e.estado === "pendiente").sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada))
  pendientes.forEach((e, i) => {
    e.orden = i + 1
    if (i === 0 && new Date(e.fechaProgramada) <= ahora) e.estado = "en_camino"
  })

  // Transferencias en tránsito ahora (solo en horario comercial): el stock ya salió del origen
  const horaHoy = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).format(ahora))
  if (horaHoy >= 9 && horaHoy < 18) {
    const rutas: [string, string, number, number][] = [
      ["CC", "NO", 55, 70],
      ["DM", "CC", 25, 95],
    ]
    for (const [i, [desde, hacia, haceMin, faltaMin]] of rutas.entries()) {
      const o = sucPorCodigo(desde)
      const dst = sucPorCodigo(hacia)
      const items = listaProductos
        .filter((p) => (stock[claveStock(o.id, p.id)]?.cantidad ?? 0) > (stock[claveStock(o.id, p.id)]?.minimo ?? 0) + 4)
        .slice(i * 5, i * 5 + 3 + i)
        .map((p) => ({ productoId: p.id, cantidad: 2 + ((i + p.sku.length) % 4) }))
      if (!items.length) continue
      const id = uuidDe(`${semilla}:${claveDia(hoy)}:transito:${i}`)
      const salida = new Date(ahora.getTime() - haceMin * 60_000)
      for (const it of items) mover(o.id, it.productoId, -it.cantidad, "transferencia_salida", salida, id, `Transferencia a ${dst.nombre}`, deposito)
      transferencias[id] = { id, orgId, desdeId: o.id, haciaId: dst.id, items, estado: "en_transito", motivo: "Reposición", despachadaEn: iso(salida), llegadaEstimada: iso(new Date(ahora.getTime() + faltaMin * 60_000)), recibidaEn: null, usuarioId: deposito }
      auditar(salida, deposito, "transferencia.despachar", "stock", id, `Transferencia ${o.codigo} → ${dst.codigo} · ${items.length} productos (en tránsito)`)
    }
  }

  // Aumentos en auditoría
  for (const a of aumentos) auditar(new Date(a.fecha), a.usuarioId, "precios.aumento", "precios", a.id, `${a.descripcion} · +${a.porcentaje}% · ${a.cambios.length} precios`)
  auditoria.sort((a, b) => b.fecha.localeCompare(a.fecha))
  movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha))
  movimientosCuenta.sort((a, b) => a.fecha.localeCompare(b.fecha))

  return {
    org,
    negocios,
    sucursales: sucursales.map((s) => ({ id: s.id, orgId: s.orgId, negocioId: s.negocioId, nombre: s.nombre, codigo: s.codigo, direccion: s.direccion, puestos: s.puestos, tipo: s.tipo, lat: s.lat, lng: s.lng, demo: s.demo })),
    usuarios,
    categorias,
    marcas,
    proveedores,
    listas,
    productos,
    precios,
    stock,
    movimientos,
    clientes,
    movimientosCuenta,
    ventas,
    presupuestos,
    servicio,
    compras: comprasOC,
    entregas,
    transferencias,
    cajas,
    movimientosCaja,
    conteos,
    aumentos,
    auditoria,
    numeradores,
  }
}

// ───────── utilidades ─────────

function rotar<T>(lista: T[], n: number) {
  const k = n % lista.length
  return [...lista.slice(k), ...lista.slice(0, k)]
}

function redondearA(valor: number, paso: number) {
  return Math.max(paso, Math.round(valor / paso) * paso)
}

/** Precios de lista: múltiplos de $10 (o $1 si es muy barato). Recibe y devuelve centavos. */
export function redondearPrecio(centavos: number) {
  const paso = centavos >= 100_000 ? 1000 : 100
  return Math.max(paso, Math.round(centavos / paso) * paso)
}

function poisson(az: Azar, media: number) {
  const l = Math.exp(-media)
  let k = 0
  let p = 1
  do {
    k++
    p *= az.siguiente()
  } while (p > l && k < 200)
  return k - 1
}

/** EAN-13 con dígito verificador. Prefijo 2x: códigos de circulación interna (no colisionan con productos reales). */
export function ean13(doce: string) {
  const d = doce.slice(0, 12).padEnd(12, "0")
  const suma = [...d].reduce((s, c, i) => s + Number(c) * (i % 2 === 0 ? 1 : 3), 0)
  return d + ((10 - (suma % 10)) % 10)
}

/** CUIT ficticio con dígito verificador válido. */
export function cuit(az: Azar, prefijo: string) {
  for (;;) {
    const cuerpo = `${prefijo}${az.entero(10_000_000, 79_999_999)}`
    const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    const suma = [...cuerpo].reduce((s, c, i) => s + Number(c) * pesos[i], 0)
    const v = 11 - (suma % 11)
    if (v === 10) continue
    const dv = v === 11 ? 0 : v
    return `${cuerpo.slice(0, 2)}-${cuerpo.slice(2)}-${dv}`
  }
}

/** Teléfono con formato argentino pero numeración inexistente (abonado que empieza en 0). */
function telefonoFicticio(az: Azar) {
  return `+54 9 11 0${az.entero(100, 999)}-${az.entero(1000, 9999)}`
}

function clienteNombreCorto(n: string) {
  return n.length > 28 ? `${n.slice(0, 26)}…` : n
}
