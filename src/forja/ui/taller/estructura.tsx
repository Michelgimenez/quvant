"use client"

import { Line } from "@react-three/drei"
import { ALTO_PARED, ANCHO, FONDO, type PlanoTaller, type Rect, type ZonaPlano } from "@/forja/dominio/plano"
import { useEscenaForja } from "../store"
import { COLOR } from "./materiales"

const GROSOR = 0.25
const ALTO_PORTON = 2.5

/** Losa, dos paredes cortadas (fondo e izquierda, con el portón del muelle) y el piso de cada zona. */
export function Estructura({ plano }: { plano: PlanoTaller }) {
  const x0 = -ANCHO / 2
  const z0 = -FONDO / 2
  const { porton } = plano
  const tramoA = porton.z - porton.ancho / 2 - z0
  const tramoB = FONDO / 2 - (porton.z + porton.ancho / 2)
  return (
    <group>
      {/* Losa */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[ANCHO + 0.8, 0.4, FONDO + 0.8]} />
        <meshStandardMaterial color={COLOR.losa} roughness={0.95} />
      </mesh>
      {/* Pared del fondo y pared izquierda, cortadas a la altura de la vista */}
      <Pared x={0} z={z0 - GROSOR / 2} largo={ANCHO + GROSOR * 2} eje="x" />
      <Pared x={x0 - GROSOR / 2} z={z0 + tramoA / 2} largo={tramoA} eje="z" />
      <Pared x={x0 - GROSOR / 2} z={FONDO / 2 - tramoB / 2} largo={tramoB} eje="z" />
      {/* Dintel del portón */}
      <mesh position={[x0 - GROSOR / 2, ALTO_PORTON + (ALTO_PARED - ALTO_PORTON) / 2, porton.z]}>
        <boxGeometry args={[GROSOR, ALTO_PARED - ALTO_PORTON, porton.ancho]} />
        <meshStandardMaterial color={COLOR.pared} roughness={0.9} />
      </mesh>
      <mesh position={[x0 - GROSOR / 2, ALTO_PARED + 0.001, porton.z]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[GROSOR, porton.ancho]} />
        <meshBasicMaterial color={COLOR.corte} />
      </mesh>
      {plano.zonas.map((z) => (
        <PisoZona key={z.tipo} zona={z} />
      ))}
    </group>
  )
}

function Pared({ x, z, largo, eje }: { x: number; z: number; largo: number; eje: "x" | "z" }) {
  const ancho = eje === "x" ? largo : GROSOR
  const fondo = eje === "x" ? GROSOR : largo
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={ALTO_PARED / 2}>
        <boxGeometry args={[ancho, ALTO_PARED, fondo]} />
        <meshStandardMaterial color={COLOR.pared} roughness={0.9} />
      </mesh>
      {/* Cara del corte, más clara: se lee como sección */}
      <mesh position-y={ALTO_PARED + 0.001} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[ancho, fondo]} />
        <meshBasicMaterial color={COLOR.corte} />
      </mesh>
    </group>
  )
}

/** Contorno de un rectángulo sobre el piso. */
export function Contorno({ r, color = COLOR.temple, y = 0.03, ancho = 1.5, opacidad = 1 }: { r: Rect; color?: string; y?: number; ancho?: number; opacidad?: number }) {
  return (
    <Line
      points={[
        [r.x, y, r.z],
        [r.x + r.ancho, y, r.z],
        [r.x + r.ancho, y, r.z + r.fondo],
        [r.x, y, r.z + r.fondo],
        [r.x, y, r.z],
      ]}
      color={color}
      lineWidth={ancho}
      transparent={opacidad < 1}
      opacity={opacidad}
      depthTest={false}
      renderOrder={5}
    />
  )
}

function PisoZona({ zona }: { zona: ZonaPlano }) {
  const resaltada = useEscenaForja((s) => s.zonaResaltada === zona.tipo)
  const elegida = useEscenaForja((s) => s.zona?.tipo === zona.tipo)
  const resaltarZona = useEscenaForja((s) => s.resaltarZona)
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  return (
    <group>
      <mesh
        position={[zona.x + zona.ancho / 2, 0.004, zona.z + zona.fondo / 2]}
        rotation-x={-Math.PI / 2}
        onPointerOver={() => resaltarZona(zona.tipo)}
        onPointerOut={() => resaltarZona(null)}
        onClick={(e) => {
          e.stopPropagation()
          elegirZona({ tipo: zona.tipo, id: null })
        }}
      >
        <planeGeometry args={[zona.ancho, zona.fondo]} />
        <meshStandardMaterial color={COLOR.piso} roughness={1} />
      </mesh>
      <Contorno r={zona} color={COLOR.lineaPiso} y={0.008} ancho={1} />
      {(resaltada || elegida) && <Contorno r={zona} />}
    </group>
  )
}
