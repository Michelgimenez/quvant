"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/cliente/app-contexto"
import { TODOS_LOS_ITEMS } from "@/cliente/navegacion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"

export const EVENTO_AYUDA_ATAJOS = "yunque:ayuda-atajos"

function escribiendo(ev: KeyboardEvent) {
  const t = ev.target as HTMLElement | null
  return Boolean(t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)))
}

const ATAJOS_MOSTRADOR: [string, string][] = [
  ["F2", "Buscar producto"],
  ["F4", "Elegir cliente"],
  ["F8", "Cobrar"],
  ["Esc", "Cancelar / limpiar"],
]

/** Atajos globales: "g" + letra para navegar, "?" para la ayuda, "/" para buscar. */
export function AtajosGlobales() {
  const router = useRouter()
  const { puede, moduloActivo } = useApp()
  const [ayuda, setAyuda] = useState(false)

  useEffect(() => {
    let prefijo = false
    let t: number | undefined
    const tecla = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey || escribiendo(ev)) return
      if (ev.key === "?") {
        ev.preventDefault()
        setAyuda(true)
        return
      }
      if (ev.key === "/") {
        ev.preventDefault()
        window.dispatchEvent(new CustomEvent("yunque:abrir-paleta"))
        return
      }
      if (prefijo) {
        prefijo = false
        const item = TODOS_LOS_ITEMS.find((i) => i.atajo === ev.key.toLowerCase())
        if (item && puede(item.permiso) && (!item.modulo || moduloActivo(item.modulo))) {
          ev.preventDefault()
          router.push(item.href)
        }
        return
      }
      if (ev.key === "g") {
        prefijo = true
        window.clearTimeout(t)
        t = window.setTimeout(() => (prefijo = false), 1200)
      }
    }
    const abrir = () => setAyuda(true)
    window.addEventListener("keydown", tecla)
    window.addEventListener(EVENTO_AYUDA_ATAJOS, abrir)
    return () => {
      window.removeEventListener("keydown", tecla)
      window.removeEventListener(EVENTO_AYUDA_ATAJOS, abrir)
    }
  }, [router, puede, moduloActivo])

  const nav = TODOS_LOS_ITEMS.filter((i) => i.atajo && puede(i.permiso))
  return (
    <Dialog open={ayuda} onOpenChange={setAyuda}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription>Para trabajar sin levantar las manos del teclado.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <section className="space-y-2">
            <h3 className="ficha">General</h3>
            <Fila teclas={["⌘", "K"]} texto="Buscar (también Ctrl K o /)" />
            <Fila teclas={["?"]} texto="Esta ayuda" />
            {nav.map((i) => (
              <Fila key={i.href} teclas={["G", i.atajo!.toUpperCase()]} texto={i.nombre} />
            ))}
          </section>
          <section className="space-y-2">
            <h3 className="ficha">Mostrador</h3>
            {ATAJOS_MOSTRADOR.map(([k, t]) => (
              <Fila key={k} teclas={[k]} texto={t} />
            ))}
            <Fila teclas={["+", "−"]} texto="Cantidad del último ítem" />
            <Fila teclas={["Enter"]} texto="Agregar el producto elegido" />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Fila({ teclas, texto }: { teclas: string[]; texto: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{texto}</span>
      <span className="flex gap-1">
        {teclas.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </span>
    </div>
  )
}
