"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight, CheckCircle2, Loader2, Power } from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/cliente/app-contexto"
import { EncabezadoPagina, Requiere } from "@/components/app/pagina"
import { EstadoFeatureBadge } from "@/components/base/sellos"
import { Button } from "@/components/ui/button"
import { textoPrecioExtension } from "@/config/precios"
import { REGISTRO_EXTENSIONES, type DefinicionExtension } from "@/extensiones/registro"
import { MarcaForja } from "@/forja/ui/marca-forja"

/** Al acercarse al botón, la escena de la activación empieza a bajar: arranca sin espera. */
const precargarActivacion = () => void import("@/forja/ui/activacion/escena-activacion").catch(() => {})

export function Extensiones() {
  return (
    <Requiere permiso="extensiones.gestionar">
      <EncabezadoPagina ficha="Extensiones" titulo="Extensiones" descripcion="Pantallas que se suman a Yunque sobre los mismos datos y los mismos permisos. Se activan por empresa." />
      <ul className="grid gap-4 lg:grid-cols-2">
        {REGISTRO_EXTENSIONES.map((x) => (
          <TarjetaExtension key={x.id} x={x} />
        ))}
      </ul>
    </Requiere>
  )
}

function TarjetaExtension({ x }: { x: DefinicionExtension }) {
  const { motor, ejecutar, extensionActiva } = useApp()
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const activa = extensionActiva(x.id)
  const estado = motor.estado.org.extensiones[x.id]

  async function cambiar(activar: boolean) {
    setEnviando(true)
    const r = await ejecutar("extension.activar", { extension: x.id, activa: activar }, null)
    setEnviando(false)
    if (!r.ok) return void toast.error(r.error)
    if (activar) router.push(`${x.ruta}?activacion=1`)
    else toast.success(`${x.nombre} quedó desactivada`)
  }

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-linea bg-card p-5" data-testid={`extension-${x.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg bg-hierro px-3 py-2">
          <MarcaForja tamano={22} />
        </div>
        <EstadoFeatureBadge estado={x.estado} />
      </div>
      <p className="text-sm text-muted-foreground">{x.descripcion}</p>
      <ul className="space-y-1.5 text-sm">
        {x.puntos.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-ok-texto" /> {p}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-4">
        <div className="text-sm">
          <p className="font-semibold">{textoPrecioExtension(x.id)}</p>
          <p className="text-xs text-muted-foreground">{activa ? `Activa desde ${new Date(estado!.activadaEn!).toLocaleDateString("es-AR")}` : "No activada"}</p>
        </div>
        {activa ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" disabled={enviando} onClick={() => cambiar(false)}>
              <Power /> Desactivar
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${x.ruta}?activacion=1`} onPointerEnter={precargarActivacion} onFocus={precargarActivacion}>
                Ver la activación
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={x.ruta}>
                Abrir {x.nombre} <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <Button onClick={() => cambiar(true)} onPointerEnter={precargarActivacion} onFocus={precargarActivacion} disabled={enviando} data-testid={`activar-${x.id}`}>
            {enviando ? <Loader2 className="animate-spin" /> : <Power />} Activar {x.nombre}
          </Button>
        )}
      </div>
    </li>
  )
}
