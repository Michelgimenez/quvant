import * as THREE from "three"

let textura: THREE.CanvasTexture | null = null

/** Textura de brillo radial (para halos aditivos: sin postproceso). */
export function texturaBrillo() {
  if (textura) return textura
  const c = document.createElement("canvas")
  c.width = c.height = 128
  const g = c.getContext("2d")!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, "rgba(255,255,255,1)")
  grad.addColorStop(0.25, "rgba(255,255,255,0.45)")
  grad.addColorStop(0.6, "rgba(255,255,255,0.08)")
  grad.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  textura = new THREE.CanvasTexture(c)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}
