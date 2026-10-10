"use client"

import { useActionState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ingresar, type EstadoIngreso } from "@/acciones/ingreso"
import { EVENTO_USAR_DEMO } from "./usuarios-demo"

export function FormularioIngreso() {
  const params = useSearchParams()
  const [estado, accion, pendiente] = useActionState<EstadoIngreso, FormData>(ingresar, {})
  const email = useRef<HTMLInputElement>(null)
  const contrasena = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const usar = (e: Event) => {
      const valor = (e as CustomEvent<string>).detail
      if (email.current) email.current.value = valor
      if (contrasena.current) {
        contrasena.current.value = "demo1234"
        contrasena.current.focus()
      }
    }
    window.addEventListener(EVENTO_USAR_DEMO, usar)
    return () => window.removeEventListener(EVENTO_USAR_DEMO, usar)
  }, [])

  return (
    <form action={accion} className="space-y-4" noValidate>
      <input type="hidden" name="siguiente" value={params.get("siguiente") ?? ""} />
      {params.get("vencida") && !estado.error && (
        <p className="rounded-md border border-chispa/40 bg-chispa/10 px-3 py-2 text-sm">La verificación venció. Ingresá de nuevo.</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          ref={email}
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={estado.email}
          className="h-11"
          aria-invalid={Boolean(estado.error) || undefined}
          aria-describedby={estado.error ? "error-ingreso" : undefined}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contrasena">Contraseña</Label>
        <Input
          ref={contrasena}
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          className="h-11"
          aria-invalid={Boolean(estado.error) || undefined}
          aria-describedby={estado.error ? "error-ingreso" : undefined}
        />
      </div>
      {estado.error && (
        <p id="error-ingreso" role="alert" className="text-sm font-medium text-error-texto">
          {estado.error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11 w-full text-[15px]" disabled={pendiente}>
        {pendiente && <Loader2 className="animate-spin" />}
        Ingresar
      </Button>
    </form>
  )
}
