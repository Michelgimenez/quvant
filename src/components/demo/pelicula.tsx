"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import gsap from "gsap"
import { TextoConfig } from "@/components/base/sellos"
import { BAJADA, Logotipo } from "@/components/marca/quvant"
import { IsotipoAnimado } from "@/components/marca/isotipo-animado"
import { SITIO } from "@/config/sitio"
import type { IdEmpresa, ModuloDemo } from "@/demo/empresas"
import { ANCLA_MS } from "@/demo/generar"
import { FORMATO_DE, GUIONES, separarTestid, tiemposPelicula, type IdVideo } from "@/demo/peliculas"
import { cn } from "@/lib/utils"
import { useRelojDemo } from "./contexto"

/**
 * Un video de la demo (/videos/<id>): una sola línea de tiempo de GSAP que maneja la demo real (cambios de empresa,
 * módulos y clics en sus botones), los subtítulos y las pantallas de marca (la firma que se arma, "Probá la demo" y
 * el cierre). Las pantallas y los subtítulos van en un portal a la capa del escenario, sin achicar.
 * Con ?film=1 la línea de tiempo la mueve quien filma, cuadro por cuadro (ver src/app/videos).
 */
export function Pelicula({
  video,
  capa,
  onCambiarEmpresa,
  onModulo,
  alListo,
}: {
  video: IdVideo
  /** La capa del escenario donde van las pantallas y los subtítulos (sin achicar). */
  capa: HTMLElement | null
  onCambiarEmpresa: (id: IdEmpresa) => void
  onModulo: (m: ModuloDemo) => void
  alListo?: (tl: gsap.core.Timeline) => void
}) {
  const guion = GUIONES[video]
  const vertical = FORMATO_DE[video] === "vertical"
  const reloj = useRelojDemo()
  const [paso, setPaso] = useState(0)
  const firma = useRef<HTMLDivElement>(null)
  const logotipo = useRef<HTMLDivElement>(null)
  const bajada = useRef<HTMLParagraphElement>(null)
  const probala = useRef<HTMLDivElement>(null)
  const cierre = useRef<HTMLDivElement>(null)
  const cierreMarca = useRef<HTMLParagraphElement>(null)
  const cierreBajada = useRef<HTMLParagraphElement>(null)
  const subtitulo = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onCambiarEmpresa, onModulo, alListo })
  useEffect(() => {
    callbacks.current = { onCambiarEmpresa, onModulo, alListo }
  })

  useLayoutEffect(() => {
    if (!capa) return
    const tiempos = tiemposPelicula(guion.pasos, "kiosco")
    const tl = gsap.timeline({ onUpdate: () => guion.relojVivo && reloj.fijar(ANCLA_MS + Math.round(tl.time() * 1000)) })
    const clic = (x: string) => {
      const { testid, n } = separarTestid(x)
      ;(document.querySelectorAll(`[data-testid="${testid}"]`)[n] as HTMLElement | undefined)?.click()
    }
    guion.pasos.forEach((p, i) => {
      const { inicio, cambia, contenido } = tiempos[i]
      const fin = contenido + p.duracion
      tl.add(() => setPaso(i), inicio)
      if (cambia && p.empresa) tl.add(() => callbacks.current.onCambiarEmpresa(p.empresa!), inicio)
      if (p.modulo) tl.add(() => callbacks.current.onModulo(p.modulo!), cambia ? contenido : inicio)
      for (const a of p.acciones ?? []) tl.add(() => clic(a.testid), contenido + a.en)
      if (guion.subtitulos && p.texto) {
        tl.fromTo(subtitulo.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, contenido + 0.15)
        tl.to(subtitulo.current, { opacity: 0, duration: 0.3, ease: "power1.in" }, fin - 0.35)
      }
      if (p.pantalla === "firma") {
        // La firma se arma: la Q (que se dibuja sola), el logotipo que aparece de izquierda a derecha y la bajada.
        tl.fromTo(logotipo.current, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.inOut" }, 1.7)
        tl.fromTo(bajada.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 2.7)
        tl.to(firma.current, { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" }, fin - 0.6)
      }
      if (p.pantalla === "probala") {
        tl.fromTo(probala.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power2.inOut", immediateRender: false }, inicio)
        tl.fromTo(probala.current?.querySelectorAll("[data-entra]") ?? [], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.25, ease: "power3.out", immediateRender: false }, inicio + 0.3)
      }
      if (p.pantalla === "cierre") {
        // El cierre del manual: «Quvant.», una pausa breve y la bajada. Es lo último que se ve.
        tl.fromTo(cierre.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power2.inOut", immediateRender: false }, inicio)
        tl.fromTo(cierreMarca.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", immediateRender: false }, inicio + 0.6)
        tl.fromTo(cierreBajada.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", immediateRender: false }, inicio + 2.3)
      }
    })
    const total = tiempos.at(-1)!.contenido + guion.pasos.at(-1)!.duracion
    tl.set({}, {}, total)
    callbacks.current.alListo?.(tl)
    return () => {
      tl.kill()
    }
  }, [capa, guion, reloj])

  if (!capa) return null
  const actual = guion.pasos[paso]
  const conFirma = guion.pasos[0]?.pantalla === "firma"
  return createPortal(
    <>
      {conFirma && (
        <div ref={firma} className="absolute inset-0 z-[90] flex items-center justify-center bg-negro" data-pantalla="firma">
          <div className="grilla-puntos absolute inset-0" style={{ "--grilla-paso": "40px" } as React.CSSProperties} aria-hidden />
          <div className={cn("relative flex flex-col items-center", vertical ? "gap-12" : "gap-10")}>
            <IsotipoAnimado lado={vertical ? 300 : 260} duracion={1.6} demora={0.2} />
            <div ref={logotipo} style={{ clipPath: "inset(0% 100% 0% 0%)" }}>
              <Logotipo version="principal" className={vertical ? "h-[64px]" : "h-[58px]"} />
            </div>
            <p ref={bajada} className={cn("font-sans text-blanco/90", vertical ? "text-[40px]" : "text-[30px]")} style={{ opacity: 0 }}>
              {BAJADA}
            </p>
          </div>
        </div>
      )}
      <div ref={probala} className="invisible absolute inset-0 z-[91] flex items-center justify-center bg-negro opacity-0" data-pantalla="probala">
        <div className="grilla-puntos absolute inset-0" style={{ "--grilla-paso": "40px" } as React.CSSProperties} aria-hidden />
        <div className={cn("relative text-center", vertical ? "space-y-10 px-16" : "space-y-8")}>
          <p data-entra className={cn("font-sans font-bold tracking-[-0.03em] text-blanco", vertical ? "text-[104px] leading-[1.05]" : "text-[110px] leading-none")}>
            Probá la demo.
          </p>
          <p data-entra className={cn("font-sans text-acero", vertical ? "text-[44px]" : "text-[40px]")}>
            Cuatro negocios, un solo Quvant.
          </p>
          <p data-entra className={cn("font-sans text-blanco", vertical ? "text-[44px]" : "text-[44px]")}>
            <TextoConfig texto={SITIO.dominio} />
            /demo
          </p>
        </div>
      </div>
      <div ref={cierre} className="invisible absolute inset-0 z-[92] flex items-center justify-center bg-negro opacity-0" data-pantalla="cierre">
        <div className="grilla-puntos absolute inset-0" style={{ "--grilla-paso": "40px" } as React.CSSProperties} aria-hidden />
        <div className="relative space-y-8 px-16 text-center">
          <p ref={cierreMarca} className={cn("font-sans font-bold tracking-[-0.03em] text-blanco", vertical ? "text-[150px]" : "text-[150px]")} style={{ opacity: 0 }}>
            Quvant.
          </p>
          <p ref={cierreBajada} className={cn("font-sans text-blanco", vertical ? "text-[52px] leading-tight" : "text-[52px]")} style={{ opacity: 0 }}>
            {BAJADA}
          </p>
        </div>
      </div>
      {guion.subtitulos && (
        <div
          ref={subtitulo}
          className={cn(
            "absolute z-[80] font-sans text-blanco",
            vertical
              ? "inset-x-[60px] top-[1210px] text-center text-[50px] font-semibold leading-[1.18] text-balance"
              : "bottom-[44px] left-[330px] max-w-[1180px] border border-gris-4 bg-negro/95 px-8 py-6 text-[36px] font-semibold leading-[1.25]",
          )}
          style={{ opacity: 0 }}
          aria-live="polite"
          data-subtitulo
        >
          {actual?.texto}
        </div>
      )}
    </>,
    capa,
  )
}
