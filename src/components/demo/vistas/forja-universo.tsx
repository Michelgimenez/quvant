"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { fuenteForjaDemo, type IdForjaDemo } from "@/demo/forja-demo"
import { Universo, type ActivacionUniverso } from "@/forja/ui/universo"
import { useRelojDemo } from "../contexto"

/** Las empresas que ya vieron la activación en esta visita (no se repite al volver al módulo). */
const vistas = new Set<IdForjaDemo>()

/** Cada cuánto se rearma la red con el reloj de la demo (el calor depende de la última hora). */
const CADA = 15_000

/**
 * El universo de Forja con los datos de la demo (src/demo/forja-demo.ts): sin base ni Realtime, con el sello
 * SIMULACIÓN. La primera vez que se abre en la visita, con la activación (la Q, el salto y el mapa).
 */
export function ForjaUniversoDemo({ empresa }: { empresa: IdForjaDemo }) {
  const reloj = useRelojDemo()
  // El reloj de la demo, de a pasos de 15 s: entre paso y paso, Forja no vuelve a pintar.
  const paso = useSyncExternalStore(
    reloj.suscribir,
    () => Math.floor(reloj.ahora() / CADA) * CADA,
    () => Math.floor(reloj.ahora() / CADA) * CADA,
  )
  // La escena vive a la hora de la demo (el viernes a la tarde): la diferencia con el reloj real, una sola vez.
  const [desfase] = useState(() => reloj.ahora() - Date.now())
  const fuente = useMemo(() => fuenteForjaDemo(empresa, paso, paso - desfase), [empresa, paso, desfase])
  const [activacion] = useState<ActivacionUniverso | null>(() => (vistas.has(empresa) ? null : { alTerminar: () => vistas.add(empresa) }))
  return <Universo fuente={fuente} activacion={activacion} />
}
