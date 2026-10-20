"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import gsap from "gsap"
import { Toaster } from "@/components/ui/sonner"
import { CapaSaltos } from "@/components/marca/salto"
import { EMPRESAS, EMPRESAS_ORDEN, type IdEmpresa, type ModuloDemo } from "@/demo/empresas"
import { BarraDemo } from "./barra-demo"
import { ProveedorDemo, useDemo, useTiendaDemo } from "./contexto"
import { LateralEmpresa } from "./lateral-empresa"
import { SelectorEmpresas } from "./selector-empresas"
import { TableroComercio } from "./tableros/tablero-comercio"
import { TableroDistribuidora } from "./tableros/tablero-distribuidora"
import { TableroGrupo } from "./tableros/tablero-grupo"
import { TableroKiosco } from "./tableros/tablero-kiosco"
import { VistaClientes, VistaModuloGenerica, VistaProductos } from "./vistas/vista-modulo"

/**
 * La demo que cambia de empresa (/demo): pública, sin login y sin tocar la base. El mismo Quvant en un kiosco,
 * una ferretería, una distribuidora y un grupo de 40 sucursales. La empresa elegida queda en la dirección
 * (/demo?empresa=kiosco) con history.replaceState, sin navegar.
 */
export function DemoQuvant({ empresaInicial, filmando = false }: { empresaInicial: IdEmpresa | null; filmando?: boolean }) {
  return (
    <ProveedorDemo empresaInicial={empresaInicial} filmando={filmando}>
      <AppDemo />
    </ProveedorDemo>
  )
}

/** Las teclas 1 a 4 no cambian de empresa si el foco está en un campo o en un mostrador que usa el teclado como lector. */
function tecladoLibre() {
  const a = document.activeElement as HTMLElement | null
  if (a && (a.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(a.tagName))) return false
  return !document.querySelector("[data-lector-activo]")
}

function AppDemo() {
  const empresa = useDemo((s) => s.empresa)
  const tienda = useTiendaDemo()
  const [modulo, setModulo] = useState<ModuloDemo>("tablero")
  const [selector, setSelector] = useState(false)
  const escena = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const cambiando = useRef(false)

  // La dirección refleja la empresa elegida (sin navegar).
  useEffect(() => {
    const u = new URL(window.location.href)
    if (u.searchParams.get("empresa") !== empresa) {
      u.searchParams.set("empresa", empresa)
      window.history.replaceState(window.history.state, "", u)
    }
  }, [empresa])

  // El selector se abre y se cierra con GSAP (un solo reloj de animación).
  useLayoutEffect(() => {
    const el = selectorRef.current?.querySelector<HTMLElement>("[data-selector]")
    if (!el) return
    gsap.to(el, { autoAlpha: selector ? 1 : 0, yPercent: selector ? 0 : -6, duration: selector ? 0.32 : 0.22, ease: selector ? "power3.out" : "power2.in" })
  }, [selector])

  /** Tanda 3: el cambio de empresa es un fundido simple. La tanda 4 lo reemplaza por la coreografía con el salto. */
  const cambiar = useCallback(
    (id: IdEmpresa) => {
      if (cambiando.current) return
      if (id === tienda.getState().empresa) {
        setSelector(false)
        return
      }
      cambiando.current = true
      const el = escena.current
      const tl = gsap.timeline({ onComplete: () => void (cambiando.current = false) })
      tl.to(el, { opacity: 0, duration: 0.18, ease: "power1.in" })
      tl.add(() => {
        tienda.getState().elegirEmpresa(id)
        setModulo("tablero")
      })
      tl.to(el, { opacity: 1, duration: 0.32, ease: "power2.out" }, "+=0.02")
      tl.add(() => setSelector(false), 0.35)
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
      if (e.metaKey || e.ctrlKey || e.altKey || !tecladoLibre()) return
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
    <div className="dark flex h-dvh flex-col overflow-hidden bg-background text-foreground" data-demo data-empresa={empresa}>
      <BarraDemo empresa={empresa} selectorAbierto={selector} onSelector={() => setSelector((v) => !v)} onRecorrido={() => {}} onReiniciar={reiniciar} recorridoActivo={false} />
      <div className="relative flex min-h-0 flex-1">
        <div ref={selectorRef} className="pointer-events-none absolute inset-x-0 top-0 z-30 [&>[data-abierto]]:pointer-events-auto">
          <SelectorEmpresas empresa={empresa} abierto={selector} onElegir={cambiar} />
        </div>
        <div
          ref={escena}
          className="flex min-h-0 flex-1"
          data-escena-empresa
          style={{ "--marca": EMPRESAS[empresa].color, "--serie-1": EMPRESAS[empresa].color, "--chart-1": EMPRESAS[empresa].color } as React.CSSProperties}
        >
          <LateralEmpresa empresa={empresa} modulo={modulo} onModulo={setModulo} />
          <main className="min-w-0 flex-1 overflow-y-auto px-8 pb-10 pt-6" id="contenido">
            <Vista empresa={empresa} modulo={modulo} onModulo={setModulo} />
          </main>
        </div>
      </div>
      <CapaSaltos />
      <Toaster position="bottom-right" />
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
  if (modulo === "inventario") return <VistaProductos empresa={empresa} modulo={modulo} />
  if (modulo === "clientes" || modulo === "fiado" || modulo === "cobranzas") return <VistaClientes empresa={empresa} modulo={modulo} />
  return <VistaModuloGenerica empresa={empresa} modulo={modulo} />
}
