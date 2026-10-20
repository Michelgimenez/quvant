import type { Id } from "@/dominio/tipos"
import type { BancoForja, BultoForja, ProductoRack, PuestoForja, RackForja, RubroTaller, TallerForja } from "./modelo"

/**
 * Plano de planta de una sucursal (nivel 2), en metros. x crece hacia la
 * derecha, z hacia el frente. Las paredes cortadas quedan atrás (z mínima) y a
 * la izquierda (x mínima), para la cámara isométrica que mira desde el frente
 * a la derecha: lo alto (racks) va al fondo y no tapa nada. Lo usan la escena
 * 3D y el plano 2D por igual.
 */
export type TipoZona = "mostrador" | "deposito" | "servicio" | "muelle"
export const TIPOS_ZONA: TipoZona[] = ["mostrador", "deposito", "servicio", "muelle"]

export type Rect = { x: number; z: number; ancho: number; fondo: number }

export type EstadoBloque = "normal" | "critico" | "sin_stock"

export type ZonaPlano = Rect & { tipo: TipoZona; nombre: string }
export type PuestoPlano = { puesto: PuestoForja; x: number; z: number }
export type SeccionPlano = { categoria: string; nombre: string; x: number; z: number; ancho: number }
export type RackPlano = { rack: RackForja; x: number; z: number; ancho: number; fondo: number; alto: number }
/** Un producto en su estante: el bloque crece con el stock relativo. */
export type BloquePlano = { producto: ProductoRack; rackId: string; nivel: number; x: number; y: number; z: number; ancho: number; fondo: number; alto: number; estado: EstadoBloque }
/** Banco de trabajo; sin orden, es un banco libre. */
export type BancoPlano = { banco: BancoForja | null; x: number; z: number }
/** Equipos listos o sin reparación, esperando que los retiren. */
export type RetiroPlano = { banco: BancoForja; x: number; y: number; z: number }
export type PaletPlano = { bulto: BultoForja; x: number; z: number; cajas: number }
/** Un camión de reparto en su andén (la distribuidora): mira hacia el frente, con la caja contra el depósito. */
export type CamionPlano = { bulto: BultoForja; x: number; z: number; enViaje: boolean }

export type PlanoTaller = {
  rubro: RubroTaller
  ancho: number
  fondo: number
  zonas: ZonaPlano[]
  puestos: PuestoPlano[]
  mostrador: Rect | null
  secciones: SeccionPlano[]
  racks: RackPlano[]
  bloques: BloquePlano[]
  bancos: BancoPlano[]
  retiro: RetiroPlano[]
  estanteRetiro: Rect
  palets: PaletPlano[]
  camiones: CamionPlano[]
  /** Portón del muelle sobre la pared izquierda (z del centro y ancho). */
  porton: { z: number; ancho: number }
  /** Punto por donde salen las transferencias (afuera del portón). */
  salida: { x: number; z: number }
}

export const ANCHO = 26
export const FONDO = 18
export const ALTO_PARED = 3
export const NIVELES_RACK = 4
export const ALTO_NIVEL = 0.5
const BASE_RACK = 0.12
const X0 = -ANCHO / 2
const Z0 = -FONDO / 2

export const NOMBRE_ZONA: Record<TipoZona, string> = {
  mostrador: "Mostrador",
  deposito: "Depósito",
  servicio: "Servicio técnico",
  muelle: "Carga y entregas",
}

/** Los nombres que cambian con el rubro (lo demás, NOMBRE_ZONA). */
const NOMBRE_POR_RUBRO: Partial<Record<RubroTaller, Partial<Record<TipoZona, string>>>> = {
  kiosco: { deposito: "Góndolas" },
  sucursal: { deposito: "Salón y depósito" },
  distribuidora: { muelle: "Andenes y camiones" },
}

export function nombreZona(rubro: RubroTaller, tipo: TipoZona) {
  return NOMBRE_POR_RUBRO[rubro]?.[tipo] ?? NOMBRE_ZONA[tipo]
}

/** Las zonas de cada rubro, en el mismo corte de 26 × 18 m (lo alto al fondo, lo bajo al frente). */
function zonasDe(rubro: RubroTaller, conMostrador: boolean): Partial<Record<TipoZona, Rect>> {
  if (rubro === "kiosco")
    return {
      deposito: { x: X0 + 0.6, z: Z0 + 0.6, ancho: 15.6, fondo: 16.8 },
      ...(conMostrador ? { mostrador: { x: X0 + 16.8, z: Z0 + 7.6, ancho: 8.6, fondo: 9.8 } } : {}),
    }
  if (rubro === "distribuidora")
    return {
      deposito: { x: X0 + 0.6, z: Z0 + 0.6, ancho: 24.8, fondo: 10.2 },
      muelle: { x: X0 + 0.6, z: Z0 + 11.4, ancho: 24.8, fondo: 6 },
    }
  if (rubro === "sucursal")
    return {
      deposito: { x: X0 + 0.6, z: Z0 + 0.6, ancho: 24.8, fondo: 9.8 },
      ...(conMostrador ? { mostrador: { x: X0 + 10.8, z: Z0 + 11, ancho: 14.6, fondo: 6.4 } } : {}),
      muelle: { x: X0 + 0.6, z: Z0 + 11, ancho: 9.6, fondo: 6.4 },
    }
  return {
    deposito: { x: X0 + 0.6, z: Z0 + 0.6, ancho: 14.2, fondo: 11.6 },
    servicio: { x: X0 + 15.6, z: Z0 + 0.6, ancho: 9.8, fondo: 8.2 },
    ...(conMostrador ? { mostrador: { x: X0 + 15.6, z: Z0 + 9.6, ancho: 9.8, fondo: 7.8 } } : {}),
    muelle: { x: X0 + 0.6, z: Z0 + 13, ancho: 14.2, fondo: 4.4 },
  }
}

/** Estado de un producto en el estante: sin stock (hueco), crítico (ámbar) o normal (frío). */
export function estadoBloque(p: { cantidad: number; minimo: number }): EstadoBloque {
  if (p.cantidad <= 0) return "sin_stock"
  if (p.minimo > 0 && p.cantidad <= p.minimo) return "critico"
  return "normal"
}

/** Altura relativa del bloque: stock contra tres veces el mínimo (lleno ≈ 1). */
export function rellenoBloque(p: { cantidad: number; minimo: number }) {
  if (p.cantidad <= 0) return 0
  const base = p.minimo > 0 ? p.minimo * 3 : 30
  return Math.min(1, Math.max(0.14, p.cantidad / base))
}

/** Estante 1..12 de la ubicación → nivel 0..3 del rack (tres estantes por nivel). */
export const nivelDeEstante = (estante: number) => Math.min(NIVELES_RACK - 1, Math.max(0, Math.ceil(estante / 3) - 1))

const ESTADOS_RETIRO = new Set(["listo", "sin_reparacion"])

function grilla(n: number, r: Rect, celdaX: number, celdaZ: number) {
  const cols = Math.max(1, Math.floor(r.ancho / celdaX))
  const filas = Math.max(1, Math.ceil(n / cols))
  const pasoZ = Math.min(celdaZ, r.fondo / filas)
  const usadoX = Math.min(n, cols) * celdaX
  return Array.from({ length: n }, (_, i) => ({
    x: r.x + (r.ancho - usadoX) / 2 + (i % cols) * celdaX + celdaX / 2,
    z: r.z + Math.floor(i / cols) * pasoZ + pasoZ / 2,
  }))
}

/** Entero estable 0..n-1 a partir de un id (tamaños y cantidades de cajas). */
function hash(id: string, n: number) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return (h >>> 0) % n
}

export function planoTaller(t: TallerForja, tipo: "sucursal" | "deposito"): PlanoTaller {
  const rubro: RubroTaller = t.rubro ?? "comercio"
  const conMostrador = tipo === "sucursal" && t.puestos.length > 0
  const z = zonasDe(rubro, conMostrador)
  const zDeposito = z.deposito!
  // Las que el rubro no tiene quedan como rectángulos vacíos (no se dibujan ni se listan).
  const VACIO: Rect = { x: X0, z: Z0, ancho: 0, fondo: 0 }
  const zServicio = z.servicio ?? VACIO
  const zMostrador = z.mostrador ?? VACIO
  const zMuelle = z.muelle ?? VACIO

  const zonas: ZonaPlano[] = TIPOS_ZONA.flatMap((tz) => (z[tz] ? [{ tipo: tz, nombre: nombreZona(rubro, tz), ...z[tz]! }] : []))

  // ── Depósito: una sección por categoría (3 o 4 por fila) y un rack por letra de la ubicación ──
  const porCategoria = new Map<string, RackForja[]>()
  for (const r of t.racks) porCategoria.set(r.categoria, [...(porCategoria.get(r.categoria) ?? []), r])
  const categorias = [...porCategoria.keys()].sort()
  const COLS = zDeposito.ancho > 20 ? 4 : 3
  const margen = 0.5
  const separacion = 0.6
  const anchoSeccion = (zDeposito.ancho - 2 * margen - (COLS - 1) * separacion) / COLS
  const filas = Math.max(1, Math.ceil(categorias.length / COLS))
  const pasoFila = Math.min(2.4, (zDeposito.fondo - 2 * margen) / filas)
  const letras = Math.max(6, ...t.racks.map((r) => r.pasillo.charCodeAt(0) - 64))
  const anchoHueco = anchoSeccion / letras
  const fondoRack = Math.min(0.55, pasoFila * 0.4)
  const altoRack = BASE_RACK + NIVELES_RACK * ALTO_NIVEL

  const secciones: SeccionPlano[] = []
  const racks: RackPlano[] = []
  const bloques: BloquePlano[] = []
  categorias.forEach((cat, i) => {
    const sx = zDeposito.x + margen + (i % COLS) * (anchoSeccion + separacion)
    const sz = zDeposito.z + margen + Math.floor(i / COLS) * pasoFila + fondoRack / 2
    const lista = porCategoria.get(cat)!
    secciones.push({ categoria: cat, nombre: lista[0].categoriaNombre, x: sx, z: sz + fondoRack / 2 + 0.35, ancho: anchoSeccion })
    for (const rack of lista) {
      const hueco = Math.min(letras - 1, Math.max(0, rack.pasillo.charCodeAt(0) - 65))
      const rp: RackPlano = { rack, x: sx + hueco * anchoHueco + anchoHueco / 2, z: sz, ancho: anchoHueco * 0.9, fondo: fondoRack, alto: altoRack }
      racks.push(rp)
      // Productos de cada nivel, lado a lado
      const porNivel = Array.from({ length: NIVELES_RACK }, () => [] as ProductoRack[])
      for (const p of rack.productos) porNivel[nivelDeEstante(p.estante)].push(p)
      porNivel.forEach((ps, nivel) => {
        ps.sort((a, b) => a.estante - b.estante || a.sku.localeCompare(b.sku))
        const util = rp.ancho - 0.06
        const paso = util / Math.max(1, ps.length)
        ps.forEach((producto, k) => {
          const estado = estadoBloque(producto)
          const alto = estado === "sin_stock" ? 0.02 : (ALTO_NIVEL - 0.1) * rellenoBloque(producto)
          bloques.push({
            producto,
            rackId: rack.id,
            nivel,
            x: rp.x - util / 2 + paso * k + paso / 2,
            y: BASE_RACK + nivel * ALTO_NIVEL + 0.03 + alto / 2,
            z: rp.z,
            ancho: paso * 0.84,
            fondo: rp.fondo * 0.78,
            alto,
            estado,
          })
        })
      })
    }
  })

  // ── Mostrador: un puesto por caja sobre el mostrador ──
  const mostrador: Rect | null = z.mostrador ? { x: zMostrador.x + 0.8, z: zMostrador.z + Math.min(2.6, zMostrador.fondo * 0.4), ancho: zMostrador.ancho - 1.6, fondo: 0.7 } : null
  const puestos = mostrador ? t.puestos.map((puesto, i) => ({ puesto, x: mostrador.x + (mostrador.ancho / t.puestos.length) * (i + 0.5), z: mostrador.z + mostrador.fondo / 2 })) : []

  // ── Servicio técnico: estante de retiro contra la pared y bancos con las órdenes en curso ──
  const conServicio = Boolean(z.servicio)
  const enBanco = conServicio ? t.bancos.filter((b) => !ESTADOS_RETIRO.has(b.estado)) : []
  const paraRetirar = conServicio ? t.bancos.filter((b) => ESTADOS_RETIRO.has(b.estado)) : []
  const estanteRetiro: Rect = conServicio ? { x: zServicio.x + 0.5, z: zServicio.z + 0.3, ancho: zServicio.ancho - 1, fondo: 0.5 } : VACIO
  const porFila = 12
  const retiro = paraRetirar.slice(0, porFila * 2).map((banco, i) => ({
    banco,
    x: estanteRetiro.x + (estanteRetiro.ancho / porFila) * ((i % porFila) + 0.5),
    y: i < porFila ? 0.35 : 1.05,
    z: estanteRetiro.z + estanteRetiro.fondo / 2,
  }))
  const cantidadBancos = Math.max(3, Math.min(12, enBanco.length))
  const areaBancos: Rect = { x: zServicio.x + 0.3, z: zServicio.z + 1.5, ancho: zServicio.ancho - 0.6, fondo: zServicio.fondo - 1.8 }
  const bancos = conServicio ? grilla(cantidadBancos, areaBancos, 3.05, 2.2).map((p, i) => ({ banco: enBanco[i] ?? null, x: p.x, z: p.z })) : []

  // ── Carga y entregas: un palet por entrega pendiente; lo despachado ya no está en el muelle ──
  // La distribuidora: los camiones del reparto en sus andenes (los que están en viaje dejan el andén vacío).
  const camionesBultos = rubro === "distribuidora" ? t.muelle.filter((b) => b.tipo === "transferencia").slice(0, 6) : []
  const pasoAnden = z.muelle ? Math.min(3.6, (zMuelle.ancho - 3) / Math.max(1, camionesBultos.length)) : 0
  const camiones: CamionPlano[] = camionesBultos.map((bulto, i) => ({ bulto, x: zMuelle.x + 3 + pasoAnden * i + pasoAnden / 2, z: zMuelle.z + zMuelle.fondo / 2, enViaje: bulto.estado === "en_transito" }))
  const pendientes = z.muelle ? t.muelle.filter((b) => b.tipo === "entrega" && b.estado === "pendiente").slice(0, 12) : []
  const areaPalets: Rect = rubro === "distribuidora" ? { x: zMuelle.x + 0.4, z: zMuelle.z + 0.4, ancho: 2.4, fondo: zMuelle.fondo - 0.8 } : { x: zMuelle.x + 2.2, z: zMuelle.z + 0.6, ancho: zMuelle.ancho - 2.8, fondo: zMuelle.fondo - 1 }
  const palets = grilla(pendientes.length, areaPalets, 1.7, 1.7).map((p, i) => ({ bulto: pendientes[i], x: p.x, z: p.z, cajas: 1 + hash(pendientes[i].id, 3) }))
  // El portón: sobre la pared izquierda, a la altura del muelle (en el kiosco, la puerta del frente).
  const porton = { z: z.muelle ? zMuelle.z + zMuelle.fondo / 2 : Z0 + FONDO - 3, ancho: 3.2 }

  return {
    rubro,
    ancho: ANCHO,
    fondo: FONDO,
    zonas,
    puestos,
    mostrador,
    secciones,
    racks,
    bloques,
    bancos,
    retiro,
    estanteRetiro,
    palets,
    camiones,
    porton,
    salida: { x: X0 - 4, z: porton.z },
  }
}

/** Tamaño genérico y sobrio de una máquina sobre el banco, estable por orden. */
export function tamanoEquipo(id: string): [number, number, number] {
  const k = hash(id, 4)
  return [0.5 + k * 0.08, 0.32 + hash(id + "h", 4) * 0.08, 0.4 + (k % 2) * 0.1]
}

export function zonaDe(plano: PlanoTaller, tipo: TipoZona) {
  return plano.zonas.find((z) => z.tipo === tipo) ?? null
}

export function rackPorId(plano: PlanoTaller, id: string) {
  return plano.racks.find((r) => r.rack.id === id) ?? null
}

export function bancoPorId(plano: PlanoTaller, id: Id) {
  return plano.bancos.find((b) => b.banco?.id === id) ?? null
}

/** Rack ("HE-A") de una ubicación de stock ("HE-A3"). */
export function rackDeUbicacion(ubicacion: string) {
  const m = /^([A-Z0-9]+-[A-Z])\d+$/.exec(ubicacion)
  return m ? m[1] : null
}
