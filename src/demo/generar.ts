/**
 * Generadores de las empresas de la demo (kiosco, distribuidora y grupo). La ferretería sale del seed de la
 * app, exportado a src/demo/ferreteria-snapshot.json (scripts/generar-snapshot-ferreteria.ts).
 * Todo sale de la semilla de cada empresa y de la fecha ancla: siempre es igual.
 */
import type { DatosNegocio, DiaVentas, ProductoNegocio, SucursalNegocio, ClienteNegocio, VentaReciente, MedioPago } from "@/dominio/negocio"
import { fraccionDelDia, suma } from "@/dominio/negocio"
import { aleatorio, elegir, entero, entre, hash, normal, redondearPrecio, u01, type Azar } from "./azar"
import {
  APELLIDOS,
  CATEGORIAS_EXTRA_DISTRIBUIDORA,
  CATEGORIAS_KIOSCO,
  FAVORITOS_KIOSCO,
  LINEAS_MAYORISTA,
  NOMBRES_COMERCIO,
  NOMBRES_PERSONAS,
  PREVENTISTAS,
  PRESENTACIONES_MAYORISTA,
  PROVEEDORES_GRUPO,
  PROVEEDORES_KIOSCO,
  RUBROS_GRUPO,
  SUCURSALES_GRUPO,
  TIPOS_COMERCIO,
  VECINOS,
  ZONAS_DISTRIBUIDORA,
  type Categoria,
} from "./catalogos"
import { ANCLA_DEMO, ANCLA_DEMO_ISO, EMPRESAS, type IdEmpresa } from "./empresas"

const DIAS = 90
const HORA_ANCLA = ANCLA_DEMO.hora + ANCLA_DEMO.minuto / 60
const c = (pesos: number) => Math.round(pesos * 100)

// ───────────────────────── Fechas ─────────────────────────

const [Y, M, D] = ANCLA_DEMO.dia.split("-").map(Number)
const ANCLA_UTC = Date.UTC(Y, M - 1, D)
/** "AAAA-MM-DD" del día `n` antes de la ancla (0 = hoy). */
export function fechaHaciaAtras(n: number) {
  return new Date(ANCLA_UTC - n * 86400000).toISOString().slice(0, 10)
}
function diaSemana(fecha: string) {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay()
}
function diaDelMes(fecha: string) {
  return Number(fecha.slice(8, 10))
}
/** ISO de un momento de hoy (hora argentina). */
export function hoyA(hora: number, minuto = 0) {
  const h = String(Math.floor(hora)).padStart(2, "0")
  const m = String(Math.floor(minuto)).padStart(2, "0")
  return `${ANCLA_DEMO.dia}T${h}:${m}:00-03:00`
}
export const ANCLA_MS = Date.parse(ANCLA_DEMO_ISO)

// ───────────────────────── Curvas de demanda por hora ─────────────────────────

export const CURVAS: Record<"kiosco" | "distribuidora" | "grupo", readonly number[]> = {
  kiosco: [0, 0, 0, 0, 0, 0, 0, 0.4, 0.8, 0.9, 1, 1.2, 1.5, 1.4, 1, 0.9, 1, 1.3, 1.6, 1.7, 1.5, 1.1, 0.7, 0.3],
  distribuidora: [0, 0, 0, 0, 0, 0, 0, 0, 1.2, 1.5, 1.6, 1.4, 0.9, 0.7, 1.1, 1.3, 1.2, 0.8, 0.3, 0, 0, 0, 0, 0],
  grupo: [0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.9, 1.1, 1.2, 1.1, 1, 1, 1.1, 1.2, 1.3, 1.2, 0.9, 0.4, 0, 0, 0],
}

function porHora(curva: readonly number[], totalHoy: number) {
  const hasta = fraccionDelDia(curva, HORA_ANCLA) || 1
  return curva.map((_, h) => {
    const desde = fraccionDelDia(curva, h)
    const fin = fraccionDelDia(curva, Math.min(HORA_ANCLA, h + 1))
    return h < HORA_ANCLA ? Math.round(((fin - desde) / hasta) * totalHoy) : 0
  })
}

// ───────────────────────── Catálogos ─────────────────────────

/** EAN-13 con su dígito verificador, en el rango interno 200–299 de GS1 (no choca con productos reales). */
export function ean13(semilla: string, n: number) {
  const base = `2${String(hash(semilla, "ean", n) % 1e11).padStart(11, "0")}`
  const total = [...base].reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0)
  return base + ((10 - (total % 10)) % 10)
}

type Dimension = readonly (readonly [sufijo: string, factor: number])[]

function expandir(categorias: readonly Categoria[], semilla: string, prefijo: string, ...dimensiones: Dimension[]) {
  const r = aleatorio(`${semilla}:catalogo`)
  const productos: ProductoNegocio[] = []
  let n = 0
  const combinar = (dims: Dimension[]): (readonly [string, number])[] =>
    dims.length === 0 ? [["", 1]] : dims[0].flatMap(([s, f]) => combinar(dims.slice(1)).map(([s2, f2]) => [s + s2, f * f2] as const))
  const extras = combinar(dimensiones)
  for (const cat of categorias) {
    for (const [base, precio, unidad] of cat.plantillas) {
      for (const [sufijo, factor] of cat.variantes) {
        for (const [pres, fpres] of extras) {
          n++
          const p = redondearPrecio(precio * factor * fpres * entre(r, 0.94, 1.08))
          productos.push({
            id: `${prefijo}-${n}`,
            sku: `${cat.nombre.slice(0, 2).toUpperCase()}-${String(n).padStart(4, "0")}`,
            codigo: ean13(semilla, n),
            nombre: `${base}${sufijo}${pres}`,
            categoria: cat.nombre,
            precio: c(p),
            costo: c(p * entre(r, 0.62, 0.74)),
            stock: 0,
            minimo: 0,
            unidad: unidad ?? "u",
            proveedor: "",
          })
        }
      }
    }
  }
  return productos
}

function asignarStock(productos: ProductoNegocio[], r: Azar, { criticos, escala }: { criticos: number; escala: number }) {
  productos.forEach((p, i) => {
    const minimo = Math.max(2, Math.round(entre(r, 3, 14) * escala))
    const critico = r() < criticos
    p.minimo = minimo
    p.stock = critico ? (r() < 0.35 ? 0 : entero(r, 1, minimo)) : Math.round(minimo * entre(r, 1.4, 4.5))
    if (i % 97 === 0) p.stock = 0
  })
}

function persona(r: Azar) {
  return `${elegir(r, NOMBRES_PERSONAS)} ${elegir(r, APELLIDOS)}`
}

function telefono(r: Azar) {
  return `11 ${entero(r, 3000, 6999)}-${entero(r, 1000, 9999)}`
}

// ───────────────────────── Series de ventas ─────────────────────────

type ModeloVentas = { base: number; semana: readonly number[]; mes?: (dia: number) => number; ruido: number; tendencia: number; ticket: number; margen: number; curva: readonly number[] }

function serie(semilla: string, sucursales: SucursalNegocio[], modelo: ModeloVentas): DiaVentas[] {
  const dias: DiaVentas[] = []
  for (let n = DIAS - 1; n >= 0; n--) {
    const fecha = fechaHaciaAtras(n)
    const f = modelo.semana[diaSemana(fecha)] * (modelo.mes?.(diaDelMes(fecha)) ?? 1) * (1 - n * modelo.tendencia)
    const parcial = n === 0 ? fraccionDelDia(modelo.curva, HORA_ANCLA) : 1
    const porSucursal = sucursales.map((s, i) => {
      if (s.tipo === "deposito" && sucursales.length > 1) return 0
      const ruido = 1 + normal(aleatorio(hash(semilla, fecha, i))) * modelo.ruido
      return Math.max(0, Math.round(c(modelo.base * s.tamano * f * ruido * parcial)))
    })
    const tickets = porSucursal.map((t) => Math.round(t / c(modelo.ticket * entre(aleatorio(hash(semilla, fecha, "t")), 0.9, 1.1))))
    dias.push({ fecha, porSucursal, tickets, costo: Math.round(suma(porSucursal) * (1 - modelo.margen)) })
  }
  return dias
}

function recientes(semilla: string, cantidad: number, opciones: { sucursales: number; ticket: number; medios: readonly MedioPago[]; detalle: (r: Azar) => string; ritmoMin: number }): VentaReciente[] {
  const r = aleatorio(`${semilla}:recientes`)
  let t = ANCLA_MS
  return Array.from({ length: cantidad }, (_, i) => {
    t -= Math.round(entre(r, 0.3, 1.7) * opciones.ritmoMin * 60000)
    return {
      id: `r-${i}`,
      t: new Date(t).toISOString(),
      sucursal: entero(r, 0, opciones.sucursales - 1),
      monto: c(redondearPrecio(opciones.ticket * entre(r, 0.25, 2.4))),
      items: entero(r, 1, 6),
      medio: elegir(r, opciones.medios),
      detalle: opciones.detalle(r),
    }
  })
}

function top(productos: ProductoNegocio[], semilla: string, cantidad: number, escala: number) {
  const r = aleatorio(`${semilla}:top`)
  return [...productos]
    .map((p) => ({ p, peso: r() * (p.favorito ? 3 : 1) }))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, cantidad)
    .map(({ p }, i) => {
      const unidades = Math.round((cantidad - i) * entre(r, 8, 14) * escala)
      return { productoId: p.id, unidades, importe: unidades * p.precio }
    })
}

function criticos(productos: ProductoNegocio[], sucursal = 0) {
  return productos.filter((p) => p.stock <= p.minimo).map((p) => ({ productoId: p.id, sucursal, stock: p.stock, minimo: p.minimo }))
}

// ───────────────────────── Kiosco ─────────────────────────

function generarKiosco(): DatosNegocio {
  const cfg = EMPRESAS.kiosco
  const r = aleatorio(cfg.semilla)
  const productos = expandir(CATEGORIAS_KIOSCO, cfg.semilla, "k")
  asignarStock(productos, r, { criticos: 0.07, escala: 1 })
  for (const p of productos) {
    p.proveedor = PROVEEDORES_KIOSCO.find((pr) => (pr.categorias as readonly string[]).includes(p.categoria))?.id ?? "p-almacen"
    p.favorito = (FAVORITOS_KIOSCO as readonly string[]).includes(p.nombre)
  }
  const sucursales: SucursalNegocio[] = [{ id: "k-s1", codigo: "LE", nombre: "La Esquina", ciudad: "Ciudad de Buenos Aires", provincia: "Ciudad de Buenos Aires", lat: -34.6037, lng: -58.3816, tipo: "sucursal", puestos: 1, tamano: 1 }]
  const dias = serie(cfg.semilla, sucursales, { base: 540000, semana: [0.75, 0.9, 0.92, 0.95, 1, 1.25, 1.15], ruido: 0.08, tendencia: 0.0012, ticket: 3100, margen: 0.32, curva: CURVAS.kiosco })
  const hoy = dias[dias.length - 1].porSucursal[0]
  const clientes: ClienteNegocio[] = VECINOS.map((nombre, i) => {
    const debe = i < 13
    const saldo = debe ? c(redondearPrecio(entre(r, 1750, 18400))) : 0
    return { id: `v-${i}`, nombre, zona: "Barrio", saldo, limite: c(30000), diasDeuda: debe ? entero(r, 1, 38) : 0, telefono: telefono(r), lista: "Mostrador" }
  })
  const pedidoSugerido = productos
    .filter((p) => p.stock <= p.minimo)
    .map((p) => ({ proveedorId: p.proveedor, productoId: p.id, cantidad: Math.max(p.minimo * 2 - p.stock, 6) }))
  const fondo = c(20000)
  return {
    empresaId: "kiosco",
    ahora: ANCLA_DEMO_ISO,
    sucursales,
    productos,
    clientes,
    dias,
    hoyPorHora: porHora(CURVAS.kiosco, hoy),
    top: top(productos, cfg.semilla, 10, 1),
    recientes: recientes(cfg.semilla, 14, { sucursales: 1, ticket: 3100, medios: ["efectivo", "efectivo", "efectivo", "transferencia", "qr", "tarjeta"], ritmoMin: 4, detalle: (rr) => elegir(rr, productos).nombre }),
    stockCritico: criticos(productos),
    extras: {
      tipo: "kiosco",
      caja: { apertura: hoyA(7), fondoInicial: fondo, efectivo: Math.round(hoy * 0.55), tarjeta: Math.round(hoy * 0.15), transferencia: Math.round(hoy * 0.2), qr: hoy - Math.round(hoy * 0.55) - Math.round(hoy * 0.15) - Math.round(hoy * 0.2), ventas: dias[dias.length - 1].tickets[0] },
      proveedores: PROVEEDORES_KIOSCO.map((p) => ({ id: p.id, nombre: p.nombre, rubro: p.rubro, visita: p.visita })),
      pedidoSugerido,
      ultimoAumento: { proveedor: "Bebidas del Sur (distribuidor)", porcentaje: 4.5, productos: productos.filter((p) => p.categoria === "Bebidas").length, hace: "hace 3 días" },
    },
  }
}

// ───────────────────────── Distribuidora ─────────────────────────

function generarDistribuidora(): DatosNegocio {
  const cfg = EMPRESAS.distribuidora
  const r = aleatorio(cfg.semilla)
  const categorias = [...CATEGORIAS_KIOSCO.filter((x) => x.nombre !== "Varios"), ...CATEGORIAS_EXTRA_DISTRIBUIDORA]
  const productos = expandir(categorias, cfg.semilla, "d", PRESENTACIONES_MAYORISTA, LINEAS_MAYORISTA).slice(0, 1800)
  asignarStock(productos, r, { criticos: 0.05, escala: 8 })
  productos.forEach((p) => (p.proveedor = `Fábrica ${elegir(r, ["del Litoral", "Andina", "Pampeana", "del Centro", "Cuyana"])}`))
  const sucursales: SucursalNegocio[] = [{ id: "d-dep", codigo: "DEP", nombre: "Depósito Rosario", ciudad: "Rosario", provincia: "Santa Fe", lat: -32.947, lng: -60.639, tipo: "deposito", puestos: 0, tamano: 1 }]
  const dias = serie(cfg.semilla, [{ ...sucursales[0], tipo: "sucursal" }], {
    base: 34000000,
    semana: [0, 1.1, 1, 1, 1.05, 1.1, 0.35],
    mes: (d) => (d >= 27 ? 1.35 : d <= 3 ? 1.2 : 1),
    ruido: 0.1,
    tendencia: 0.001,
    ticket: 410000,
    margen: 0.18,
    curva: CURVAS.distribuidora,
  })
  const hoy = dias[dias.length - 1].porSucursal[0]
  const listas = [
    { id: "l-a", nombre: "Lista A · mayorista", ajuste: 0, clientes: 0 },
    { id: "l-b", nombre: "Lista B · minorista", ajuste: 4, clientes: 0 },
    { id: "l-c", nombre: "Lista C · cuenta chica", ajuste: 8, clientes: 0 },
    { id: "l-i", nombre: "Lista Interior", ajuste: 6, clientes: 0 },
  ]
  const clientes: ClienteNegocio[] = Array.from({ length: 400 }, (_, i) => {
    const zona = ZONAS_DISTRIBUIDORA[i % ZONAS_DISTRIBUIDORA.length]
    const lista = listas[i % 7 === 0 ? 3 : i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0]
    lista.clientes++
    const debe = r() < 0.6
    const saldo = debe ? c(redondearPrecio(entre(r, 60000, 1400000))) : 0
    return {
      id: `c-${i}`,
      nombre: `${elegir(r, TIPOS_COMERCIO)} ${elegir(r, NOMBRES_COMERCIO)}${i >= NOMBRES_COMERCIO.length * 3 ? ` ${i}` : ""}`,
      zona,
      saldo,
      limite: c(redondearPrecio(entre(r, 800000, 2500000))),
      diasDeuda: debe ? entero(r, 2, 75) : 0,
      telefono: `341 ${entero(r, 400, 699)}-${entero(r, 1000, 9999)}`,
      lista: lista.nombre,
    }
  })
  const objetivoTotal = c(34000000 * 1.3)
  const preventistas = PREVENTISTAS.map((nombre, i) => {
    const peso = entre(r, 0.75, 1.25)
    return { id: `pv-${i}`, nombre, zona: ZONAS_DISTRIBUIDORA[i], objetivoDia: Math.round((objetivoTotal / 12) * peso), pedidosHoy: 0, montoHoy: 0, clientes: clientes.filter((cl) => cl.zona === ZONAS_DISTRIBUIDORA[i]).length }
  })
  // Los pedidos de hoy, desde las 8 hasta la hora ancla, repartidos entre los preventistas.
  const pedidosHoy: Extract<DatosNegocio["extras"], { tipo: "distribuidora" }>["pedidosHoy"] = []
  let restante = hoy
  let n = 0
  while (restante > c(50000)) {
    n++
    const hora = 8 + (HORA_ANCLA - 8) * Math.pow(u01(cfg.semilla, "ped", n), 0.9)
    const preventista = entero(r, 0, 11)
    const zonaClientes = clientes.filter((cl) => cl.zona === ZONAS_DISTRIBUIDORA[preventista])
    const monto = Math.min(restante, c(redondearPrecio(410000 * entre(r, 0.4, 1.8))))
    restante -= monto
    pedidosHoy.push({ id: `pd-${n}`, numero: `PV-${String(18240 + n).padStart(6, "0")}`, t: hoyA(hora, (hora % 1) * 60), preventista, clienteId: elegir(r, zonaClientes).id, monto, items: entero(r, 6, 38), estado: hora > HORA_ANCLA - 1.5 ? "nuevo" : "armado" })
    preventistas[preventista].pedidosHoy++
    preventistas[preventista].montoHoy += monto
  }
  pedidosHoy.sort((a, b) => b.t.localeCompare(a.t))
  // El reparto de hoy entrega lo que se vendió ayer: 4 camiones con sus paradas alrededor del depósito.
  const reparto = ["Hugo Ferreyra", "Damián Ortiz", "Claudio Maldonado", "Ramiro Benítez"].map((chofer, k) => {
    const angulo0 = (k / 4) * Math.PI * 2
    const paradas = Array.from({ length: entero(r, 12, 16) }, (_, j) => {
      const a = angulo0 + (j / 16) * (Math.PI / 2) + entre(r, -0.1, 0.1)
      const radio = 0.12 + (j / 16) * 0.33 + entre(r, -0.03, 0.03)
      return { clienteId: elegir(r, clientes).id, x: 0.5 + Math.cos(a) * radio, y: 0.5 + Math.sin(a) * radio * 0.8, monto: c(redondearPrecio(entre(r, 120000, 900000))), estado: "pendiente" as "entregado" | "en-camino" | "pendiente" }
    })
    const hechas = Math.floor(paradas.length * entre(r, 0.55, 0.78))
    paradas.forEach((p, j) => (p.estado = j < hechas ? "entregado" : j === hechas ? "en-camino" : "pendiente"))
    return { id: `cam-${k + 1}`, chofer, patente: `AF ${entero(r, 100, 999)} ${String.fromCharCode(65 + k)}${String.fromCharCode(70 + k)}`, paradas }
  })
  return {
    empresaId: "distribuidora",
    ahora: ANCLA_DEMO_ISO,
    sucursales,
    productos,
    clientes,
    dias,
    hoyPorHora: porHora(CURVAS.distribuidora, hoy),
    top: top(productos, cfg.semilla, 10, 9),
    recientes: [],
    stockCritico: criticos(productos),
    extras: { tipo: "distribuidora", preventistas, pedidosHoy, reparto, listas, cobradoHoy: c(redondearPrecio(9200000 * entre(r, 0.9, 1.1))) },
  }
}

// ───────────────────────── Grupo ─────────────────────────

const LINEAS_GRUPO = [["Línea Base", 0.82], ["Línea Plus", 1], ["Línea Pro", 1.32], ["Línea Obra", 0.92]] as const

/** El catálogo completo del grupo (≈ 25.000): se arma cuando se elige el grupo, en unos milisegundos. */
export function catalogoGrupo(): ProductoNegocio[] {
  const semilla = EMPRESAS.grupo.semilla
  const productos: ProductoNegocio[] = []
  RUBROS_GRUPO.forEach(([categoria, tipos, aes, bes, base], ir) => {
    tipos.forEach((tipo, it) =>
      aes.forEach((a, ia) =>
        bes.forEach((b, ib) =>
          LINEAS_GRUPO.forEach(([linea, fl]) => {
            const n = productos.length
            const f = (1 + ia * 0.18) * (1 + ib * 0.04) * fl * (0.85 + u01(semilla, n) * 0.3) * (0.6 + it * 0.09)
            const precio = c(redondearPrecio(base * f))
            productos.push({
              id: `g-${n}`,
              sku: `${categoria.slice(0, 3).toUpperCase()}-${String(ir).padStart(2, "0")}${String(n).padStart(5, "0")}`,
              codigo: ean13(`${semilla}:g`, n),
              nombre: `${tipo} ${a} ${b} · ${linea}`,
              categoria,
              precio,
              costo: Math.round(precio * (0.6 + u01(semilla, "costo", n) * 0.1)),
              stock: 0,
              minimo: 4 + (hash(semilla, "min", n) % 10),
              unidad: "u",
              proveedor: PROVEEDORES_GRUPO[ir % PROVEEDORES_GRUPO.length],
            })
          }),
        ),
      ),
    )
  })
  return productos
}

/** Stock de un producto en una sucursal del grupo, calculado a pedido (no se guarda ninguna tabla). */
export function stockGrupo(productoIdx: number, sucursalIdx: number) {
  const h = hash(EMPRESAS.grupo.semilla, "stock", productoIdx, sucursalIdx)
  if (h % 23 === 0) return 0
  return (h >>> 8) % (6 + (productoIdx % 40))
}

function generarGrupo(): DatosNegocio {
  const cfg = EMPRESAS.grupo
  const r = aleatorio(cfg.semilla)
  const sucursales: SucursalNegocio[] = SUCURSALES_GRUPO.map(([ciudad, provincia, lat, lng, tamano], i) => ({
    id: `g-s${i + 1}`,
    codigo: String(i + 1).padStart(2, "0"),
    nombre: ciudad,
    ciudad,
    provincia,
    lat,
    lng,
    tipo: "sucursal",
    puestos: Math.round(4 + tamano * 5),
    tamano,
  }))
  const dias = serie(cfg.semilla, sucursales, { base: 14000000, semana: [0.7, 0.85, 0.9, 0.95, 1, 1.1, 1.3], ruido: 0.12, tendencia: 0.0011, ticket: 46000, margen: 0.34, curva: CURVAS.grupo })
  const hoy = dias[dias.length - 1]
  const productos = catalogoGrupo()
  const muestra = productos.filter((_, i) => i % 61 === 0)
  muestra.forEach((p) => {
    const idx = Number(p.id.slice(2))
    p.stock = sucursales.reduce((acc, _, s) => acc + stockGrupo(idx, s), 0)
  })
  const provincias = [...new Set(sucursales.map((s) => s.provincia))]
  const objetivoDia = sucursales.map((s) => c(14000000 * s.tamano * 1.1))
  const solicitantes = ["Encargado", "Encargada", "Compras regional"]
  const aprobaciones = Array.from({ length: 9 }, (_, i) => {
    const sucursal = entero(r, 0, 39)
    const monto = c(redondearPrecio(entre(r, 1800000, 16500000)))
    const [categoria] = RUBROS_GRUPO[entero(r, 0, RUBROS_GRUPO.length - 1)]
    return {
      id: `ap-${i}`,
      numero: `OC-${String(70412 + i * 7).padStart(6, "0")}`,
      sucursal,
      proveedor: elegir(r, PROVEEDORES_GRUPO),
      detalle: `Reposición de ${categoria.toLowerCase()} · ${entero(r, 12, 140)} productos`,
      monto,
      nivel: (monto > c(8000000) ? 2 : 1) as 1 | 2,
      solicita: `${persona(r)} · ${elegir(r, solicitantes)}`,
      t: new Date(ANCLA_MS - entero(r, 8, 400) * 60000).toISOString(),
    }
  }).sort((a, b) => b.t.localeCompare(a.t))
  // Cada acción la hace un rol que puede hacerla, con un detalle variado (no la misma frase repetida).
  const miles = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, "0")}` : String(n))
  const ACCIONES: { accion: string; roles: string[]; detalle: () => string }[] = [
    { accion: "Cambió precios", roles: ["Dirección", "Gerencia regional"], detalle: () => `Aumento de ${entero(r, 2, 6)},${entero(r, 0, 9)} % en ${elegir(r, RUBROS_GRUPO)[0]} · ${miles(entero(r, 180, 2400))} productos` },
    { accion: "Aprobó una compra", roles: ["Gerencia regional", "Dirección"], detalle: () => `OC-${String(entero(r, 70300, 70400)).padStart(6, "0")} · ${elegir(r, PROVEEDORES_GRUPO)}` },
    { accion: "Anuló una venta", roles: ["Encargado de sucursal"], detalle: () => `Ticket ${entero(r, 1, 6)}-${String(entero(r, 100, 990)).padStart(5, "0")} · ${elegir(r, ["error de cobro", "el cliente se arrepintió", "precio mal cargado"])}` },
    { accion: "Cambió permisos", roles: ["Dirección", "Administración"], detalle: () => elegir(r, ["Encargado de sucursal · puede ver costos: no", "Caja · puede anular ventas: no", "Depósito · puede ajustar stock: sí"]) },
    { accion: "Exportó un reporte", roles: ["Administración", "Compras", "Dirección"], detalle: () => `${elegir(r, ["Ventas por sucursal", "Margen por rubro", "Stock valorizado", "Compras del mes"])} · semana ${entero(r, 38, 41)}` },
    { accion: "Ajustó stock", roles: ["Depósito", "Encargado de sucursal"], detalle: () => { const d = entero(r, 0, 3); return `Conteo cíclico · ${entero(r, 12, 64)} productos · ${d === 0 ? "sin diferencias" : `${d} con diferencia`}` } },
    { accion: "Ingresó desde un equipo nuevo", roles: ["Dirección", "Gerencia regional", "Encargado de sucursal", "Administración"], detalle: () => "Doble factor verificado" },
    { accion: "Transfirió mercadería", roles: ["Depósito", "Encargado de sucursal"], detalle: () => `TR-${String(entero(r, 22100, 22190)).padStart(6, "0")} · ${entero(r, 8, 90)} productos` },
    { accion: "Creó un usuario", roles: ["Administración", "Encargado de sucursal"], detalle: () => elegir(r, ["Cajero · alcance: una sucursal", "Repositor · alcance: una sucursal", "Vendedora · alcance: una sucursal"]) },
  ]
  const roles = [
    { rol: "Dirección", usuarios: 4, alcance: "Todo el grupo" },
    { rol: "Gerencia regional", usuarios: 6, alcance: "Su región" },
    { rol: "Encargado de sucursal", usuarios: 40, alcance: "Su sucursal" },
    { rol: "Compras", usuarios: 14, alcance: "Todo el grupo · sin ventas" },
    { rol: "Administración", usuarios: 18, alcance: "Todo el grupo" },
    { rol: "Depósito", usuarios: 62, alcance: "Su sucursal · stock" },
    { rol: "Caja", usuarios: 168, alcance: "Su sucursal · mostrador" },
  ]
  const auditoria = Array.from({ length: 36 }, (_, i) => {
    const a = elegir(r, ACCIONES)
    const rol = elegir(r, a.roles)
    const detalle = a.detalle()
    return { id: `au-${i}`, t: new Date(ANCLA_MS - (i * 11 + entero(r, 0, 9)) * 60000).toISOString(), usuario: persona(r), rol, sucursal: ["Dirección", "Compras", "Administración"].includes(rol) ? null : entero(r, 0, 39), accion: a.accion, detalle }
  })
  return {
    empresaId: "grupo",
    ahora: ANCLA_DEMO_ISO,
    sucursales,
    productos,
    clientes: [],
    dias,
    hoyPorHora: porHora(CURVAS.grupo, suma(hoy.porSucursal)),
    top: top(muestra, cfg.semilla, 10, 40),
    recientes: [],
    stockCritico: muestra.filter((p) => p.stock <= p.minimo * 3).slice(0, 40).map((p) => ({ productoId: p.id, sucursal: entero(r, 0, 39), stock: 0, minimo: p.minimo })),
    extras: {
      tipo: "grupo",
      provincias,
      objetivoDia,
      aprobaciones,
      auditoria,
      roles,
      integraciones: [
        { nombre: "Factura electrónica (ARCA)", detalle: "Facturas A y B autorizadas desde cada caja", estado: "próximamente" },
        { nombre: "Cobro con QR", detalle: "Mercado Pago desde el mostrador", estado: "demo" },
        { nombre: "Mercado Libre", detalle: "Stock y precios de las publicaciones", estado: "próximamente" },
        { nombre: "Exportación contable", detalle: "Ventas, compras y caja por período", estado: "demo" },
      ],
      margenPorSucursal: sucursales.map((_, i) => 0.29 + u01(cfg.semilla, "margen", i) * 0.1),
      stockCriticoPorSucursal: sucursales.map((_, i) => 8 + (hash(cfg.semilla, "crit", i) % 70)),
      stockValorizado: c(redondearPrecio(entre(r, 9.8e9, 11.2e9))),
    },
  }
}

// ───────────────────────── Entrada ─────────────────────────

const cache = new Map<IdEmpresa, DatosNegocio>()

/** Los datos de una empresa generada (kiosco, distribuidora o grupo). La ferretería viene del snapshot. */
export function generarEmpresa(id: Exclude<IdEmpresa, "ferreteria">): DatosNegocio {
  const hecho = cache.get(id)
  if (hecho) return hecho
  const datos = id === "kiosco" ? generarKiosco() : id === "distribuidora" ? generarDistribuidora() : generarGrupo()
  cache.set(id, datos)
  return datos
}
