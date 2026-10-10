"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Punto } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Componente = { id: string; nombre: string; estado: "operativo" | "degradado" | "caido" | "emulado"; detalle: string }
type Salud = { ok: boolean; version: string; modo: string; momento: string; erroresUltimaHora: number; componentes: Componente[] }

const TEXTO: Record<Componente["estado"], string> = { operativo: "Operativo", degradado: "Lento", caido: "Sin servicio", emulado: "Emulado (demo)" }
const TONO: Record<Componente["estado"], "ok" | "chispa" | "error" | "acero"> = { operativo: "ok", degradado: "chispa", caido: "error", emulado: "acero" }

/** Consulta /api/salud cada 30 s y revisa este equipo (red, base local, modo sin conexión). */
export function EstadoEnVivo() {
  const [salud, setSalud] = useState<Salud | null>(null)
  const [error, setError] = useState(false)
  const [local, setLocal] = useState<{ red: boolean; indexeddb: boolean; sw: boolean } | null>(null)

  const consultar = () =>
    fetch("/api/salud", { cache: "no-store" })
      .then((r) => r.json() as Promise<Salud>)
      .then((s) => {
        setSalud(s)
        setError(false)
      })
      .catch(() => setError(true))

  useEffect(() => {
    const primera = window.setTimeout(consultar, 0)
    const t = window.setInterval(consultar, 30_000)
    const registro = "serviceWorker" in navigator ? navigator.serviceWorker.getRegistration() : Promise.resolve(undefined)
    registro.then((r) => setLocal({ red: navigator.onLine, indexeddb: typeof indexedDB !== "undefined", sw: Boolean(r) }))
    return () => {
      window.clearTimeout(primera)
      window.clearInterval(t)
    }
  }, [])

  const general = error ? "error" : !salud ? "acero" : salud.ok ? "ok" : "error"
  return (
    <div className="space-y-6">
      <section className={cn("flex items-center gap-4 rounded-xl border p-5", general === "ok" ? "border-ok/40 bg-ok/10" : general === "error" ? "border-error/40 bg-error/10" : "border-linea bg-card")}>
        <Punto tono={general} pulso={general !== "acero"} className="size-3" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">{error ? "No pudimos consultar el servidor" : !salud ? "Consultando…" : salud.ok ? "Todo funcionando" : "Hay componentes con problemas"}</h1>
          {salud && (
            <p className="text-xs text-muted-foreground">
              Versión {salud.version} · modo {salud.modo} · actualizado {new Date(salud.momento).toLocaleTimeString("es-AR")} · {salud.erroresUltimaHora} errores registrados en la última hora
            </p>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => void consultar()} aria-label="Actualizar">
          <RefreshCw />
        </Button>
      </section>
      {salud && (
        <ul className="divide-y divide-linea rounded-xl border border-linea bg-card">
          {salud.componentes.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
              <Punto tono={TONO[c.estado]} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.nombre}</p>
                <p className="text-xs text-muted-foreground">{c.detalle}</p>
              </div>
              <span className="text-xs text-muted-foreground">{TEXTO[c.estado]}</span>
            </li>
          ))}
        </ul>
      )}
      {local && (
        <section className="space-y-2">
          <h2 className="ficha">Este equipo</h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {[
              ["Conexión a internet", local.red],
              ["Base local (IndexedDB)", local.indexeddb],
              ["Modo sin conexión instalado", local.sw],
            ].map(([n, ok]) => (
              <li key={String(n)} className="flex items-center gap-2 rounded-lg border border-linea bg-card px-3 py-2 text-sm">
                <Punto tono={ok ? "ok" : "acero"} /> {n}
              </li>
            ))}
          </ul>
          {!local.sw && <p className="text-xs text-muted-foreground">El modo sin conexión se instala solo la primera vez que entrás a la app.</p>}
        </section>
      )}
    </div>
  )
}
