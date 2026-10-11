"use client"

import { useEffect, useRef } from "react"
import type { EventoForja, RedForja } from "@/forja/dominio/modelo"
import { titulares } from "@/forja/dominio/repeticion"

/** Como mucho un anuncio cada 8 s: que informe sin tapar al lector de pantalla. */
const PAUSA_ANUNCIOS = 8000

/**
 * Región en vivo para lectores de pantalla: anuncia lo importante que pasa
 * mientras se mira Forja (quiebres de stock, llegadas, equipos listos, ventas
 * grandes). No anuncia lo que ya estaba al entrar ni la repetición del día.
 */
export function AnunciosVivos({ eventos, red, activo }: { eventos: EventoForja[]; red: RedForja; activo: boolean }) {
  const region = useRef<HTMLParagraphElement>(null)
  const vistos = useRef<Set<string> | null>(null)
  // El primer anuncio sale siempre; los siguientes, con pausa
  const ultimo = useRef(-Infinity)
  useEffect(() => {
    if (!vistos.current) {
      vistos.current = new Set(eventos.map((e) => e.id))
      return
    }
    const nuevos = eventos.filter((e) => !vistos.current!.has(e.id))
    for (const e of nuevos) vistos.current.add(e.id)
    if (!activo || !nuevos.length || !region.current) return
    const t = titulares(nuevos, red).find((x) => x.tono !== "info")
    if (!t || performance.now() - ultimo.current < PAUSA_ANUNCIOS) return
    ultimo.current = performance.now()
    region.current.textContent = t.texto
  }, [eventos, red, activo])
  return <p ref={region} className="sr-only" role="status" aria-live="polite" data-testid="anuncios-vivos" />
}
