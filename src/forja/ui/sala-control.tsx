"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { formatoPesosCorto } from "@/dominio/dinero"
import type { Id } from "@/dominio/tipos"
import { colorCalor, nombreCalor } from "@/forja/dominio/calor"
import type { EventoForja, NodoForja, RedForja } from "@/forja/dominio/modelo"
import { SEGUNDOS_POR_PARADA, recorridoSala, titulares, type Titular } from "@/forja/dominio/repeticion"
import { cn } from "@/lib/utils"
import { hora } from "./formato"
import type { ControlRed } from "./red/universo-red"

const reducirMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Modo sala de control, para una TV en la oficina: recorre la red completa y
 * cada sucursal cada 20 s, con los números grandes y los eventos importantes
 * del día como titulares.
 */
export function SalaControl({ red, eventos, control }: { red: RedForja; eventos: EventoForja[]; control: React.RefObject<ControlRed | null> }) {
  const paradas = useMemo(() => recorridoSala(red), [red])
  const clave = paradas.join(",")
  const [indice, setIndice] = useState(0)
  const actual = paradas[indice % paradas.length] ?? null
  const siguiente = paradas[(indice + 1) % paradas.length] ?? null
  const lista = useMemo(() => titulares(eventos, red).slice(0, 5), [eventos, red])
  const nodo = red.nodos.find((n) => n.id === actual) ?? null
  const nombre = (id: Id | null) => (id === null ? "Toda la red" : (red.nodos.find((n) => n.id === id)?.nombre ?? "—"))

  // Una parada cada 20 s; el recorrido vuelve a empezar si cambian las sucursales
  useEffect(() => {
    const id = window.setInterval(() => setIndice((i) => i + 1), SEGUNDOS_POR_PARADA * 1000)
    return () => window.clearInterval(id)
  }, [clave])

  // Cámara: la red entera o la sucursal, con un vuelo suave (sin animación si se pide movimiento reducido)
  const primera = useRef(true)
  useEffect(() => {
    const duracion = reducirMovimiento() ? 0 : primera.current ? 1800 : 3200
    primera.current = false
    // La red entera, en el espacio que dejan libre la tarjeta (abajo a la izquierda) y los titulares (a la derecha)
    if (actual === null) {
      const ancho = window.innerWidth
      const titulares = ancho >= 1024 ? Math.min(520, ancho * 0.4) + 48 : 60
      void control.current?.encuadrar(duracion, { top: 90, bottom: 300, left: 90, right: titulares })
    } else {
      void control.current?.volarA(actual, duracion, { zoom: 13.4, pitch: 56 })
    }
  }, [actual, control])

  return (
    <div className="pointer-events-none absolute inset-0 z-20" data-testid="sala-control" data-parada={actual ?? "red"}>
      {/* Avance de la parada: una línea que se completa en 20 s (solo transform) */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-white/5 motion-reduce:hidden" aria-hidden>
        <div key={indice} className="h-full origin-left bg-blanco/70" style={{ animation: `forja-parada ${SEGUNDOS_POR_PARADA}s linear forwards` }} />
      </div>

      <section className="absolute bottom-6 left-6 w-[min(560px,calc(100%-3rem))] rounded-2xl border border-white/10 bg-negro/85 p-6 backdrop-blur" aria-live="polite" aria-label="Parada actual">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-acero">
          {indice % paradas.length === 0 ? "Red completa" : `Sucursal ${indice % paradas.length} de ${paradas.length - 1}`} · próxima: {nombre(siguiente)}
        </p>
        <h2 className="mt-1 flex items-center gap-3 font-heading text-4xl font-extrabold tracking-tight" data-testid="sala-parada">
          {nodo && <span className="size-4 rounded-full" style={{ background: colorCalor(nodo.calor) }} aria-hidden />}
          {nombre(actual)}
          {nodo?.demo && <span className="rounded-[4px] border border-dashed border-alerta/80 px-1.5 font-mono text-xs font-bold text-alerta">DEMO</span>}
        </h2>
        {nodo ? <NumerosSucursal n={nodo} /> : <NumerosRed red={red} />}
      </section>

      <section className="absolute bottom-6 right-6 hidden w-[min(520px,40%)] lg:block" aria-label="Titulares del día">
        <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-acero">Lo importante de hoy</h2>
        <ol className="space-y-2">
          {lista.map((t, i) => (
            <FilaTitular key={t.id} t={t} principal={i === 0} />
          ))}
          {!lista.length && <li className="text-sm text-acero">Todavía no pasó nada importante hoy.</li>}
        </ol>
      </section>
    </div>
  )
}

function FilaTitular({ t, principal }: { t: Titular; principal: boolean }) {
  return (
    <li
      className={cn("flex gap-3 rounded-xl border border-white/10 bg-negro/85 backdrop-blur motion-safe:animate-[forja-titular_0.6s_ease-out]", principal ? "p-4" : "px-4 py-2.5 opacity-80")}
      data-testid="titular"
    >
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", t.tono === "alerta" ? "bg-alerta" : t.tono === "logro" ? "bg-blanco-caliente" : "bg-acero")} aria-hidden />
      <div className="min-w-0">
        <p className="font-mono text-[11px] text-acero">{hora(t.en)}</p>
        <p className={cn("text-blanco", principal ? "text-xl font-semibold leading-snug" : "text-sm")}>{t.texto}</p>
      </div>
    </li>
  )
}

function Numero({ etiqueta, valor, alerta }: { etiqueta: string; valor: React.ReactNode; alerta?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wider text-acero">{etiqueta}</dt>
      <dd className={cn("mt-0.5 font-mono text-3xl", alerta ? "text-alerta" : "text-blanco")}>{valor}</dd>
    </div>
  )
}

function NumerosSucursal({ n }: { n: NodoForja }) {
  const ordenes = Object.entries(n.ordenes).reduce((a, [, c]) => a + (c ?? 0), 0)
  return (
    <dl className="mt-5 grid grid-cols-3 gap-x-6 gap-y-4">
      <Numero etiqueta="Ventas hoy" valor={n.ventasHoy} />
      <Numero etiqueta="Facturado" valor={formatoPesosCorto(n.importeHoy)} />
      <Numero etiqueta="Calor" valor={<span className="font-heading text-2xl font-bold">{nombreCalor(n.calor)}</span>} />
      <Numero etiqueta="Stock crítico" valor={n.stockCritico + n.sinStock} alerta={n.sinStock > 0} />
      <Numero etiqueta="Presupuestos" valor={n.presupuestosAbiertos} />
      <Numero etiqueta="En servicio" valor={ordenes} />
    </dl>
  )
}

function NumerosRed({ red }: { red: RedForja }) {
  const suma = (f: (n: NodoForja) => number) => red.nodos.reduce((a, n) => a + f(n), 0)
  return (
    <dl className="mt-5 grid grid-cols-3 gap-x-6 gap-y-4">
      <Numero etiqueta="Ventas hoy" valor={suma((n) => n.ventasHoy)} />
      <Numero etiqueta="Facturado" valor={formatoPesosCorto(suma((n) => n.importeHoy))} />
      <Numero etiqueta="En tránsito" valor={red.transferencias.filter((t) => t.estado === "en_transito").length} />
      <Numero etiqueta="Stock crítico" valor={suma((n) => n.stockCritico + n.sinStock)} alerta={suma((n) => n.sinStock) > 0} />
      <Numero etiqueta="Presupuestos" valor={suma((n) => n.presupuestosAbiertos)} />
      <Numero etiqueta="Sin sincronizar" valor={suma((n) => n.colaSinConexion)} />
    </dl>
  )
}
