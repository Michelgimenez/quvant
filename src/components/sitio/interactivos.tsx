"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { EscalaQuieta } from "./escala-quieta"

/**
 * Las demos interactivas del sitio cargan su código recién cuando están por
 * entrar en pantalla: el sitio abre rápido y el motor de la app no pesa en
 * la primera carga.
 */
function Cargando({ alto, texto }: { alto: number; texto: string }) {
  return (
    <div className="t-texto-sm flex items-center justify-center rounded-lg border border-linea bg-superficie-1/60 text-acero" style={{ minHeight: alto }} role="status">
      {texto}
    </div>
  )
}

/** La escala del hero: se carga enseguida (está arriba de todo); mientras tanto, la escala quieta. */
const Escala = dynamic(() => import("./escala").then((m) => m.Escala), { ssr: false, loading: () => <EscalaQuieta /> })

export function EscalaPerezosa() {
  return <Escala quieta={<EscalaQuieta />} />
}

const DemoConexion = dynamic(() => import("./demo-conexion").then((m) => m.DemoConexion), {
  ssr: false,
  loading: () => <Cargando alto={420} texto="Preparando el mostrador de demostración…" />,
})

const PreciosAlDia = dynamic(() => import("./precios-al-dia").then((m) => m.PreciosAlDia), {
  ssr: false,
  loading: () => <Cargando alto={520} texto="Cargando el catálogo de demostración…" />,
})

function AlVer({ alto, texto, children }: { alto: number; texto: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: "400px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref}>{visible ? children : <Cargando alto={alto} texto={texto} />}</div>
}

export function DemoConexionPerezosa() {
  return (
    <AlVer alto={420} texto="Preparando el mostrador de demostración…">
      <DemoConexion />
    </AlVer>
  )
}

export function PreciosAlDiaPerezoso() {
  return (
    <AlVer alto={520} texto="Cargando el catálogo de demostración…">
      <PreciosAlDia />
    </AlVer>
  )
}
