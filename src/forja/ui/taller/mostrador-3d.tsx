"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { PlanoTaller, PuestoPlano } from "@/forja/dominio/plano"
import { useEscenaForja } from "../store"
import { texturaBrillo } from "./brillo"
import { ALTO_MOSTRADOR } from "./etiquetas"
import { COLOR } from "./materiales"

/**
 * Mostrador: un puesto por caja con su pantalla (encendida si la caja está
 * abierta). Cada venta enciende la pantalla y hace saltar chispas. Si el
 * puesto vendió sin conexión, una luz ámbar y la cola de sincronización.
 */
export function Mostrador3D({ plano, ultimasVentas }: { plano: PlanoTaller; ultimasVentas: React.RefObject<Record<number, number>> }) {
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  const r = plano.mostrador
  if (!r) return null
  return (
    <group>
      <group
        onClick={(e) => {
          e.stopPropagation()
          elegirZona({ tipo: "mostrador", id: null })
        }}
      >
        <mesh position={[r.x + r.ancho / 2, ALTO_MOSTRADOR / 2, r.z + r.fondo / 2]}>
          <boxGeometry args={[r.ancho, ALTO_MOSTRADOR, r.fondo]} />
          <meshStandardMaterial color={COLOR.mueble} roughness={0.8} />
        </mesh>
        <mesh position={[r.x + r.ancho / 2, ALTO_MOSTRADOR + 0.02, r.z + r.fondo / 2]}>
          <boxGeometry args={[r.ancho + 0.1, 0.04, r.fondo + 0.1]} />
          <meshStandardMaterial color={COLOR.tapa} roughness={0.5} metalness={0.2} />
        </mesh>
      </group>
      {plano.puestos.map((p) => (
        <Puesto key={p.puesto.puesto} p={p} ultimasVentas={ultimasVentas} />
      ))}
    </group>
  )
}

function Puesto({ p, ultimasVentas }: { p: PuestoPlano; ultimasVentas: React.RefObject<Record<number, number>> }) {
  const pantalla = useRef<THREE.MeshStandardMaterial>(null)
  const baliza = useRef<THREE.Group>(null)
  const base = p.puesto.cajaAbierta ? 0.45 : 0.04
  const cola = Math.min(8, p.puesto.sinConexion)
  const brillo = useMemo(() => texturaBrillo(), [])

  useFrame(({ clock }) => {
    const t = ultimasVentas.current?.[p.puesto.puesto]
    const destello = t ? Math.max(0, 1 - (performance.now() - t) / 900) : 0
    if (pantalla.current) pantalla.current.emissiveIntensity = base + destello * 2.2
    if (baliza.current) {
      // La luz ámbar respira mientras haya ventas sin sincronizar
      const k = 0.85 + Math.sin(clock.elapsedTime * 3) * 0.15
      baliza.current.scale.setScalar(k)
    }
  })

  const y = ALTO_MOSTRADOR + 0.04
  return (
    <group position={[p.x, y, p.z]}>
      {/* Terminal: base, brazo y pantalla inclinada hacia el frente */}
      <mesh position={[0, 0.03, -0.05]}>
        <boxGeometry args={[0.34, 0.06, 0.26]} />
        <meshStandardMaterial color={COLOR.estructura} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.16, -0.1]}>
        <boxGeometry args={[0.04, 0.22, 0.04]} />
        <meshStandardMaterial color={COLOR.estructura} roughness={0.5} metalness={0.4} />
      </mesh>
      <group position={[0, 0.36, -0.08]} rotation-x={-0.35}>
        <mesh>
          <boxGeometry args={[0.56, 0.36, 0.035]} />
          <meshStandardMaterial color={COLOR.mueble} roughness={0.6} />
        </mesh>
        <mesh position-z={0.019}>
          <planeGeometry args={[0.5, 0.3]} />
          <meshStandardMaterial ref={pantalla} color="#0e1116" emissive={COLOR.pantalla} emissiveIntensity={base} toneMapped={false} />
        </mesh>
      </group>
      {cola > 0 && (
        <group position={[0.42, 0, -0.02]}>
          {/* Cola de sincronización: un ticket por venta pendiente */}
          {Array.from({ length: cola }, (_, i) => (
            <mesh key={i} position={[0, 0.02 + i * 0.03, 0]}>
              <boxGeometry args={[0.16, 0.02, 0.2]} />
              <meshStandardMaterial color={COLOR.chispa} emissive={COLOR.chispa} emissiveIntensity={0.25} roughness={0.7} />
            </mesh>
          ))}
          <group ref={baliza} position={[0, 0.62, 0]}>
            <mesh>
              <sphereGeometry args={[0.06, 16, 12]} />
              <meshBasicMaterial color={COLOR.chispa} toneMapped={false} />
            </mesh>
            <sprite scale={[0.9, 0.9, 1]}>
              <spriteMaterial map={brillo} color={COLOR.chispa} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
          </group>
        </group>
      )}
    </group>
  )
}

/** Punto de donde saltan las chispas de una venta en ese puesto. */
export function origenChispa(plano: PlanoTaller, puesto: number): [number, number, number] | null {
  const p = plano.puestos.find((x) => x.puesto.puesto === puesto)
  return p ? [p.x, ALTO_MOSTRADOR + 0.55, p.z - 0.02] : null
}
