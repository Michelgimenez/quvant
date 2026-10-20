"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import gsap from "gsap"
import { Toaster } from "@/components/ui/sonner"
import { CapaSaltos } from "@/components/marca/salto"
import { EMPRESAS, EMPRESAS_ORDEN, type IdEmpresa, type ModuloDemo } from "@/demo/empresas"
import { cn } from "@/lib/utils"
import { BarraDemo } from "./barra-demo"
import { cambiarEmpresa } from "./coreografia"
import { ProveedorDemo, useDemo, useTiendaDemo } from "./contexto"
import { LateralEmpresa } from "./lateral-empresa"
import { SelectorEmpresas } from "./selector-empresas"
import { TableroComercio } from "./tableros/tablero-comercio"
import { TableroDistribuidora } from "./tableros/tablero-distribuidora"
import { TableroGrupo } from "./tableros/tablero-grupo"
import { TableroKiosco } from "./tableros/tablero-kiosco"
import { VistaClientes, VistaModuloGenerica, VistaProductos } from "./vistas/vista-modulo"
import { CajaKiosco, FiadoKiosco, MostradorKiosco, ProveedoresKiosco } from "./vistas/kiosco"
import { PresupuestosFerreteria, ServicioFerreteria, TransferenciasFerreteria } from "./vistas/ferreteria"
import { VistaPrecios } from "./vistas/precios"
import { ForjaDemo } from "./vistas/forja-demo"
import { CobranzasDistribuidora, PreventaDistribuidora, RepartoDistribuidora } from "./vistas/distribuidora"
import { AprobacionesGrupo, AuditoriaGrupo, ComparacionGrupo, IntegracionesGrupo, PermisosGrupo, SucursalesGrupo } from "./vistas/grupo"
import { Recorrido } from "./recorrido"
import { Pelicula } from "./pelicula"
import type { IdVideo } from "@/demo/peliculas"

/**
 * La demo que cambia de empresa (/demo): pública, sin login y sin tocar la base. El mismo Quvant en un kiosco,
 * una ferretería, una distribuidora y un grupo de 40 sucursales. La empresa elegida queda en la dirección
 * (/demo?empresa=kiosco) con history.replaceState, sin navegar.
 */
export function DemoQuvant({
  empresaInicial,
  filmando = false,
  recorrido = false,
  pelicula,
  capaVideo = null,
  alListo,
}: {
  empresaInicial: IdEmpresa | null
  filmando?: boolean
  recorrido?: boolean
  /** Un video (/videos/<id>): la demo la maneja su guion y no guarda nada del visitante. */
  pelicula?: IdVideo
  /** La capa del escenario del video (pantallas y subtítulos). */
  capaVideo?: HTMLElement | null
  alListo?: (tl: gsap.core.Timeline) => void
}) {
  useEffect(() => {
    // En los videos, la filmación la prepara la página del video.
    if (!filmando || pelicula) return
    // Modo filmación (?film=1): el reloj global de GSAP se pausa y lo mueve quien filma, solo hacia adelante.
    const w = window as unknown as { __gsap?: typeof gsap; __seek?: (t: number) => void; __ready?: boolean }
    gsap.globalTimeline.pause()
    w.__gsap = gsap
    w.__seek = (t: number) => {
      gsap.globalTimeline.pause()
      gsap.globalTimeline.totalTime(t)
    }
    w.__ready = true
  }, [filmando, pelicula])
  return (
    <ProveedorDemo empresaInicial={empresaInicial} filmando={filmando} guardar={!pelicula}>
      <AppDemo filmando={filmando} recorridoInicial={recorrido} pelicula={pelicula} capaVideo={capaVideo} alListo={alListo} />
    </ProveedorDemo>
  )
}

/** Las teclas 1 a 4 no cambian de empresa si el foco está en un campo o en un mostrador que usa el teclado como lector. */
function tecladoLibre() {
  const a = document.activeElement as HTMLElement | null
  if (a && (a.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(a.tagName))) return false
  return !document.querySelector("[data-lector-activo]")
}

function AppDemo({
  filmando,
  recorridoInicial,
  pelicula,
  capaVideo,
  alListo,
}: {
  filmando: boolean
  recorridoInicial: boolean
  pelicula?: IdVideo
  capaVideo: HTMLElement | null
  alListo?: (tl: gsap.core.Timeline) => void
}) {
  const empresa = useDemo((s) => s.empresa)
  const tienda = useTiendaDemo()
  const [modulo, setModulo] = useState<ModuloDemo>("tablero")
  const [selector, setSelector] = useState(false)
  const [recorrido, setRecorrido] = useState(recorridoInicial)
  const escena = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const cambiando = useRef(false)

  // La dirección refleja la empresa elegida (sin navegar). En los videos, no.
  useEffect(() => {
    if (pelicula) return
    const u = new URL(window.location.href)
    if (u.searchParams.get("empresa") !== empresa) {
      u.searchParams.set("empresa", empresa)
      window.history.replaceState(window.history.state, "", u)
    }
  }, [empresa, pelicula])

  // El selector se abre y se cierra con GSAP (un solo reloj de animación). El estado inicial se fija sin animar.
  const primeraVez = useRef(true)
  useLayoutEffect(() => {
    const el = selectorRef.current?.querySelector<HTMLElement>("[data-selector]")
    if (!el) return
    // Arranca oculto por CSS (invisible, opacity-0): la primera vez no hay nada que animar.
    if (primeraVez.current) {
      primeraVez.current = false
      if (!selector) return
    }
    gsap.to(el, { autoAlpha: selector ? 1 : 0, yPercent: selector ? 0 : -6, duration: selector ? 0.26 : 0.22, ease: selector ? "power3.out" : "power2.in", overwrite: "auto" })
  }, [selector])

  const raiz = useRef<HTMLDivElement>(null)
  const recorridoActivo = useRef(recorrido)
  useEffect(() => {
    recorridoActivo.current = recorrido
  }, [recorrido])
  const selectorAbierto = useRef(selector)
  useEffect(() => {
    selectorAbierto.current = selector
  }, [selector])

  /** El cambio de empresa: la coreografía del salto, los logos, el barrido, Flip y los números (coreografia.ts). */
  const cambiar = useCallback(
    (id: IdEmpresa) => {
      if (cambiando.current) return
      const desde = tienda.getState().empresa
      if (id === desde) {
        setSelector(false)
        return
      }
      if (!raiz.current || !escena.current) return
      cambiando.current = true
      void cambiarEmpresa({
        raiz: raiz.current,
        escena: escena.current,
        desde,
        hacia: id,
        selectorAbierto: selectorAbierto.current,
        abrirSelector: () => setSelector(true),
        cerrarSelector: () => setSelector(false),
        aplicarCambio: () =>
          flushSync(() => {
            tienda.getState().elegirEmpresa(id)
            setModulo("tablero")
          }),
        // Si la demo se ve achicada o agrandada (un video, un escenario), la coreografía corrige sus medidas.
        escala: escena.current.getBoundingClientRect().width / (escena.current.offsetWidth || 1),
      }).finally(() => (cambiando.current = false))
    },
    [tienda],
  )

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault()
        setSelector((v) => !v)
        return
      }
      if (e.key === "Escape") setSelector(false)
      if (e.metaKey || e.ctrlKey || e.altKey || !tecladoLibre() || recorridoActivo.current) return
      const n = Number(e.key)
      if (n >= 1 && n <= 4) {
        e.preventDefault()
        cambiar(EMPRESAS_ORDEN[n - 1])
      }
    }
    window.addEventListener("keydown", alTeclear)
    return () => window.removeEventListener("keydown", alTeclear)
  }, [cambiar])

  const reiniciar = () => {
    if (!window.confirm("¿Reiniciar la demo? Se borra lo que hiciste en este navegador (ventas, fiados, caja).")) return
    tienda.getState().reiniciar()
    setModulo("tablero")
  }

  return (
    <div ref={raiz} className={cn("dark flex flex-col overflow-hidden bg-background text-foreground", pelicula ? "h-full" : "h-dvh")} data-demo data-empresa={empresa} data-filmando={filmando || undefined}>
      <BarraDemo empresa={empresa} selectorAbierto={selector} onSelector={() => setSelector((v) => !v)} onRecorrido={() => setRecorrido((v) => !v)} onReiniciar={reiniciar} recorridoActivo={recorrido} video={Boolean(pelicula)} />
      <div className="relative flex min-h-0 flex-1">
        <div ref={selectorRef} className="pointer-events-none absolute inset-x-0 top-0 z-30 [&>[data-abierto]]:pointer-events-auto">
          <SelectorEmpresas empresa={empresa} abierto={selector} onElegir={cambiar} />
        </div>
        <div
          ref={escena}
          className="flex min-h-0 flex-1 bg-background"
          data-escena-empresa
          style={{ "--marca": EMPRESAS[empresa].color, "--serie-1": EMPRESAS[empresa].color, "--chart-1": EMPRESAS[empresa].color } as React.CSSProperties}
        >
          <LateralEmpresa empresa={empresa} modulo={modulo} onModulo={setModulo} />
          <main className={cn("min-w-0 flex-1", modulo === "forja" ? "overflow-hidden" : "overflow-y-auto px-8 pb-10 pt-6")} id="contenido">
            <Vista empresa={empresa} modulo={modulo} onModulo={setModulo} />
          </main>
        </div>
      </div>
      {recorrido && !pelicula && <Recorrido empresaActual={empresa} onCambiarEmpresa={cambiar} onModulo={setModulo} onSalir={() => setRecorrido(false)} filmando={filmando} />}
      {pelicula && <Pelicula video={pelicula} capa={capaVideo} onCambiarEmpresa={cambiar} onModulo={setModulo} alListo={alListo} />}
      <CapaSaltos />
      {!pelicula && <Toaster position="bottom-right" />}
    </div>
  )
}

function Vista({ empresa, modulo, onModulo }: { empresa: IdEmpresa; modulo: ModuloDemo; onModulo: (m: ModuloDemo) => void }) {
  if (!EMPRESAS[empresa].modulos[modulo]) return null
  if (modulo === "tablero") {
    if (empresa === "kiosco") return <TableroKiosco onModulo={onModulo} />
    if (empresa === "ferreteria") return <TableroComercio onModulo={onModulo} />
    if (empresa === "distribuidora") return <TableroDistribuidora onModulo={onModulo} />
    return <TableroGrupo onModulo={onModulo} />
  }
  if (empresa === "kiosco") {
    if (modulo === "mostrador") return <MostradorKiosco />
    if (modulo === "caja") return <CajaKiosco />
    if (modulo === "fiado") return <FiadoKiosco />
    if (modulo === "proveedores") return <ProveedoresKiosco />
  }
  if (empresa === "ferreteria") {
    if (modulo === "presupuestos") return <PresupuestosFerreteria />
    if (modulo === "transferencias") return <TransferenciasFerreteria />
    if (modulo === "servicio") return <ServicioFerreteria />
  }
  if (empresa === "distribuidora") {
    if (modulo === "preventa") return <PreventaDistribuidora />
    if (modulo === "reparto") return <RepartoDistribuidora />
    if (modulo === "cobranzas") return <CobranzasDistribuidora />
  }
  // Forja, con los datos de la demo (el grupo y la distribuidora la tienen en su barra lateral).
  if (modulo === "forja" && (empresa === "grupo" || empresa === "distribuidora")) return <ForjaDemo empresa={empresa} />
  if (empresa === "grupo") {
    if (modulo === "sucursales") return <SucursalesGrupo />
    if (modulo === "comparacion") return <ComparacionGrupo />
    if (modulo === "aprobaciones") return <AprobacionesGrupo />
    if (modulo === "auditoria") return <AuditoriaGrupo />
    if (modulo === "permisos") return <PermisosGrupo />
    if (modulo === "integraciones") return <IntegracionesGrupo />
  }
  if (modulo === "precios") return <VistaPrecios empresa={empresa} />
  if (modulo === "inventario") return <VistaProductos empresa={empresa} modulo={modulo} />
  if (modulo === "clientes" || modulo === "fiado" || modulo === "cobranzas") return <VistaClientes empresa={empresa} modulo={modulo} />
  return <VistaModuloGenerica empresa={empresa} modulo={modulo} />
}
