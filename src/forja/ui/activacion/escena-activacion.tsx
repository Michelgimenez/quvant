"use client"

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, Line } from "@react-three/drei"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { TRAZO_YUNQUE } from "@/components/marca/trazos"
import { CRONOGRAMA, poligonoDeTrazo, tramo } from "@/forja/dominio/activacion"
import { texturaBrillo } from "../taller/brillo"
import { Chispas, type ControlChispas } from "../taller/chispas"

/**
 * Activación (3D): el isotipo de Yunque extruido en acero cepillado cae y
 * apoya con peso; saltan chispas; alrededor se arma la forja (placas del
 * hogar, campana y chimenea en líneas de luz, núcleo de brasa) y los bordes
 * del yunque toman temperatura. Al final la cámara empuja hacia la brasa.
 * Todo depende de `reloj` (segundos), que maneja la capa de afuera.
 */
const ESCALA = 1 / 40
const ALTURA_CAIDA = 4.2
const NUCLEO = new THREE.Vector3(2.35, 0.66, -1.7)
const CAMARA = new THREE.Vector3(-1.5, 2.7, 8.2)
const MIRA = new THREE.Vector3(0.95, 0.85, -0.7)
const ACERO = new THREE.Color("#9aa3ae")
const BRASA = new THREE.Color("#ff6a1f")
const CHISPA = new THREE.Color("#ffb224")

const sube = (x: number) => 1 - Math.pow(1 - x, 3)
const acelera = (x: number) => x * x

export default function EscenaActivacion({
  reloj,
  reducir,
  onListo,
  onGolpe,
  onChispas,
}: {
  reloj: React.RefObject<number>
  reducir: boolean
  onListo: () => void
  onGolpe: () => void
  onChispas: () => void
}) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: CAMARA.toArray(), fov: 35, near: 0.1, far: 80 }} gl={{ antialias: true, powerPreference: "high-performance" }} aria-hidden>
      <color attach="background" args={["#0e1116"]} />
      <Entorno />
      {/* Luz principal arriba a la izquierda y un recorte frío desde atrás: el acero se lee por sus bordes */}
      <directionalLight position={[-5, 8, 4]} intensity={1.1} color="#f2f4f7" />
      <directionalLight position={[6, 3, -5]} intensity={1.3} color="#9fb2c8" />
      {/* Sin piso visible: solo la sombra de contacto sobre el fondo hierro */}
      <ContactShadows position={[0, 0.002, 0]} scale={16} resolution={1024} blur={2.6} far={3.2} opacity={0.85} color="#000000" />
      <Yunque reloj={reloj} />
      <Polvo reloj={reloj} reducir={reducir} />
      <Hogar reloj={reloj} />
      <Campana reloj={reloj} />
      <Nucleo reloj={reloj} />
      <ChispasDelGolpe reloj={reloj} reducir={reducir} onGolpe={onGolpe} onChispas={onChispas} />
      <Camara reloj={reloj} />
      <AvisarListo onListo={onListo} />
    </Canvas>
  )
}

/** Reflejos del acero sin bajar nada de internet (entorno generado en el navegador). */
function Entorno() {
  const gl = useThree((s) => s.gl)
  const entorno = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const textura = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    return textura
  }, [gl])
  useEffect(() => () => entorno.dispose(), [entorno])
  return <primitive object={entorno} attach="environment" />
}

function Yunque({ reloj }: { reloj: React.RefObject<number> }) {
  const grupo = useRef<THREE.Group>(null)
  const bordes = useRef<THREE.LineBasicMaterial>(null)
  const { geometria, aristas } = useMemo(() => {
    const puntos = poligonoDeTrazo(TRAZO_YUNQUE)
    const forma = new THREE.Shape(puntos.map(([x, y]) => new THREE.Vector2(x - 50, 88 - y)))
    const g = new THREE.ExtrudeGeometry(forma, { depth: 34, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.6, bevelSegments: 2, curveSegments: 1 })
    g.translate(0, 0, -17)
    g.computeVertexNormals()
    return { geometria: g, aristas: new THREE.EdgesGeometry(g, 28) }
  }, [])

  useFrame(() => {
    const t = reloj.current
    const caida = tramo(t, CRONOGRAMA.caida)
    if (grupo.current) grupo.current.position.y = ALTURA_CAIDA * (1 - caida * caida)
    const calor = sube(tramo(t, CRONOGRAMA.calor))
    if (bordes.current) {
      bordes.current.color.copy(ACERO).lerp(BRASA, Math.min(1, calor * 1.4)).lerp(CHISPA, Math.max(0, calor - 0.7) / 0.3 * 0.5)
      bordes.current.opacity = 0.25 + calor * 0.75
    }
  })

  return (
    <group ref={grupo} position-y={ALTURA_CAIDA} rotation-y={-0.32}>
      <group scale={ESCALA}>
        <mesh geometry={geometria}>
          <meshStandardMaterial color="#5f6873" metalness={0.95} roughness={0.36} envMapIntensity={0.45} />
        </mesh>
        <lineSegments geometry={aristas}>
          <lineBasicMaterial ref={bordes} color={ACERO} transparent opacity={0.25} toneMapped={false} />
        </lineSegments>
      </group>
    </group>
  )
}

/** Polvo fino: se levanta del piso al apoyar el yunque y se asienta (puntos que se apagan contra el fondo). */
function Polvo({ reloj, reducir }: { reloj: React.RefObject<number>; reducir: boolean }) {
  const N = reducir ? 0 : 140
  const datos = useMemo(() => {
    const semilla: GranoPolvo[] = Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.4
      const r = 0.9 + ((Math.sin(i * 78.233) + 1) / 2) * 0.7
      return { x: Math.cos(a) * r, z: Math.sin(a) * r * 0.55, vx: Math.cos(a) * (0.35 + (i % 7) * 0.06), vz: Math.sin(a) * 0.3, vy: 0.45 + (i % 5) * 0.12 }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    return { semilla, g }
  }, [N])

  useFrame(() => pintarPolvo(datos.g, datos.semilla, reloj.current))
  if (!N) return null
  return (
    <points geometry={datos.g} position={[0.2, 0, 0]}>
      <pointsMaterial size={0.022} vertexColors sizeAttenuation />
    </points>
  )
}

const FONDO = new THREE.Color("#0e1116")
const POLVO = new THREE.Color("#8a939e")
const color = new THREE.Color()

type GranoPolvo = { x: number; z: number; vx: number; vz: number; vy: number }

function pintarPolvo(g: THREE.BufferGeometry, semilla: GranoPolvo[], reloj: number) {
  const t = reloj - CRONOGRAMA.polvo.desde
  const visible = t > 0 && reloj < CRONOGRAMA.polvo.hasta
  const pos = g.attributes.position.array as Float32Array
  const col = g.attributes.color.array as Float32Array
  const s = Math.max(0, t)
  const desvanece = 1 - tramo(reloj, CRONOGRAMA.polvo)
  semilla.forEach((p, i) => {
    // Sube frenando y vuelve a bajar despacio (arrastre del aire)
    const y = Math.max(0.01, p.vy * s * Math.exp(-s * 1.6) * 1.2)
    const abre = (1 - Math.exp(-s * 2)) * 0.6
    pos.set([p.x + p.vx * abre, y, p.z + p.vz * abre], i * 3)
    const a = visible ? Math.min(1, s * 6) * desvanece : 0
    color.copy(FONDO).lerp(POLVO, a * 0.8)
    col.set([color.r, color.g, color.b], i * 3)
  })
  g.attributes.position.needsUpdate = true
  g.attributes.color.needsUpdate = true
}

/** Placas del hogar: suben desde abajo, una tras otra. */
function Hogar({ reloj }: { reloj: React.RefObject<number> }) {
  const placas = useMemo(() => {
    const lista: { x: number; y: number; z: number; w: number; h: number; d: number }[] = []
    for (let fila = 0; fila < 2; fila++)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++) lista.push({ x: NUCLEO.x - 0.62 + i * 0.62, y: 0.12 + fila * 0.24, z: NUCLEO.z - 0.33 + j * 0.66, w: 0.6, h: 0.22, d: 0.64 })
    return lista
  }, [])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    const p = tramo(reloj.current, CRONOGRAMA.placas)
    refs.current.forEach((m, i) => {
      if (!m) return
      const k = Math.min(1, Math.max(0, (p * (placas.length + 4) - i) / 5))
      m.position.y = placas[i].y - (1 - sube(k)) * 0.9
      m.visible = k > 0
    })
  })
  return (
    <group>
      {placas.map((pl, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m
          }}
          position={[pl.x, pl.y, pl.z]}
          visible={false}
        >
          <boxGeometry args={[pl.w - 0.02, pl.h, pl.d - 0.02]} />
          <meshStandardMaterial color="#2a313b" roughness={0.75} metalness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

/** Campana y chimenea: se dibujan con líneas de luz (trazo progresivo). */
function Campana({ reloj }: { reloj: React.RefObject<number> }) {
  const linea = useRef<React.ComponentRef<typeof Line>>(null)
  const puntos = useMemo(() => {
    const { x, z } = NUCLEO
    const abajo = 1.45
    const arriba = 2.35
    const tope = 3.55
    const r = (w: number, d: number, y: number) => [
      [x - w, y, z - d],
      [x + w, y, z - d],
      [x + w, y, z + d],
      [x - w, y, z + d],
    ] as [number, number, number][]
    const base = r(1.0, 0.68, abajo)
    const cuello = r(0.32, 0.26, arriba)
    const boca = r(0.32, 0.26, tope)
    const segs: [number, number, number][] = []
    const lazo = (q: [number, number, number][]) => q.forEach((p, i) => segs.push(p, q[(i + 1) % q.length]))
    lazo(base)
    base.forEach((p, i) => segs.push(p, cuello[i]))
    lazo(cuello)
    cuello.forEach((p, i) => segs.push(p, boca[i]))
    lazo(boca)
    return segs
  }, [])
  const largo = useMemo(() => {
    let l = 0
    for (let i = 0; i < puntos.length; i += 2) l += Math.hypot(puntos[i + 1][0] - puntos[i][0], puntos[i + 1][1] - puntos[i][1], puntos[i + 1][2] - puntos[i][2])
    return l
  }, [puntos])
  useFrame(() => {
    const m = linea.current?.material as unknown as { dashOffset: number; opacity: number } | undefined
    if (!m) return
    const p = tramo(reloj.current, CRONOGRAMA.campana)
    m.dashOffset = largo * (1 - p)
    m.opacity = p > 0 ? 0.9 : 0
  })
  return <Line ref={linea} points={puntos} segments color="#ffd9b0" lineWidth={1.4} dashed dashSize={largo} gapSize={largo} dashOffset={largo} transparent opacity={0} toneMapped={false} />
}

/** Núcleo de brasa: gradiente emisivo (halos aditivos) que late, y una luz que calienta lo de alrededor. */
function Nucleo({ reloj }: { reloj: React.RefObject<number> }) {
  const brillo = useMemo(() => texturaBrillo(), [])
  const capas = useRef<(THREE.Sprite | null)[]>([])
  const luz = useRef<THREE.PointLight>(null)
  const definicion = [
    { color: "#fff4e0", escala: 0.42, alfa: 1 },
    { color: "#ffb224", escala: 0.95, alfa: 0.7 },
    { color: "#ff6a1f", escala: 1.9, alfa: 0.45 },
    { color: "#c2410c", escala: 3.4, alfa: 0.22 },
  ]
  useFrame(() => {
    const t = reloj.current
    const encendido = sube(tramo(t, CRONOGRAMA.brasa))
    const late = 1 + Math.sin(t * 7.5) * 0.08 * encendido
    capas.current.forEach((s, i) => {
      if (!s) return
      s.scale.setScalar(definicion[i].escala * late * (0.6 + encendido * 0.4))
      ;(s.material as THREE.SpriteMaterial).opacity = definicion[i].alfa * encendido
    })
    if (luz.current) luz.current.intensity = 7 * encendido * late
  })
  return (
    <group position={NUCLEO.toArray()}>
      {definicion.map((d, i) => (
        <sprite
          key={i}
          ref={(s) => {
            capas.current[i] = s
          }}
        >
          <spriteMaterial map={brillo} color={d.color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      <pointLight ref={luz} color="#ff7a2a" intensity={0} distance={7} decay={1.6} position={[0, 0.35, 0.4]} />
    </group>
  )
}

/** Chispas desde la cara del yunque en cada golpe (y el sonido, si está prendido). */
function ChispasDelGolpe({ reloj, reducir, onGolpe, onChispas }: { reloj: React.RefObject<number>; reducir: boolean; onGolpe: () => void; onChispas: () => void }) {
  const chispas = useRef<ControlChispas>(null)
  const previo = useRef(-1)
  useFrame(() => {
    const t = reloj.current
    CRONOGRAMA.chispas.forEach((momento, i) => {
      if (previo.current < momento && t >= momento) {
        if (i === 0) onGolpe()
        if (i === 0) onChispas()
        const cantidad = i === 0 ? 40 : 22
        // La cara del yunque: arriba, entre el cuerno y el talón
        for (let k = 0; k < 3; k++) chispas.current?.lanzar(-0.35 + Math.random() * 1.3, 1.5, -0.35 + Math.random() * 0.7, Math.round(cantidad / 3))
      }
    })
    previo.current = t
  })
  return <Chispas ref={chispas} reducir={reducir} />
}

/** El reloj arranca recién cuando la escena dibujó su primer cuadro (si no, la caída se perdería). */
function AvisarListo({ onListo }: { onListo: () => void }) {
  const avisado = useRef(false)
  useFrame(() => {
    if (avisado.current) return
    avisado.current = true
    requestAnimationFrame(() => onListo())
  })
  return null
}

/** Cámara: temblor de 2 px al apoyar y, al final, empuje hacia el núcleo de la brasa. */
function Camara({ reloj }: { reloj: React.RefObject<number> }) {
  const mira = useMemo(() => new THREE.Vector3(), [])
  const inicio = useMemo(() => new THREE.Vector3(), [])
  // Por arriba y de frente al hogar: el empuje no roza el yunque
  const destino = useMemo(() => NUCLEO.clone().add(new THREE.Vector3(0.15, 0.85, 1.35)), [])
  useFrame(({ camera, size }) => {
    const t = reloj.current
    const cam = camera as THREE.PerspectiveCamera
    const empuje = acelera(tramo(t, CRONOGRAMA.empuje))
    // En pantallas verticales la cámara se aleja: yunque y hogar entran a lo ancho
    const lejos = Math.pow(Math.max(1, 1.5 / (size.width / size.height)), 0.85)
    inicio.copy(CAMARA).sub(MIRA).multiplyScalar(lejos).add(MIRA)
    cam.position.copy(inicio).lerp(destino, empuje)
    mira.copy(MIRA).lerp(NUCLEO, Math.min(1, empuje * 1.6))
    // 2 px de temblor: a esta distancia, un píxel mide alto_visible / alto_en_px
    const temblor = tramo(t, CRONOGRAMA.temblor)
    if (temblor > 0 && temblor < 1) {
      const pixel = (2 * cam.position.distanceTo(mira) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / size.height
      const k = 2 * pixel * (1 - temblor)
      cam.position.x += Math.sin(t * 95) * k
      cam.position.y += Math.cos(t * 83) * k
    }
    cam.lookAt(mira)
    const fov = 35 - empuje * 9
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })
  return null
}
