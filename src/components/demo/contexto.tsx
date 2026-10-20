"use client"

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { useStore } from "zustand"
import { datosEmpresa } from "@/demo/datos"
import { EMPRESAS, type IdEmpresa } from "@/demo/empresas"
import { crearEstadoDemo, type EstadoDemo, type TiendaDemo } from "@/demo/estado-visitante"
import { ANCLA_MS } from "@/demo/generar"
import type { DatosNegocio } from "@/dominio/negocio"

/**
 * El contexto de la demo: la tienda del visitante, la empresa activa y el reloj de la demo.
 * El reloj arranca en la fecha ancla (viernes 17:30) cuando se abre la página y avanza con el reloj real.
 * Con `?film=1` lo maneja la filmación (window.__seek), cuadro por cuadro.
 */
type ContextoDemo = { tienda: TiendaDemo; reloj: RelojDemo }
const Contexto = createContext<ContextoDemo | null>(null)

export type RelojDemo = { ahora: () => number; suscribir: (fn: () => void) => () => void; fijar: (t: number) => void; filmando: boolean }

function crearReloj(filmando: boolean): RelojDemo {
  const inicio = typeof performance === "undefined" ? 0 : performance.now()
  let fijo: number | null = filmando ? ANCLA_MS : null
  const oyentes = new Set<() => void>()
  let ultimo = ANCLA_MS
  const ahora = () => {
    const t = fijo ?? ANCLA_MS + Math.floor(performance.now() - inicio)
    return t
  }
  let intervalo: ReturnType<typeof setInterval> | null = null
  return {
    ahora: () => ultimo,
    filmando,
    fijar: (t) => {
      fijo = t
      ultimo = t
      oyentes.forEach((o) => o())
    },
    suscribir: (fn) => {
      oyentes.add(fn)
      if (!intervalo && !filmando)
        intervalo = setInterval(() => {
          if (document.hidden) return
          ultimo = ahora()
          oyentes.forEach((o) => o())
        }, 1000)
      return () => {
        oyentes.delete(fn)
        if (!oyentes.size && intervalo) {
          clearInterval(intervalo)
          intervalo = null
        }
      }
    },
  }
}

export function ProveedorDemo({
  empresaInicial,
  filmando = false,
  guardar = true,
  cargando,
  children,
}: {
  empresaInicial: IdEmpresa | null
  filmando?: boolean
  /** false: no lee ni escribe lo guardado del visitante (la escala del sitio no pisa lo que hizo en /demo). */
  guardar?: boolean
  cargando?: React.ReactNode
  children: React.ReactNode
}) {
  const [tienda] = useState<TiendaDemo>(() => crearEstadoDemo(empresaInicial ?? "kiosco", { guardar }))
  const reloj = useMemo(() => crearReloj(filmando), [filmando])
  const [listo, setListo] = useState(false)
  useEffect(() => {
    const t = tienda
    // Se recupera lo guardado y después manda la dirección.
    Promise.resolve(t.persist.rehydrate()).then(() => {
      if (empresaInicial) t.getState().elegirEmpresa(empresaInicial)
      setListo(true)
    })
  }, [empresaInicial, tienda])
  if (!listo) return cargando ?? <div className="dark min-h-dvh bg-negro" aria-busy />
  return <Contexto.Provider value={{ tienda, reloj }}>{children}</Contexto.Provider>
}

function useContexto() {
  const c = useContext(Contexto)
  if (!c) throw new Error("Falta <ProveedorDemo>")
  return c
}

export function useDemo<T>(selector: (s: EstadoDemo) => T): T {
  return useStore(useContexto().tienda, selector)
}

export function useTiendaDemo() {
  return useContexto().tienda
}

/** El momento actual de la demo (ms), redibuja cada segundo. */
export function useAhoraDemo() {
  const { reloj } = useContexto()
  return useSyncExternalStore(reloj.suscribir, reloj.ahora, () => ANCLA_MS)
}

export function useRelojDemo() {
  return useContexto().reloj
}

/** Los datos de una empresa (generados una sola vez por sesión). */
export function useDatosEmpresa(id: IdEmpresa): DatosNegocio {
  return useMemo(() => datosEmpresa(id), [id])
}

export function useConfigEmpresa(id: IdEmpresa) {
  return EMPRESAS[id]
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

/** "Viernes 16 de octubre · 17:32" en hora argentina. */
export function fechaLarga(t: number) {
  const d = new Date(t - 3 * 3600000)
  const dia = DIAS[d.getUTCDay()]
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} · ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

export function horaCorta(t: number) {
  const d = new Date(t - 3 * 3600000)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

/** "hace 12 s", "hace 4 min" respecto del reloj de la demo. */
export function hace(t: number, ahora: number) {
  const s = Math.max(0, Math.round((ahora - t) / 1000))
  if (s < 60) return `hace ${s} s`
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  return `hace ${Math.round(m / 60)} h`
}
