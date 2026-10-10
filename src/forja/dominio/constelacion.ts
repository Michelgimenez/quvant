import type { Id } from "@/dominio/tipos"

/**
 * Vista Constelación: los nodos sin geografía, dimensionados por facturación.
 * Disposición radial: el de mayor facturación al centro y el resto en anillos.
 * Coordenadas en píxeles dentro de un lienzo de `ancho` × `alto`.
 */
export type PosicionConstelacion = { id: Id; x: number; y: number; radio: number }

export function layoutConstelacion(nodos: { id: Id; facturacion28: number }[], ancho: number, alto: number): PosicionConstelacion[] {
  if (!nodos.length) return []
  const orden = [...nodos].sort((a, b) => b.facturacion28 - a.facturacion28 || a.id.localeCompare(b.id))
  const maximo = Math.max(1, orden[0].facturacion28)
  const radio = (f: number) => 16 + 30 * Math.sqrt(Math.max(0, f) / maximo)
  const cx = ancho / 2
  const cy = alto / 2
  const lado = Math.min(ancho, alto)
  if (orden.length === 1) return [{ id: orden[0].id, x: cx, y: cy, radio: radio(orden[0].facturacion28) }]

  const [centro, ...resto] = orden
  const posiciones: PosicionConstelacion[] = [{ id: centro.id, x: cx, y: cy, radio: radio(centro.facturacion28) }]
  // Hasta 6 por anillo; anillos cada vez más amplios
  for (let i = 0; i < resto.length; i++) {
    const anillo = Math.floor(i / 6)
    const enAnillo = Math.min(6, resto.length - anillo * 6)
    const k = i % 6
    const r = lado * (0.28 + anillo * 0.16)
    // Con pocos satélites se abren en abanico arriba (triángulo), no en línea recta
    const paso = (Math.PI * 2) / Math.max(enAnillo, 3)
    const angulo = -Math.PI / 2 + (k - (enAnillo - 1) / 2) * paso + anillo * 0.4
    posiciones.push({ id: resto[i].id, x: cx + Math.cos(angulo) * r, y: cy + Math.sin(angulo) * r * 0.82, radio: radio(resto[i].facturacion28) })
  }
  return posiciones
}

/** Grosor del enlace (px) según unidades transferidas en 28 días. */
export function grosorEnlace(unidades: number, maximo: number) {
  return maximo > 0 ? 1 + 5 * Math.sqrt(unidades / maximo) : 1
}
