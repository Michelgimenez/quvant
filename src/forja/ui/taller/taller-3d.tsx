"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, PerformanceMonitor } from "@react-three/drei"
import type { EventoForja } from "@/forja/dominio/modelo"
import { rackDeUbicacion, type PlanoTaller } from "@/forja/dominio/plano"
import { useEscenaForja } from "../store"
import { CamaraTaller, type ModoCamara } from "./camara"
import { Chispas, type ControlChispas } from "./chispas"
import { Deposito3D } from "./deposito-3d"
import { Estructura } from "./estructura"
import type { Ancla } from "./etiquetas"
import { COLOR } from "./materiales"
import { Mostrador3D, origenChispa } from "./mostrador-3d"
import { Muelle3D } from "./muelle-3d"
import { ProyectorEtiquetas } from "./proyector"
import { Servicio3D } from "./servicio-3d"

export type PropsTaller3D = {
  plano: PlanoTaller
  sucursalId: string
  eventos: EventoForja[]
  enTransito: number
  modo: ModoCamara
  reducir: boolean
  margenDerecho: number
  margenAbajo: number
  anclas: Ancla[]
  elementos: React.RefObject<Map<string, HTMLElement>>
  onListo: () => void
  /** El navegador perdió el contexto WebGL: el taller pasa al plano 2D. */
  onPerdida: () => void
}

/**
 * Nivel 2 — corte isométrico de la sucursal (React Three Fiber). Se carga
 * aparte, solo al entrar a una sucursal: three.js no viaja con el mapa.
 */
export default function Taller3D(props: PropsTaller3D) {
  const zonaResaltada = useEscenaForja((s) => s.zonaResaltada)
  const rackResaltado = useEscenaForja((s) => s.rackResaltado)
  const elegirZona = useEscenaForja((s) => s.elegirZona)
  // dpr adaptativo: arranca en 1,5 y sube o baja según los cuadros por segundo medidos
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1))
  const { onPerdida } = props
  return (
    <Canvas
      orthographic
      flat
      // A demanda: solo se dibuja cuando algo se mueve (cámara, chispas, golpes, bultos) o cambia
      frameloop="demand"
      dpr={dpr}
      onCreated={({ gl }) =>
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault()
          onPerdida()
        })
      }
      camera={{ position: [40, 40, 40], zoom: 20, near: 1, far: 400 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ cursor: zonaResaltada || rackResaltado ? "pointer" : "default" }}
      onPointerMissed={() => elegirZona(null)}
      aria-label="Corte isométrico de la sucursal"
    >
      <PerformanceMonitor onIncline={() => setDpr(Math.min(2, window.devicePixelRatio || 1))} onDecline={() => setDpr(1)} flipflops={3} onFallback={() => setDpr(1)} />
      <Escena {...props} />
    </Canvas>
  )
}

function Escena({ plano, sucursalId, eventos, enTransito, modo, reducir, margenDerecho, margenAbajo, anclas, elementos, onListo }: PropsTaller3D) {
  const chispas = useRef<ControlChispas>(null)
  const invalidate = useThree((s) => s.invalidate)
  const ultimasVentas = useRef<Record<number, number>>({})
  // Animaciones de lo nuevo: las leen los bucles de cada zona (sin renders de React)
  const pulsos = useRef<{ rackId: string; t0: number }[]>([])
  const salidas = useRef<{ id: string; t0: number }[]>([])

  // Lo nuevo de la jornada se anima; lo que ya había al entrar, no
  const vistos = useRef<Set<string> | null>(null)
  useEffect(() => {
    const propios = eventos.filter((e) => e.sucursalId === sucursalId)
    if (!vistos.current) {
      vistos.current = new Set(propios.map((e) => e.id))
      return
    }
    const ahora = performance.now()
    const nuevosPulsos: { rackId: string; t0: number }[] = []
    const nuevasSalidas: { id: string; t0: number }[] = []
    for (const ev of propios) {
      if (vistos.current.has(ev.id)) continue
      vistos.current.add(ev.id)
      if (ev.tipo === "venta") {
        ultimasVentas.current[ev.puesto] = ahora
        const o = origenChispa(plano, ev.puesto)
        if (o) chispas.current?.lanzar(...o)
      } else if (ev.tipo === "stock_critico") {
        const rackId = rackDeUbicacion(ev.ubicacion)
        if (rackId) nuevosPulsos.push({ rackId, t0: ahora })
      } else if (ev.tipo === "transferencia_salida") {
        nuevasSalidas.push({ id: ev.transferenciaId, t0: ahora })
      }
    }
    if (nuevosPulsos.length) pulsos.current = [...pulsos.current.filter((x) => ahora - x.t0 < 2400), ...nuevosPulsos]
    if (nuevasSalidas.length) salidas.current = [...salidas.current.filter((x) => ahora - x.t0 < 3000), ...nuevasSalidas].slice(-4)
    // Lo nuevo pide cuadros; cada animación sigue pidiendo mientras dura
    invalidate()
  }, [eventos, sucursalId, plano, invalidate])

  return (
    <>
      <color attach="background" args={[COLOR.fondo]} />
      <hemisphereLight args={["#dfe5ec", "#0e1116", 1.1]} />
      <directionalLight position={[6, 24, 12]} intensity={1.6} color="#f4f6f8" />
      <directionalLight position={[-14, 10, 18]} intensity={0.35} color="#b8c4d2" />
      <CamaraTaller modo={modo} reducir={reducir} margenDerecho={margenDerecho} margenAbajo={margenAbajo} />
      <Estructura plano={plano} />
      <Deposito3D plano={plano} pulsos={pulsos} />
      <Mostrador3D plano={plano} ultimasVentas={ultimasVentas} />
      <Servicio3D plano={plano} />
      <Muelle3D plano={plano} enTransito={enTransito} salidas={salidas} reducir={reducir} />
      <Chispas ref={chispas} reducir={reducir} />
      <ProyectorEtiquetas anclas={anclas} elementos={elementos} />
      {/* Sombras de contacto suaves; se recalculan cuando cambia lo que hay en el piso */}
      <ContactShadows key={`${plano.racks.length}:${plano.bancos.length}:${plano.palets.length}`} position={[0, 0.012, 0]} scale={[plano.ancho + 0.6, plano.fondo + 0.6]} resolution={1024} blur={2.2} far={3.2} opacity={0.6} frames={1} color="#000000" />
      <AvisarListo onListo={onListo} />
    </>
  )
}

/** Avisa después del primer cuadro dibujado (la transición espera esto para abrir). */
function AvisarListo({ onListo }: { onListo: () => void }) {
  const avisado = useRef(false)
  useFrame(() => {
    if (avisado.current) return
    avisado.current = true
    requestAnimationFrame(() => onListo())
  })
  return null
}
