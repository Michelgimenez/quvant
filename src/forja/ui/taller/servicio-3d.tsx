"use client"

import * as THREE from "three"
import { tamanoEquipo, type BancoPlano, type PlanoTaller } from "@/forja/dominio/plano"
import { useEscenaForja } from "../store"
import { ALTO_BANCO } from "./etiquetas"
import { COLOR, HORAS_BARRA_LLENA, LUZ_SERVICIO } from "./materiales"

const aristas = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))

/**
 * Servicio técnico: bancos con las máquinas en reparación (bloques sobrios con
 * su número de orden), luz de estado y una barra con el tiempo en el banco.
 * Lo que está listo o sin reparación espera en el estante de retiro.
 */
export function Servicio3D({ plano }: { plano: PlanoTaller }) {
  const zona = useEscenaForja((s) => s.zona)
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  const elegido = zona?.tipo === "servicio" ? zona.id : null
  const e = plano.estanteRetiro
  // El kiosco, la distribuidora y la sucursal de una cadena no tienen servicio técnico.
  if (!plano.zonas.some((z) => z.tipo === "servicio")) return null

  return (
    <group>
      {/* Estante de retiro contra la pared */}
      <group position={[e.x + e.ancho / 2, 0, e.z + e.fondo / 2]}>
        {[0.25, 0.95].map((y) => (
          <mesh key={y} position-y={y}>
            <boxGeometry args={[e.ancho, 0.025, e.fondo]} />
            <meshStandardMaterial color={COLOR.estante} roughness={0.7} metalness={0.3} />
          </mesh>
        ))}
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[(sx * (e.ancho - 0.04)) / 2, 0.75, 0]}>
            <boxGeometry args={[0.04, 1.5, e.fondo]} />
            <meshStandardMaterial color={COLOR.estructura} roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
      </group>
      {plano.retiro.map((r) => (
        <group
          key={r.banco.id}
          position={[r.x, r.y - 0.1 + 0.15, r.z]}
          onClick={(ev) => {
            ev.stopPropagation()
            elegirZona({ tipo: "servicio", id: r.banco.id })
          }}
        >
          <mesh>
            <boxGeometry args={[0.36, 0.3, 0.32]} />
            <meshStandardMaterial color={COLOR.equipo} roughness={0.55} metalness={0.35} />
          </mesh>
          {r.banco.estado === "listo" && (
            <mesh position={[0, 0.08, 0.165]}>
              <planeGeometry args={[0.08, 0.03]} />
              <meshBasicMaterial color={COLOR.blancoCaliente} toneMapped={false} />
            </mesh>
          )}
          {elegido === r.banco.id && (
            <lineSegments geometry={aristas} scale={[0.42, 0.36, 0.38]} renderOrder={7}>
              <lineBasicMaterial color={COLOR.temple} depthTest={false} transparent />
            </lineSegments>
          )}
        </group>
      ))}
      {plano.bancos.map((b, i) => (
        <Banco key={b.banco?.id ?? `libre-${i}`} b={b} elegido={b.banco !== null && elegido === b.banco.id} onElegir={() => b.banco && elegirZona({ tipo: "servicio", id: b.banco.id })} />
      ))}
    </group>
  )
}

function Banco({ b, elegido, onElegir }: { b: BancoPlano; elegido: boolean; onElegir: () => void }) {
  const orden = b.banco
  const luz = orden ? LUZ_SERVICIO[orden.estado] : null
  const [ax, ay, az] = orden ? tamanoEquipo(orden.id) : [0, 0, 0]
  const tiempo = orden ? Math.min(1, orden.horasEnBanco / HORAS_BARRA_LLENA) : 0
  return (
    <group
      position={[b.x, 0, b.z]}
      onClick={(ev) => {
        if (!orden) return
        ev.stopPropagation()
        onElegir()
      }}
    >
      <mesh position-y={ALTO_BANCO}>
        <boxGeometry args={[2, 0.06, 0.9]} />
        <meshStandardMaterial color={COLOR.tapa} roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position-y={0.25}>
        <boxGeometry args={[1.9, 0.03, 0.8]} />
        <meshStandardMaterial color={COLOR.mueble} roughness={0.8} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.94, ALTO_BANCO / 2, sz * 0.4]}>
            <boxGeometry args={[0.05, ALTO_BANCO, 0.05]} />
            <meshStandardMaterial color={COLOR.estructura} roughness={0.5} metalness={0.5} />
          </mesh>
        )),
      )}
      {orden && luz && (
        <>
          <mesh position={[-0.2, ALTO_BANCO + 0.03 + ay / 2, -0.08]}>
            <boxGeometry args={[ax, ay, az]} />
            <meshStandardMaterial color={COLOR.equipo} roughness={0.5} metalness={0.4} />
          </mesh>
          {/* Luz de estado en el canto del banco */}
          <mesh position={[0, ALTO_BANCO - 0.035, 0.455]}>
            <boxGeometry args={[1.96, 0.035, 0.012]} />
            <meshBasicMaterial color={new THREE.Color(luz.color).multiplyScalar(0.25 + luz.intensidad * 0.75)} toneMapped={false} />
          </mesh>
          {/* Tiempo en el banco: la barra se llena a las dos semanas; ámbar si la orden está atrasada */}
          <mesh position={[-0.9 + (1.8 * Math.max(0.02, tiempo)) / 2, ALTO_BANCO + 0.035, 0.36]}>
            <boxGeometry args={[1.8 * Math.max(0.02, tiempo), 0.01, 0.05]} />
            <meshBasicMaterial color={orden.atrasada ? COLOR.chispa : COLOR.acero} toneMapped={false} />
          </mesh>
        </>
      )}
      {elegido && (
        <lineSegments geometry={aristas} position-y={ALTO_BANCO / 2 + 0.2} scale={[2.12, ALTO_BANCO + 0.5, 1.02]} renderOrder={7}>
          <lineBasicMaterial color={COLOR.temple} depthTest={false} transparent />
        </lineSegments>
      )}
    </group>
  )
}
