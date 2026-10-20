"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { TextoConfig } from "@/components/base/sellos"
import { clienteDemo } from "@/config/clientes"
import type { NombresDemo, SnapshotForja } from "@/forja/datos/mundo-demo"
import { MarcaForja } from "./marca-forja"

/** Lo pesado (mapa, 3D, simulador) se descarga después del primer pintado. */
const DemoPublicaForja = dynamic(() => import("./demo-publica").then((m) => m.DemoPublicaForja), { ssr: false, loading: () => <Cargando /> })

function Cargando() {
  return (
    <div className="flex h-full items-center justify-center" role="status">
      <MarcaForja tamano={26} className="animate-pulse opacity-70" />
    </div>
  )
}

/** Pantalla completa, sin barras de desplazamiento, siempre oscura (también dentro de un iframe). */
function Marco({ children }: { children: React.ReactNode }) {
  return <div className="dark fixed inset-0 overflow-hidden bg-negro text-blanco [&_*]:[scrollbar-width:none]">{children}</div>
}

/** /forja: la demo genérica (Ferretería Industrial Demo, sello DEMO). */
export function EscenarioForjaGenerico() {
  const [snapshot, setSnapshot] = useState<SnapshotForja | null>(null)
  useEffect(() => {
    void import("@/demo/forja-snapshot.json").then((m) => setSnapshot(m.default as unknown as SnapshotForja))
  }, [])
  return <Marco>{snapshot ? <DemoPublicaForja snapshot={snapshot} propuesta={false} /> : <Cargando />}</Marco>
}

/** /demo/<prospecto>/forja: la propuesta para un prospecto (sello PROPUESTA y su marca). */
export function EscenarioForjaCliente({ slug }: { slug: string }) {
  const cliente = clienteDemo(slug)
  const [snapshot, setSnapshot] = useState<SnapshotForja | null>(null)
  useEffect(() => {
    void cliente?.forja?.snapshot().then((s) => setSnapshot(s as SnapshotForja))
  }, [cliente])
  if (!cliente?.forja) return null
  const nombres: NombresDemo = {
    org: cliente.nombre,
    sucursales: Object.fromEntries(cliente.forja.sucursales.map((s) => [s.codigo, { nombre: s.nombre, direccion: s.direccion }])),
  }
  const aviso = (
    <span>
      Sucursales marcadas DEMO: <TextoConfig texto={cliente.forja.pendiente} />
    </span>
  )
  return (
    <Marco>
      {snapshot ? <DemoPublicaForja snapshot={snapshot} nombres={nombres} propuesta marca={{ logo: cliente.logoNegativo, nombre: cliente.nombre }} aviso={aviso} /> : <Cargando />}
    </Marco>
  )
}
