import type { Metadata } from "next"
import Link from "next/link"
import { Firma } from "@/components/marca/quvant"
import { EstadoEnVivo } from "./estado-en-vivo"

export const metadata: Metadata = {
  title: "Estado del sistema",
  description: "Estado de los componentes de Quvant en este momento.",
}

export default function PaginaEstado() {
  return (
    <main className="dark grilla-puntos min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Quvant, inicio">
            <Firma className="h-7" version="principal" />
          </Link>
          <span className="ficha">Estado del sistema</span>
        </header>
        <EstadoEnVivo />
        <section className="space-y-2 rounded-xl border border-linea bg-card p-5">
          <h2 className="font-semibold">Historial de incidentes</h2>
          <p className="t-texto-sm text-muted-foreground">
            Todavía no hay historial: Quvant está en etapa de demo y piloto. La medición de disponibilidad histórica empieza con el primer cliente en producción y se publica acá.
          </p>
        </section>
        <section className="space-y-2 t-texto-sm text-muted-foreground">
          <h2 className="font-semibold text-foreground">Si se corta internet</h2>
          <p>
            El mostrador sigue funcionando sin conexión: las ventas quedan guardadas en el equipo y se sincronizan solas cuando vuelve la red. Un corte de internet o del servidor no frena la venta.
          </p>
        </section>
      </div>
    </main>
  )
}
