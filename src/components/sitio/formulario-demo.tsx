"use client"

import { useActionState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { pedirDemo, type EstadoSolicitud } from "@/acciones/sitio"
import { RUBROS } from "@/config/sitio"
import { unir } from "@/lib/unir"

const campo = "h-11 w-full rounded-lg border border-white/15 bg-negro px-3 text-blanco placeholder:text-acero/70 focus-visible:border-foreground"

/** "Pedir una demo" y "socios fundadores": mismos datos, distinto origen. */
export function FormularioDemo({ origen = "sitio", boton = "Pedir una demo" }: { origen?: "sitio" | "socios"; boton?: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoSolicitud, FormData>(pedirDemo, {})
  if (estado.ok) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-ok/40 bg-ok/10 p-8 text-center" role="status" data-testid="solicitud-ok">
        <CheckCircle2 className="size-8 text-ok" />
        <p className="text-lg font-semibold text-blanco">¡Gracias! Recibimos tu solicitud.</p>
        <p className="text-sm text-acero">Te escribimos por WhatsApp en los próximos días hábiles para coordinar la demo.</p>
      </div>
    )
  }
  const err = (k: string) => estado.errores?.[k]
  const id = (k: string) => `${origen}-${k}`
  return (
    <form action={accion} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input type="hidden" name="origen" value={origen} />
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor={id("sitio_web")}>No completar</label>
        <input id={id("sitio_web")} name="sitio_web" tabIndex={-1} autoComplete="off" />
      </div>
      {(
        [
          ["nombre", "Tu nombre", "text", "name"],
          ["negocio", "Nombre del negocio", "text", "organization"],
        ] as const
      ).map(([k, etiqueta, tipo, auto]) => (
        <div key={k} className="space-y-1.5">
          <label htmlFor={id(k)} className="text-sm font-medium text-blanco">
            {etiqueta}
          </label>
          <input id={id(k)} name={k} type={tipo} autoComplete={auto} required className={unir(campo, err(k) && "border-error")} aria-invalid={Boolean(err(k)) || undefined} aria-describedby={err(k) ? id(`${k}-error`) : undefined} />
          {err(k) && (
            <p id={id(`${k}-error`)} className="text-xs text-error">
              {err(k)}
            </p>
          )}
        </div>
      ))}
      <div className="space-y-1.5">
        <label htmlFor={id("rubro")} className="text-sm font-medium text-blanco">
          Rubro
        </label>
        <select id={id("rubro")} name="rubro" defaultValue="" required className={unir(campo, err("rubro") && "border-error")} aria-invalid={Boolean(err("rubro")) || undefined}>
          <option value="" disabled>
            Elegí una opción
          </option>
          {RUBROS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {err("rubro") && <p className="text-xs text-error">{err("rubro")}</p>}
      </div>
      <div className="space-y-1.5">
        <label htmlFor={id("sucursales")} className="text-sm font-medium text-blanco">
          Cantidad de sucursales
        </label>
        <input id={id("sucursales")} name="sucursales" type="number" min={1} max={500} defaultValue={1} required className={unir(campo, err("sucursales") && "border-error")} />
        {err("sucursales") && <p className="text-xs text-error">{err("sucursales")}</p>}
      </div>
      <div className="space-y-1.5">
        <label htmlFor={id("sistemaActual")} className="text-sm font-medium text-blanco">
          Sistema que usás hoy <span className="font-normal text-acero">(opcional)</span>
        </label>
        <input id={id("sistemaActual")} name="sistemaActual" placeholder="Ej.: sistema de escritorio, planillas…" className={campo} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={id("whatsapp")} className="text-sm font-medium text-blanco">
          WhatsApp
        </label>
        <input id={id("whatsapp")} name="whatsapp" type="tel" autoComplete="tel" placeholder="+54 9 11 …" required className={unir(campo, err("whatsapp") && "border-error")} aria-invalid={Boolean(err("whatsapp")) || undefined} />
        {err("whatsapp") && <p className="text-xs text-error">{err("whatsapp")}</p>}
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-error sm:col-span-2">
          {estado.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pendiente} className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60" data-testid={`enviar-${origen}`}>
          {pendiente && <Loader2 className="size-4 animate-spin" />}
          {boton}
        </button>
        <p className="text-xs text-acero">Usamos tus datos solo para contactarte por esta solicitud.</p>
      </div>
    </form>
  )
}
