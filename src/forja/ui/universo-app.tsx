"use client"

import { Sello } from "@/components/base/sellos"
import { formatoPesosCorto } from "@/dominio/dinero"
import { NOMBRE_ESTADO_SERVICIO } from "@/dominio/servicio"
import { colorCalor, nombreCalor } from "@/forja/dominio/calor"
import { useRedForjaApp, useSimulacionForja } from "@/forja/datos/usar-forja-app"
import { MarcaForja } from "./marca-forja"

/**
 * Universo del taller dentro de la app. Fase 1: el modelo de la red con su
 * calor, métricas y transferencias (base de datos y simulador funcionando). El
 * mapa, la constelación y el taller 3D se montan encima en las fases siguientes.
 */
export function UniversoForjaApp({ simulacion }: { activacion: boolean; simulacion: boolean }) {
  const { red } = useRedForjaApp()
  const sim = useSimulacionForja(simulacion)
  const nombre = (id: string) => red.nodos.find((n) => n.id === id)?.codigo ?? "—"
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
        <MarcaForja tamano={22} />
        {red.org.esDemo && <Sello />}
        {sim.activa && <Sello texto="SIMULACIÓN" titulo="Eventos simulados para la empresa demo" />}
        <span className="ml-auto font-mono text-xs text-acero">{red.nodos.length} sucursales · {red.transferencias.filter((t) => t.estado === "en_transito").length} en tránsito</span>
      </header>
      <ul className="grid flex-1 content-start gap-4 overflow-y-auto p-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Sucursales">
        {red.nodos.map((n) => (
          <li key={n.id} className="rounded-xl border border-white/10 bg-superficie p-4" data-testid="nodo-forja">
            <div className="flex items-center gap-3">
              <span className="size-4 rounded-full shadow-[0_0_14px_2px_var(--c)]" style={{ background: colorCalor(n.calor), ["--c" as string]: colorCalor(n.calor) }} aria-hidden />
              <p className="font-bold">{n.nombre}</p>
              {n.demo && <Sello className="scale-90" />}
              <span className="ml-auto font-mono text-xs text-acero">{nombreCalor(n.calor)}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
              <div>
                <dt className="text-acero">Ventas de hoy</dt>
                <dd className="text-sm text-niebla" data-testid="ventas-hoy-nodo">{n.ventasHoy} · {formatoPesosCorto(n.importeHoy)}</dd>
              </div>
              <div>
                <dt className="text-acero">Presupuestos abiertos</dt>
                <dd className="text-sm text-niebla">{n.presupuestosAbiertos}</dd>
              </div>
              <div>
                <dt className="text-acero">Stock crítico</dt>
                <dd className="text-sm text-niebla">{n.stockCritico} · {n.sinStock} sin stock</dd>
              </div>
              <div>
                <dt className="text-acero">Servicio técnico</dt>
                <dd className="text-sm text-niebla">{Object.entries(n.ordenes).map(([e, c]) => `${c} ${NOMBRE_ESTADO_SERVICIO[e as keyof typeof NOMBRE_ESTADO_SERVICIO].toLowerCase()}`).join(" · ") || "—"}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <footer className="border-t border-white/10 px-5 py-3 font-mono text-xs text-acero">
        {red.transferencias.filter((t) => t.estado === "en_transito").map((t) => (
          <span key={t.id} className="mr-4">
            {nombre(t.desdeId)} → {nombre(t.haciaId)} · {t.items.length} productos
          </span>
        ))}
      </footer>
    </div>
  )
}
