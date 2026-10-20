"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { useApp } from "@/cliente/app-contexto"
import type { Permiso } from "@/dominio/permisos"
import type { Modulo } from "@/dominio/tipos"
import { Ficha, Sello } from "@/components/base/sellos"
import { cn } from "@/lib/utils"

export function EncabezadoPagina({
  titulo,
  ficha,
  descripcion,
  acciones,
  className,
}: {
  titulo: string
  ficha?: string
  descripcion?: React.ReactNode
  acciones?: React.ReactNode
  className?: string
}) {
  const { motor } = useApp()
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          {ficha && <Ficha>{ficha}</Ficha>}
          {motor.estado.org.esDemo && <Sello />}
        </div>
        <h1 className="t-titulo">{titulo}</h1>
        {descripcion && <p className="t-texto-sm max-w-2xl text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}

/** Guarda de acceso por permiso y módulo activo. */
export function Requiere({ permiso, modulo, children }: { permiso: Permiso; modulo?: Modulo; children: React.ReactNode }) {
  const { puede, moduloActivo } = useApp()
  if (modulo && !moduloActivo(modulo)) {
    return <SinAcceso titulo="Módulo desactivado" texto="Este módulo no está activo en tu empresa. Se activa desde Configuración." />
  }
  if (!puede(permiso)) return <SinAcceso titulo="Sin acceso" texto="Tu rol no tiene permiso para ver esta sección. Si lo necesitás, pedíselo a quien administra Quvant." />
  return <>{children}</>
}

function SinAcceso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md space-y-3 text-center">
      <span className="mx-auto inline-flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Lock className="size-5" />
      </span>
      <h1 className="t-titulo-sm">{titulo}</h1>
      <p className="t-texto-sm text-muted-foreground">{texto}</p>
      <Link href="/app" className="t-texto-sm text-foreground underline-offset-4 hover:underline">
        Volver al tablero
      </Link>
    </div>
  )
}

export function Vacio({ icono: Icono, titulo, texto, accion }: { icono: React.ComponentType<{ className?: string }>; titulo: string; texto?: string; accion?: React.ReactNode }) {
  return (
    <div className="grilla-puntos flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-linea px-6 py-12 text-center">
      <Icono className="size-6 text-muted-foreground" />
      <p className="t-titulo-sm">{titulo}</p>
      {texto && <p className="t-texto-sm max-w-sm text-muted-foreground">{texto}</p>}
      {accion}
    </div>
  )
}

/** Tarjeta de sección con título opcional. */
export function Panel({ titulo, accion, children, className, ficha }: { titulo?: string; ficha?: string; accion?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-linea bg-card p-4 sm:p-5", className)}>
      {(titulo || accion) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            {ficha && <Ficha as="p">{ficha}</Ficha>}
            {titulo && <h2 className="t-texto font-semibold">{titulo}</h2>}
          </div>
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}
