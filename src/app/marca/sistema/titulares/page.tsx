import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Firma } from "@/components/marca/quvant"
import { Grilla } from "@/components/marca/grilla"
import { TITULARES_ALTERNATIVOS } from "@/config/sitio"

export const metadata: Metadata = {
  title: "Titulares propuestos",
  description: "Las tres propuestas de titular para el sitio de Quvant, compuestas como hero.",
  robots: { index: false },
}

/** Las 3 propuestas de titular (tanda 1), compuestas como el hero, para que Michel elija una. */
export default function PaginaTitulares() {
  return (
    <main className="min-h-dvh bg-negro">
      <div className="dark flex h-[1240px] w-[1600px] flex-col gap-4 overflow-hidden bg-negro p-10 text-blanco" data-lamina>
        <header className="flex items-end justify-between pb-1">
          <div>
            <p className="t-etiqueta text-acero">Sitio · Hero</p>
            <h1 className="t-titulo mt-1.5">Tres titulares para elegir.</h1>
          </div>
          <p className="t-etiqueta text-gris-7">Michel elige uno · se guarda en src/config/sitio.ts</p>
        </header>
        {TITULARES_ALTERNATIVOS.map((t) => (
          <section key={t.id} className="relative grid flex-1 grid-cols-[1fr_380px] overflow-hidden border border-gris-3 bg-negro">
            <Grilla paso={28} />
            <div className="relative flex flex-col justify-center gap-4 px-10 py-7">
              <div className="flex items-center gap-5">
                <Firma alto={22} version="principal" />
                <span className="t-etiqueta text-gris-7">Propuesta {t.id}</span>
              </div>
              <h2 className="t-hero">{t.titular}</h2>
              <p className="t-texto max-w-[720px] text-acero">{t.bajada}</p>
              <div className="flex gap-2">
                <Button size="lg">Probar la demo</Button>
                <Button size="lg" variant="outline">
                  Pedir una demo
                </Button>
              </div>
            </div>
            <aside className="relative flex flex-col justify-center gap-3 border-l border-gris-3 bg-negro px-7">
              <p className="t-etiqueta text-blanco">Por qué</p>
              <p className="t-texto-sm text-acero">{t.porQue}</p>
              {t.ojo && (
                <>
                  <p className="t-etiqueta mt-2 flex items-center gap-2 text-alerta">
                    <span className="size-[6px] bg-alerta" aria-hidden />
                    Ojo
                  </p>
                  <p className="t-texto-sm text-acero">{t.ojo}</p>
                </>
              )}
            </aside>
          </section>
        ))}
      </div>
    </main>
  )
}
