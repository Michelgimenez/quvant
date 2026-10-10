"use client"

import { useActionState } from "react"
import { Loader2, LockKeyhole } from "lucide-react"
import { Isotipo } from "@/components/marca/marca"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Estado = { error?: string }

/** Pantalla de clave para presentaciones privadas. */
export function PuertaClave({
  titulo,
  bajada,
  accion,
  habilitada,
}: {
  titulo: string
  bajada: string
  accion: (estado: Estado, form: FormData) => Promise<Estado>
  habilitada: boolean
}) {
  const [estado, enviar, pendiente] = useActionState<Estado, FormData>(accion, {})
  return (
    <main className="dark grilla-tecnica flex min-h-dvh items-center justify-center bg-hierro px-4 py-10 text-niebla">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-forja/90 p-8 shadow-2xl">
        <Isotipo className="h-12 text-niebla" tono="negativo" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-sm text-acero">{bajada}</p>
        {habilitada ? (
          <form action={enviar} className="mt-8 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="clave">Clave</Label>
              <Input
                id="clave"
                name="clave"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                className="h-11"
                aria-invalid={Boolean(estado.error) || undefined}
                aria-describedby={estado.error ? "error-clave" : undefined}
              />
            </div>
            {estado.error && (
              <p id="error-clave" role="alert" className="text-sm font-medium text-error-texto">
                {estado.error}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={pendiente}>
              {pendiente ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
              Entrar
            </Button>
          </form>
        ) : (
          <p role="alert" className="mt-8 rounded-md border border-chispa/40 bg-chispa/10 px-3 py-2 text-sm">
            La presentación no está habilitada en este entorno (falta configurar la clave).
          </p>
        )}
      </div>
    </main>
  )
}
