import type { Metadata } from "next"
import { Suspense } from "react"
import { BellRing, Check, LogOut, MessageCircle, Undo2 } from "lucide-react"
import { Logo } from "@/components/marca/marca"
import { PuertaClave } from "@/components/presentacion/puerta-clave"
import { Button } from "@/components/ui/button"
import { ACCESO_PANEL } from "@/lib/auth/presentaciones"
import { destinoSolicitudes, solicitudes, type Solicitud } from "@/lib/solicitudes"
import { cn } from "@/lib/utils"
import { entrarPanel, marcarSolicitud, salirPanel } from "./acciones"

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
}

export default function PaginaPanel() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-background" />}>
      <Contenido />
    </Suspense>
  )
}

async function Contenido() {
  if (!(await ACCESO_PANEL.tiene())) {
    return (
      <PuertaClave
        titulo="Panel de Yunque"
        bajada="Solicitudes de demo del sitio. Solo para el equipo: tiene datos personales."
        accion={entrarPanel}
        habilitada={ACCESO_PANEL.clave() !== null}
      />
    )
  }
  let lista: Solicitud[] = []
  let error: string | null = null
  try {
    lista = await solicitudes()
  } catch (e) {
    error = (e as Error).message
  }
  const nuevas = lista.filter((s) => !s.contactada_en)
  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo className="h-7" />
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Panel interno</span>
          </div>
          <form action={salirPanel}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut /> Salir
            </Button>
          </form>
        </header>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Solicitudes de demo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Llegan del formulario &ldquo;Pedir una demo&rdquo; y de socios fundadores. Se guardan en: {destinoSolicitudes()}.</p>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-error/40 bg-error/10 p-4 text-sm">
            No se pudieron leer las solicitudes: {error}
          </p>
        ) : (
          <p
            role="status"
            data-testid="aviso-solicitudes"
            className={cn("flex items-center gap-3 rounded-lg border p-4 text-sm font-medium", nuevas.length ? "border-temple/50 bg-temple/10" : "border-linea bg-superficie-2")}
          >
            <BellRing className="size-5 shrink-0" />
            {nuevas.length === 0 ? "No hay solicitudes nuevas." : nuevas.length === 1 ? "Tenés 1 solicitud nueva sin contactar." : `Tenés ${nuevas.length} solicitudes nuevas sin contactar.`}
          </p>
        )}

        <ul className="space-y-3" aria-label="Solicitudes">
          {lista.map((s) => (
            <TarjetaSolicitud key={s.id} s={s} />
          ))}
          {!error && lista.length === 0 && <li className="rounded-lg border border-dashed border-linea p-8 text-center text-sm text-muted-foreground">Todavía no llegó ninguna solicitud.</li>}
        </ul>
      </div>
    </main>
  )
}

const FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" })

function TarjetaSolicitud({ s }: { s: Solicitud }) {
  const contactada = Boolean(s.contactada_en)
  const numero = s.whatsapp.replace(/\D/g, "")
  return (
    <li className={cn("rounded-xl border p-4 sm:p-5", contactada ? "border-linea bg-card/50" : "border-temple/40 bg-card")} data-testid="solicitud">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold">{s.nombre}</span>
            <span className="text-muted-foreground">· {s.negocio}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {s.rubro} · {s.sucursales} {s.sucursales === 1 ? "sucursal" : "sucursales"}
            {s.sistema_actual ? ` · hoy usa: ${s.sistema_actual}` : ""}
          </p>
        </div>
        <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 font-mono text-[11px] uppercase tracking-wider", contactada ? "bg-superficie-2 text-muted-foreground" : "bg-temple/15 text-enlace")} data-testid="estado-solicitud">
          {contactada ? "Contactada" : "Nueva"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <a href={`https://wa.me/${numero}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-enlace underline-offset-4 hover:underline">
          <MessageCircle className="size-4" /> {s.whatsapp}
        </a>
        <span className="text-muted-foreground">{FECHA.format(new Date(s.creada_en))}</span>
        {s.socio_fundador && <span className="rounded-md border border-linea px-2 py-0.5 text-xs">Socios fundadores</span>}
        {contactada && <span className="text-xs text-muted-foreground">Contactada el {FECHA.format(new Date(s.contactada_en!))}</span>}
        <form action={marcarSolicitud} className="ml-auto">
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="contactada" value={contactada ? "no" : "si"} />
          <Button type="submit" size="sm" variant={contactada ? "ghost" : "outline"}>
            {contactada ? <Undo2 /> : <Check />}
            {contactada ? "Volver a nueva" : "Marcar como contactada"}
          </Button>
        </form>
      </div>
    </li>
  )
}
