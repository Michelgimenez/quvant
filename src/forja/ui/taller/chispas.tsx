"use client"

import { forwardRef, useImperativeHandle, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

/**
 * Chispas como estelas finas y luminosas: segmentos de línea (cabeza blanca
 * caliente, cola brasa que se apaga) con física simple y mezcla aditiva. Un
 * solo dibujo para todas.
 */
export type ControlChispas = { lanzar: (x: number, y: number, z: number, cantidad?: number) => void }

const MAX = 320
const GRAVEDAD = -7.5
const CALIENTE = new THREE.Color("#fff4e0")
const BRASA = new THREE.Color("#ff6a1f")

export const Chispas = forwardRef<ControlChispas, { reducir: boolean }>(function Chispas({ reducir }, ref) {
  const sim = useMemo(
    () => ({
      pos: new Float32Array(MAX * 3),
      vel: new Float32Array(MAX * 3),
      vida: new Float32Array(MAX),
      duracion: new Float32Array(MAX),
      siguiente: 0,
    }),
    [],
  )
  const geometria = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX * 6), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX * 6), 3).setUsage(THREE.DynamicDrawUsage))
    g.setDrawRange(0, 0)
    return g
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      lanzar: (x, y, z, cantidad = 24) => {
        // Con movimiento reducido, apenas un destello corto y quieto
        const n = reducir ? 4 : cantidad
        for (let k = 0; k < n; k++) {
          const i = sim.siguiente
          sim.siguiente = (sim.siguiente + 1) % MAX
          const ang = Math.random() * Math.PI * 2
          const h = reducir ? 0.2 : 0.8 + Math.random() * 1.6
          sim.pos.set([x, y, z], i * 3)
          sim.vel.set([Math.cos(ang) * h, reducir ? 0.3 : 2.6 + Math.random() * 2, Math.sin(ang) * h], i * 3)
          sim.duracion[i] = reducir ? 0.25 : 0.65 + Math.random() * 0.55
          sim.vida[i] = sim.duracion[i]
        }
      },
    }),
    [sim, reducir],
  )

  useFrame((_, dtReal) => {
    const dt = Math.min(dtReal, 1 / 30)
    const posiciones = geometria.attributes.position.array as Float32Array
    const colores = geometria.attributes.color.array as Float32Array
    let n = 0
    for (let i = 0; i < MAX; i++) {
      if (sim.vida[i] <= 0) continue
      sim.vida[i] -= dt
      const o = i * 3
      sim.vel[o + 1] += GRAVEDAD * dt
      sim.vel[o] *= 0.985
      sim.vel[o + 2] *= 0.985
      sim.pos[o] += sim.vel[o] * dt
      sim.pos[o + 1] += sim.vel[o + 1] * dt
      sim.pos[o + 2] += sim.vel[o + 2] * dt
      if (sim.pos[o + 1] < 0.02) {
        sim.pos[o + 1] = 0.02
        sim.vel[o + 1] *= -0.25
      }
      const a = Math.max(0, sim.vida[i] / sim.duracion[i])
      // Estela: largo proporcional a la velocidad
      const k = 0.085
      const v = n * 6
      posiciones.set([sim.pos[o], sim.pos[o + 1], sim.pos[o + 2], sim.pos[o] - sim.vel[o] * k, sim.pos[o + 1] - sim.vel[o + 1] * k, sim.pos[o + 2] - sim.vel[o + 2] * k], v)
      colores.set([CALIENTE.r * a, CALIENTE.g * a, CALIENTE.b * a, BRASA.r * a * 0.5, BRASA.g * a * 0.5, BRASA.b * a * 0.5], v)
      n++
    }
    geometria.setDrawRange(0, n * 2)
    geometria.attributes.position.needsUpdate = true
    geometria.attributes.color.needsUpdate = true
  })

  return (
    <lineSegments geometry={geometria} frustumCulled={false} renderOrder={10}>
      <lineBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  )
})
