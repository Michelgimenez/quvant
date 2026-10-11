"use client"

import type { Id } from "@/dominio/tipos"
import type { RedForja } from "@/forja/dominio/modelo"
import { hora } from "../formato"

/** Lista accesible de transferencias (los arcos del mapa también se pueden tocar). */
export function SelectorArcos({ red, onElegir }: { red: RedForja; onElegir: (id: Id) => void }) {
  const nombre = (id: Id) => red.nodos.find((n) => n.id === id)?.codigo ?? "—"
  const enTransito = red.transferencias.filter((t) => t.estado === "en_transito")
  if (!enTransito.length) return null
  return (
    <div className="pointer-events-auto absolute bottom-[4.5rem] left-4 flex max-w-[60%] flex-wrap gap-2" aria-label="Transferencias en tránsito">
      {enTransito.map((t) => (
        <button key={t.id} type="button" onClick={() => onElegir(t.id)} className="rounded-md border border-white/10 bg-hierro/85 px-2.5 py-1.5 font-mono text-[11px] text-niebla backdrop-blur hover:border-white/25 focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple" data-testid="transferencia-en-transito">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-brasa align-middle" aria-hidden />
          {nombre(t.desdeId)} → {nombre(t.haciaId)} · llega {hora(t.llegadaEstimada)}
        </button>
      ))}
    </div>
  )
}

export function DetalleTransferencia({ red, id, onCerrar }: { red: RedForja; id: Id | null; onCerrar: () => void }) {
  const t = red.transferencias.find((x) => x.id === id)
  if (!t) return null
  const desde = red.nodos.find((n) => n.id === t.desdeId)
  const hacia = red.nodos.find((n) => n.id === t.haciaId)
  return (
    <aside className="pointer-events-auto absolute right-4 top-4 w-80 rounded-xl border border-white/10 bg-hierro/92 p-4 shadow-2xl backdrop-blur" aria-label="Detalle de la transferencia" data-testid="detalle-transferencia">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-acero">Transferencia</p>
          <p className="mt-1 font-heading text-lg font-extrabold">
            {desde?.nombre ?? "—"} → {hacia?.nombre ?? "—"}
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="rounded-md px-2 py-1 text-acero hover:text-niebla focus-visible:outline focus-visible:outline-1 focus-visible:outline-temple" aria-label="Cerrar">
          ✕
        </button>
      </div>
      <p className="mt-2 font-mono text-xs text-niebla">
        {t.estado === "en_transito" ? `En camino · salió ${hora(t.despachadaEn)} · llega ~${hora(t.llegadaEstimada)}` : `Recibida ${hora(t.recibidaEn ?? t.llegadaEstimada)}`}
      </p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {t.items.map((i) => (
          <li key={i.productoId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <span className="truncate text-niebla/90">{i.nombre}</span>
            <span className="whitespace-nowrap font-mono text-acero">× {i.cantidad}</span>
          </li>
        ))}
      </ul>
      {t.motivo && <p className="mt-3 text-xs text-acero">{t.motivo}</p>}
    </aside>
  )
}
