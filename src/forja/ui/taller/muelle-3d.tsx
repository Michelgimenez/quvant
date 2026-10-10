"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { ANCHO, zonaDe, type PlanoTaller } from "@/forja/dominio/plano"
import { useEscenaForja } from "../store"
import { COLOR } from "./materiales"

const DURACION_SALIDA = 2600
const X0 = -ANCHO / 2

/**
 * Carga y entregas: un palet por entrega pendiente del día. Cuando sale una
 * transferencia, su bulto cruza el portón y se va de la escena (en el nivel 1
 * aparece como arco en tránsito).
 */
export function Muelle3D({ plano, enTransito, salidas, reducir }: { plano: PlanoTaller; enTransito: number; salidas: React.RefObject<{ id: string; t0: number }[]>; reducir: boolean }) {
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  const z = zonaDe(plano, "muelle")!
  const { porton } = plano
  return (
    <group>
      {/* Umbral del portón: brasa tenue si hay mercadería en camino */}
      <mesh position={[X0 + 0.04, 0.012, porton.z]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.08, porton.ancho]} />
        <meshBasicMaterial color={enTransito ? COLOR.brasa : COLOR.lineaPiso} toneMapped={false} />
      </mesh>
      {plano.palets.map((p) => (
        <group
          key={p.bulto.id}
          position={[p.x, 0, p.z]}
          onClick={(ev) => {
            ev.stopPropagation()
            elegirZona({ tipo: "muelle", id: p.bulto.id })
          }}
        >
          <mesh position-y={0.07}>
            <boxGeometry args={[1.2, 0.14, 1]} />
            <meshStandardMaterial color={COLOR.palet} roughness={0.9} />
          </mesh>
          {Array.from({ length: p.cajas }, (_, i) => (
            <mesh key={i} position={[i === 1 ? 0.28 : -0.28, 0.14 + 0.2 + (i === 2 ? 0.4 : 0), i === 1 ? 0.18 : -0.12]}>
              <boxGeometry args={[0.52, 0.4, 0.5]} />
              <meshStandardMaterial color={COLOR.caja} roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Hasta cuatro bultos saliendo a la vez */}
      {[0, 1, 2, 3].map((i) => (
        <BultoSaliente key={i} lugar={i} salidas={salidas} desde={[z.x + 2.2, porton.z]} hasta={[plano.salida.x, plano.salida.z]} reducir={reducir} />
      ))}
    </group>
  )
}

function BultoSaliente({ lugar, salidas, desde, hasta, reducir }: { lugar: number; salidas: React.RefObject<{ id: string; t0: number }[]>; desde: [number, number]; hasta: [number, number]; reducir: boolean }) {
  const grupo = useRef<THREE.Group>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    const g = grupo.current
    if (!g) return
    const s = salidas.current[lugar]
    if (!s) {
      g.visible = false
      return
    }
    const t = Math.min(1, (performance.now() - s.t0) / (reducir ? 600 : DURACION_SALIDA))
    // Aparece en el muelle, espera un instante y se desliza hacia afuera, acelerando
    const avance = reducir ? 1 : t < 0.2 ? 0 : Math.pow((t - 0.2) / 0.8, 2)
    g.position.set(desde[0] + (hasta[0] - desde[0]) * avance, 0, desde[1] + (hasta[1] - desde[1]) * avance)
    g.scale.setScalar(reducir ? 1 : Math.min(1, t / 0.12))
    if (material.current) material.current.opacity = t > 0.8 ? (1 - t) / 0.2 : 1
    g.visible = t < 1
  })
  return (
    <group ref={grupo} visible={false}>
      <mesh position-y={0.3}>
        <boxGeometry args={[0.7, 0.5, 0.6]} />
        <meshStandardMaterial ref={material} color={COLOR.caja} roughness={0.85} transparent />
      </mesh>
      {/* Zuncho brasa: es una transferencia, no una entrega */}
      <mesh position-y={0.3}>
        <boxGeometry args={[0.72, 0.06, 0.62]} />
        <meshBasicMaterial color={COLOR.brasa} toneMapped={false} />
      </mesh>
    </group>
  )
}
