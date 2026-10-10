"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import { ALTO_NIVEL, NIVELES_RACK, type BloquePlano, type PlanoTaller, type RackPlano } from "@/forja/dominio/plano"
import { useEscenaForja } from "../store"
import { COLOR, COLOR_BLOQUE } from "./materiales"

const BASE = 0.12
const POSTE = 0.04
const DURACION_GOLPE = 2400
const GOLPES = 4
const caja = new THREE.BoxGeometry(1, 1, 1)
const aristas = new THREE.EdgesGeometry(caja)
const m = new THREE.Matrix4()
const q = new THREE.Quaternion()
const v = new THREE.Vector3()
const s = new THREE.Vector3()

function cargar(malla: THREE.InstancedMesh | null, items: { x: number; y: number; z: number; sx: number; sy: number; sz: number }[]) {
  if (!malla) return
  items.forEach((it, i) => malla.setMatrixAt(i, m.compose(v.set(it.x, it.y, it.z), q, s.set(it.sx, it.sy, it.sz))))
  malla.count = items.length
  malla.instanceMatrix.needsUpdate = true
  malla.computeBoundingSphere()
}

/**
 * Depósito: racks instanciados por ubicación y un bloque por producto en su
 * estante. La altura es el stock relativo; frío si está bien, ámbar si está
 * en el mínimo o debajo, y un hueco marcado (ascua) si no hay stock.
 */
export function Deposito3D({ plano, pulsos: refPulsos }: { plano: PlanoTaller; pulsos: React.RefObject<{ rackId: string; t0: number }[]> }) {
  const rackResaltado = useEscenaForja((st) => st.rackResaltado)
  const zona = useEscenaForja((st) => st.zona)
  const resaltarRack = useEscenaForja((st) => st.resaltarRack)
  const resaltarZona = useEscenaForja((st) => st.resaltarZona)
  const elegirZona = useEscenaForja((st) => st.elegirZona)
  const elegido = zona?.tipo === "deposito" ? zona.id : null

  const postes = useRef<THREE.InstancedMesh>(null)
  const estantes = useRef<THREE.InstancedMesh>(null)
  const normales = useRef<THREE.InstancedMesh>(null)
  const criticos = useRef<THREE.InstancedMesh>(null)
  const huecos = useRef<THREE.InstancedMesh>(null)
  const golpes = useRef<(THREE.LineSegments | null)[]>([])

  const n = plano.racks.length
  const porEstado = useMemo(() => {
    const g: Record<BloquePlano["estado"], BloquePlano[]> = { normal: [], critico: [], sin_stock: [] }
    for (const b of plano.bloques) g[b.estado].push(b)
    return g
  }, [plano.bloques])

  useLayoutEffect(() => {
    cargar(
      postes.current,
      plano.racks.flatMap((r) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: r.x + (sx * (r.ancho - POSTE)) / 2, y: r.alto / 2, z: r.z + (sz * (r.fondo - POSTE)) / 2, sx: POSTE, sy: r.alto, sz: POSTE })))),
    )
    cargar(
      estantes.current,
      plano.racks.flatMap((r) => Array.from({ length: NIVELES_RACK + 1 }, (_, i) => ({ x: r.x, y: BASE + i * ALTO_NIVEL, z: r.z, sx: r.ancho, sy: 0.025, sz: r.fondo }))),
    )
    const bloque = (b: BloquePlano) => ({ x: b.x, y: b.y, z: b.z, sx: b.ancho, sy: b.alto, sz: b.fondo })
    cargar(normales.current, porEstado.normal.map(bloque))
    cargar(criticos.current, porEstado.critico.map(bloque))
    cargar(huecos.current, porEstado.sin_stock.map((b) => ({ ...bloque(b), sy: 0.018 })))
  }, [plano.racks, porEstado])

  // Golpe ámbar sobre el rack que acaba de pasar a crítico: aristas que se abren y se apagan
  useFrame(() => {
    const ahora = performance.now()
    const vivos = refPulsos.current.filter((p) => ahora - p.t0 < DURACION_GOLPE).slice(-GOLPES)
    golpes.current.forEach((linea, i) => {
      if (!linea) return
      const p = vivos[i]
      const r = p ? plano.racks.find((x) => x.rack.id === p.rackId) : undefined
      linea.visible = Boolean(r)
      if (!p || !r) return
      const t = (ahora - p.t0) / DURACION_GOLPE
      const e = 1 + t * 0.3
      linea.position.set(r.x, r.alto / 2, r.z)
      linea.scale.set(r.ancho * e + 0.06, r.alto * e + 0.06, r.fondo * e + 0.06)
      const material = linea.material as THREE.LineBasicMaterial
      material.opacity = 1 - t
    })
  })

  const instancia = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId !== undefined ? plano.racks[e.instanceId] : undefined)
  const conCursor = plano.racks.find((r) => r.rack.id === rackResaltado)
  const conSeleccion = plano.racks.find((r) => r.rack.id === elegido)

  return (
    <group>
      <instancedMesh key={`p${n}`} ref={postes} args={[caja, undefined, n * 4]}>
        <meshStandardMaterial color={COLOR.estructura} roughness={0.5} metalness={0.5} />
      </instancedMesh>
      <instancedMesh key={`e${n}`} ref={estantes} args={[caja, undefined, n * (NIVELES_RACK + 1)]}>
        <meshStandardMaterial color={COLOR.estante} roughness={0.7} metalness={0.3} />
      </instancedMesh>
      <instancedMesh key={`n${porEstado.normal.length}`} ref={normales} args={[caja, undefined, Math.max(1, porEstado.normal.length)]}>
        <meshStandardMaterial color={COLOR_BLOQUE.normal} roughness={0.75} metalness={0.15} />
      </instancedMesh>
      <instancedMesh key={`c${porEstado.critico.length}`} ref={criticos} args={[caja, undefined, Math.max(1, porEstado.critico.length)]}>
        <meshStandardMaterial color={COLOR_BLOQUE.critico} emissive={COLOR_BLOQUE.critico} emissiveIntensity={0.35} roughness={0.6} />
      </instancedMesh>
      <instancedMesh key={`h${porEstado.sin_stock.length}`} ref={huecos} args={[caja, undefined, Math.max(1, porEstado.sin_stock.length)]}>
        <meshBasicMaterial color={COLOR_BLOQUE.sin_stock} toneMapped={false} />
      </instancedMesh>
      {Array.from({ length: GOLPES }, (_, i) => (
        <lineSegments
          key={i}
          ref={(l) => {
            golpes.current[i] = l
          }}
          geometry={aristas}
          visible={false}
          renderOrder={6}
        >
          <lineBasicMaterial color={COLOR.chispa} transparent depthTest={false} toneMapped={false} />
        </lineSegments>
      ))}

      {/* Volumen de cada rack para el cursor: productos al pasar, detalle al hacer clic */}
      <instancedMesh
        key={`r${n}`}
        args={[caja, undefined, n]}
        ref={(malla) => cargar(malla, plano.racks.map((r) => ({ x: r.x, y: r.alto / 2, z: r.z, sx: r.ancho, sy: r.alto, sz: r.fondo + 0.2 })))}
        onPointerMove={(e) => {
          const r = instancia(e)
          if (r && r.rack.id !== rackResaltado) resaltarRack(r.rack.id)
          resaltarZona("deposito")
        }}
        onPointerOut={() => resaltarRack(null)}
        onClick={(e) => {
          const r = instancia(e)
          if (!r) return
          e.stopPropagation()
          elegirZona({ tipo: "deposito", id: r.rack.id })
        }}
      >
        <meshBasicMaterial visible={false} />
      </instancedMesh>

      {conCursor && <AristasRack r={conCursor} />}
      {conSeleccion && conSeleccion !== conCursor && <AristasRack r={conSeleccion} />}
    </group>
  )
}

function AristasRack({ r }: { r: RackPlano }) {
  return (
    <lineSegments geometry={aristas} position={[r.x, r.alto / 2, r.z]} scale={[r.ancho + 0.04, r.alto + 0.04, r.fondo + 0.04]} renderOrder={7}>
      <lineBasicMaterial color={COLOR.temple} depthTest={false} transparent />
    </lineSegments>
  )
}
