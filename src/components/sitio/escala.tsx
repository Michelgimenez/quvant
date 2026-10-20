"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import gsap from "gsap"
import { ArrowRight, Pause, Play } from "lucide-react"
import { cambiarEmpresa } from "@/components/demo/coreografia"
import { ProveedorDemo, useDemo, useTiendaDemo } from "@/components/demo/contexto"
import { LateralEmpresa } from "@/components/demo/lateral-empresa"
import { TableroComercio } from "@/components/demo/tableros/tablero-comercio"
import { TableroDistribuidora } from "@/components/demo/tableros/tablero-distribuidora"
import { TableroGrupo } from "@/components/demo/tableros/tablero-grupo"
import { TableroKiosco } from "@/components/demo/tableros/tablero-kiosco"
import { datosEmpresa } from "@/demo/datos"
import { EMPRESAS, EMPRESAS_ORDEN, type IdEmpresa } from "@/demo/empresas"
import { cn } from "@/lib/utils"

/**
 * La escala del hero: un control de "kiosco" a "empresa" que transforma en vivo una vista del tablero, en chico.
 * Son los mismos componentes de /demo, con la misma coreografía del cambio de empresa (coreografia.ts): cada paso
 * del control es un salto del punto. La vista se dibuja a 1440 × 852 (como /demo) y se achica con transform: scale.
 * No guarda nada: lo que el visitante hizo en /demo queda intacto.
 */
export const ESCALA_ANCHO = 1440
export const ESCALA_ALTO = 852

const PARADAS: Record<IdEmpresa, string> = { kiosco: "Kiosco", ferreteria: "Comercio", distribuidora: "Distribuidora", grupo: "Empresa" }
/** Cada cuánto avanza sola mientras nadie la toca (segundos). */
const PAUSA_AUTOMATICA = 4.6

const menosMovimiento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function Escala({ quieta }: { quieta: React.ReactNode }) {
  return (
    <ProveedorDemo empresaInicial="kiosco" guardar={false} cargando={quieta}>
      <EscalaViva />
    </ProveedorDemo>
  )
}

function Tablero({ empresa }: { empresa: IdEmpresa }) {
  const nada = () => {}
  if (empresa === "kiosco") return <TableroKiosco onModulo={nada} />
  if (empresa === "ferreteria") return <TableroComercio onModulo={nada} />
  if (empresa === "distribuidora") return <TableroDistribuidora onModulo={nada} />
  return <TableroGrupo onModulo={nada} />
}

function EscalaViva() {
  const empresa = useDemo((s) => s.empresa)
  const tienda = useTiendaDemo()
  const raiz = useRef<HTMLDivElement>(null)
  const marco = useRef<HTMLDivElement>(null)
  const escena = useRef<HTMLDivElement>(null)
  const control = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(0.78)
  const kRef = useRef(k)
  const cambiando = useRef(false)
  const [saltando, setSaltando] = useState(false)
  const [automatica, setAutomatica] = useState(true)
  const [visible, setVisible] = useState(false)
  const indice = EMPRESAS_ORDEN.indexOf(empresa)

  // La vista se achica al ancho disponible.
  useLayoutEffect(() => {
    const el = marco.current
    if (!el) return
    const medir = () => {
      const nuevo = el.clientWidth / ESCALA_ANCHO
      kRef.current = nuevo
      setK(nuevo)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Los datos de las otras empresas se generan de a una cuando el navegador está libre (el cambio no se traba).
  useEffect(() => {
    const ids = EMPRESAS_ORDEN.filter((id) => id !== "kiosco")
    const libre = (fn: () => void) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 400))
    let i = 0
    const siguiente = () => {
      if (i >= ids.length) return
      datosEmpresa(ids[i++])
      libre(siguiente)
    }
    libre(siguiente)
  }, [])

  // Solo avanza sola mientras se ve.
  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const cambiar = useCallback(
    (id: IdEmpresa) => {
      if (cambiando.current) return
      const desde = tienda.getState().empresa
      if (id === desde || !raiz.current || !escena.current) return
      if (menosMovimiento()) {
        tienda.getState().elegirEmpresa(id)
        return
      }
      cambiando.current = true
      setSaltando(true)
      void cambiarEmpresa({
        raiz: raiz.current,
        escena: escena.current,
        desde,
        hacia: id,
        selectorAbierto: true,
        abrirSelector: () => {},
        cerrarSelector: () => {},
        aplicarCambio: () => flushSync(() => tienda.getState().elegirEmpresa(id)),
        escala: kRef.current,
      }).finally(() => {
        cambiando.current = false
        setSaltando(false)
      })
    },
    [tienda],
  )

  // El recorrido solo: un paso cada PAUSA_AUTOMATICA segundos, con el reloj de GSAP. Se corta al tocar el control.
  useEffect(() => {
    if (!automatica || !visible || menosMovimiento()) return
    const llamada = gsap.delayedCall(PAUSA_AUTOMATICA, () => cambiar(EMPRESAS_ORDEN[(indice + 1) % EMPRESAS_ORDEN.length]))
    return () => {
      llamada.kill()
    }
  }, [automatica, visible, indice, cambiar])

  const elegirEnX = (x: number) => {
    const r = control.current?.getBoundingClientRect()
    if (!r) return
    const i = Math.max(0, Math.min(EMPRESAS_ORDEN.length - 1, Math.floor(((x - r.left) / r.width) * EMPRESAS_ORDEN.length)))
    setAutomatica(false)
    cambiar(EMPRESAS_ORDEN[i])
  }

  const alTeclear = (e: React.KeyboardEvent) => {
    const destino = e.key === "ArrowRight" || e.key === "ArrowUp" ? indice + 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? indice - 1 : e.key === "Home" ? 0 : e.key === "End" ? EMPRESAS_ORDEN.length - 1 : null
    if (destino === null) return
    e.preventDefault()
    setAutomatica(false)
    cambiar(EMPRESAS_ORDEN[Math.max(0, Math.min(EMPRESAS_ORDEN.length - 1, destino))])
  }

  const cfg = EMPRESAS[empresa]
  return (
    <div ref={raiz} className="space-y-5" data-escala>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="t-etiqueta text-acero">La escala · el mismo Quvant en cuatro negocios</p>
        <button type="button" onClick={() => setAutomatica((v) => !v)} className="t-etiqueta inline-flex items-center gap-1.5 text-acero transition-colors hover:text-blanco" aria-pressed={automatica}>
          {automatica ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {automatica ? "Pausar el recorrido" : "Recorrer solo"}
        </button>
      </div>

      {/* El control: cuatro paradas sobre una línea. El punto es el cursor. */}
      <div
        ref={control}
        role="slider"
        tabIndex={0}
        aria-label="Tamaño del negocio"
        aria-valuemin={1}
        aria-valuemax={EMPRESAS_ORDEN.length}
        aria-valuenow={indice + 1}
        aria-valuetext={`${PARADAS[empresa]}: ${cfg.nombre}, ${cfg.escalaTexto}`}
        onKeyDown={alTeclear}
        onPointerDown={(e) => elegirEnX(e.clientX)}
        className="relative grid cursor-pointer touch-none select-none grid-cols-4 outline-none focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-gris-7"
        data-testid="escala-control"
      >
        <span className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[7px] h-px bg-gris-4" aria-hidden />
        {EMPRESAS_ORDEN.map((id, i) => {
          const activa = id === empresa
          return (
            <span key={id} className="relative flex flex-col items-center gap-3 pb-1" data-parada={id}>
              <span className="relative flex size-[15px] items-center justify-center" data-punto-empresa={id} aria-hidden>
                <span className={cn("block size-[6px] bg-gris-6", i < indice && "bg-gris-8")} />
                {activa && <span className={cn("absolute block size-[11px] bg-blanco", saltando && "opacity-0")} />}
              </span>
              <span className={cn("t-etiqueta transition-colors", activa ? "text-blanco" : "text-acero")}>{PARADAS[id]}</span>
              <span className={cn("t-dato hidden sm:block", activa ? "text-acero" : "text-gris-6")}>{EMPRESAS[id].escalaTexto}</span>
            </span>
          )
        })}
      </div>

      {/* La vista del tablero, en chico. Es una representación: no se puede tocar (inert). */}
      <div ref={marco} className="relative w-full overflow-hidden rounded-lg border border-gris-3 bg-background" style={{ aspectRatio: `${ESCALA_ANCHO} / ${ESCALA_ALTO}` }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: ESCALA_ANCHO, height: ESCALA_ALTO, transform: `scale(${k})` }} inert aria-hidden>
          <div className="relative flex h-full">
            <div
              ref={escena}
              className="flex h-full min-h-0 flex-1 bg-background"
              data-escena-empresa
              style={{ "--marca": cfg.color, "--serie-1": cfg.color, "--chart-1": cfg.color } as React.CSSProperties}
            >
              <LateralEmpresa empresa={empresa} modulo="tablero" onModulo={() => {}} />
              <main className="min-w-0 flex-1 overflow-hidden px-8 pb-10 pt-6">
                <Tablero empresa={empresa} />
              </main>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-texto-sm text-acero" aria-live="polite">
          <span className="text-blanco">{cfg.nombre}</span> · {cfg.tamano}. Empresa ficticia, datos de demostración.
        </p>
        <Link href={`/demo?empresa=${empresa}`} prefetch={false} className="t-texto-sm inline-flex items-center gap-1.5 text-blanco underline-offset-4 hover:underline">
          Abrir esta empresa en la demo <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
