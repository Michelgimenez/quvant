"use client"

import { ShieldCheck } from "lucide-react"
import { USUARIOS_DEMO } from "@/datos/demo/catalogo"
import { DESCRIPCION_ROL, NOMBRE_ROL, exige2FA } from "@/dominio/permisos"
import { Ficha } from "@/components/base/sellos"

export const EVENTO_USAR_DEMO = "yunque:usar-usuario-demo"

/** Panel de usuarios de prueba (solo modo demo). Un clic completa el formulario. */
export function UsuariosDemo() {
  return (
    <div className="mx-auto max-w-md space-y-5 lg:sticky lg:top-8">
      <div className="space-y-1">
        <Ficha>Modo demo</Ficha>
        <h2 className="text-lg font-bold">Usuarios de prueba</h2>
        <p className="text-sm text-muted-foreground">
          Contraseña de todos: <span className="num rounded bg-muted px-1.5 py-0.5 text-foreground">demo1234</span>. Elegí un rol
          para ver qué puede hacer cada uno.
        </p>
      </div>
      <ul className="space-y-2">
        {USUARIOS_DEMO.map((u) => (
          <li key={u.email}>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_USAR_DEMO, { detail: u.email }))}
              className="group flex w-full items-start gap-3 rounded-lg border border-linea bg-superficie px-3 py-2.5 text-left transition-colors hover:border-temple/60 focus-visible:border-temple"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {NOMBRE_ROL[u.rol]}
                  {u.sucursales && <span className="ficha">{u.sucursales.join(" · ")}</span>}
                  {exige2FA(u.rol) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-chispa-texto">
                      <ShieldCheck className="size-3.5" /> 2FA
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {u.nombre} · {u.email}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground/80">{DESCRIPCION_ROL[u.rol]}</span>
              </span>
              <span className="self-center text-xs font-medium text-enlace opacity-70 group-hover:opacity-100">Usar</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
