/** Geometría mínima de Forja: distancias, tiempos de viaje y proyección para el mapa 2D. */

const RADIO_TIERRA_KM = 6371

export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Minutos estimados de viaje en camioneta por el conurbano: 28 km/h promedio + 15 min de carga. */
export function minutosDeViaje(km: number) {
  return Math.round(15 + (km / 28) * 60)
}

/** Avance 0..1 de una transferencia en tránsito según su despacho y llegada estimada. */
export function avanceTransito(despachadaEn: string, llegadaEstimada: string, ahora: number) {
  const a = Date.parse(despachadaEn)
  const b = Date.parse(llegadaEstimada)
  if (!(b > a)) return 1
  return Math.min(1, Math.max(0, (ahora - a) / (b - a)))
}

/**
 * Proyección Web Mercator a un rectángulo (para la versión 2D en SVG), con
 * margen. Devuelve una función lat/lng → x/y dentro de [0, ancho] × [0, alto].
 */
export function proyeccion(puntos: { lat: number; lng: number }[], ancho: number, alto: number, margen = 0.14) {
  const merc = (p: { lat: number; lng: number }) => {
    const x = (p.lng + 180) / 360
    const s = Math.sin((p.lat * Math.PI) / 180)
    const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
    return { x, y }
  }
  const ms = puntos.map(merc)
  const minX = Math.min(...ms.map((p) => p.x))
  const maxX = Math.max(...ms.map((p) => p.x))
  const minY = Math.min(...ms.map((p) => p.y))
  const maxY = Math.max(...ms.map((p) => p.y))
  const spanX = Math.max(maxX - minX, 1e-6)
  const spanY = Math.max(maxY - minY, 1e-6)
  const escala = Math.min((ancho * (1 - 2 * margen)) / spanX, (alto * (1 - 2 * margen)) / spanY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return (p: { lat: number; lng: number }) => {
    const m = merc(p)
    return { x: ancho / 2 + (m.x - cx) * escala, y: alto / 2 + (m.y - cy) * escala }
  }
}

export type Punto3D = [lng: number, lat: number, alturaM: number]

/**
 * Arco de transferencia: recta en el plano con altura parabólica (en metros),
 * proporcional a la distancia. Se usa igual para dibujar el arco y para ubicar
 * las chispas que viajan sobre él.
 */
export function puntoEnArco(a: { lat: number; lng: number }, b: { lat: number; lng: number }, t: number): Punto3D {
  const altura = distanciaKm(a, b) * 1000 * 0.22
  return [a.lng + (b.lng - a.lng) * t, a.lat + (b.lat - a.lat) * t, Math.sin(Math.PI * t) * altura]
}

export function puntosArco(a: { lat: number; lng: number }, b: { lat: number; lng: number }, segmentos = 48): Punto3D[] {
  return Array.from({ length: segmentos + 1 }, (_, i) => puntoEnArco(a, b, i / segmentos))
}
