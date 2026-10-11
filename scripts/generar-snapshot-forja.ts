/**
 * Snapshots de las demos públicas de Forja, generados desde el seed:
 *   src/demo/forja-snapshot.json            → /forja (Ferretería Industrial Demo)
 *   src/demo/<prospecto>-snapshot.json      → /demo/<prospecto>/forja (PROPUESTA)
 *
 * Las demos públicas no leen la base: trabajan sobre este estado y corren el
 * simulador en el navegador. En los de prospectos no se guardan nombres (de la
 * empresa ni de sus sucursales): los pone su configuración en src/config/clientes/.
 *
 * Uso: npm run snapshot-forja
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { CLIENTES } from "../src/config/clientes"
import { clavePrecio, listaDefault, type EstadoEmpresa } from "../src/dominio/estado"
import { generarEmpresaDemo } from "../src/datos/demo/generar"

/** Miércoles 16:30 en Argentina: jornada avanzada, transferencias en camino. */
export const AHORA_SNAPSHOT = new Date("2026-10-07T19:30:00.000Z")
const DIAS = 30
const SALIDA = path.join(process.cwd(), "src", "demo")

/** Fuera lo que Forja no usa ni necesita el simulador (auditoría, cuentas, cajas cerradas, compras, conteos, otras listas). */
function recortar(e: EstadoEmpresa): EstadoEmpresa {
  const lista = listaDefault(e)
  const precios = Object.fromEntries(Object.values(e.productos).flatMap((p) => {
    const k = clavePrecio(lista.id, p.id)
    return e.precios[k] ? [[k, e.precios[k]]] : []
  }))
  // De las ventas ya hechas, Forja usa fecha, sucursal, puesto, total, número, origen, cliente y qué productos llevaban
  const ventas = Object.fromEntries(
    Object.entries(e.ventas).map(([id, v]) => [
      id,
      { ...v, items: v.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })), pagos: [], advertencias: [], comprobante: { tipo: v.comprobante.tipo } },
    ]),
  ) as unknown as EstadoEmpresa["ventas"]
  return {
    ...e,
    ventas,
    precios,
    auditoria: [],
    movimientosCuenta: [],
    movimientosCaja: [],
    compras: {},
    conteos: {},
    cajas: Object.fromEntries(Object.entries(e.cajas).filter(([, c]) => !c.cierre)),
  }
}

/** Sin nombres propios: los pone la configuración del prospecto al cargar. */
function sinNombres(e: EstadoEmpresa): EstadoEmpresa {
  return {
    ...e,
    org: { ...e.org, nombre: "", slug: "", logo: "", logoNegativo: "" },
    negocios: e.negocios.map((n) => ({ ...n, nombre: "" })),
    sucursales: e.sucursales.map((s) => ({ ...s, nombre: s.codigo, direccion: "" })),
  }
}

function escribir(nombre: string, estado: EstadoEmpresa) {
  mkdirSync(SALIDA, { recursive: true })
  const archivo = path.join(SALIDA, nombre)
  writeFileSync(archivo, JSON.stringify({ ahora: AHORA_SNAPSHOT.toISOString(), estado }))
  console.log(`✓ ${path.relative(process.cwd(), archivo)} (${Math.round(JSON.stringify(estado).length / 1024)} KB)`)
}

escribir("forja-snapshot.json", recortar(generarEmpresaDemo({ ahora: AHORA_SNAPSHOT, dias: DIAS })))

for (const c of Object.values(CLIENTES)) {
  if (!c.forja) continue
  const estado = generarEmpresaDemo({
    ahora: AHORA_SNAPSHOT,
    dias: DIAS,
    semilla: `forja:${c.slug}`,
    sucursales: c.forja.sucursales.map(({ codigo, lat, lng, tipo, demo, puestos, ventasDia }) => ({ codigo, lat, lng, tipo, demo, puestos, ventasDia })),
  })
  escribir(`${c.slug}-snapshot.json`, sinNombres(recortar(estado)))
}
