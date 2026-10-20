"use client"

import { useState } from "react"
import { History, Lock, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { EncabezadoPagina, Requiere } from "@/components/app/pagina"
import { Ficha } from "@/components/base/sellos"
import { AumentoMasivo } from "@/components/precios/aumento-masivo"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatoPesos } from "@/dominio/dinero"

export function Precios() {
  const { e } = useDatos()
  const { puede, ejecutar, motor } = useApp()
  const [tab, setTab] = useState(puede("precios.editar") ? "aumento" : "listas")
  return (
    <Requiere permiso="precios.ver" modulo="precios">
      <EncabezadoPagina ficha="Precios · listas" titulo="Precios al día" descripcion="Actualizá miles de precios en minutos y mirá el impacto antes de aplicar." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          {puede("precios.editar") && <TabsTrigger value="aumento">Aumento masivo</TabsTrigger>}
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="listas">Listas</TabsTrigger>
        </TabsList>
        {puede("precios.editar") ? (
          <TabsContent value="aumento">
            <AumentoMasivo
              e={e}
              verCostos={puede("costos.ver")}
              onAplicar={async (parametros, descripcion) => {
                const r = await ejecutar("precios.aumento", { aumentoId: motor.uuid(), descripcion, parametros }, null)
                if (!r.ok) {
                  toast.error(r.error)
                  return false
                }
                toast.success(`Listo: ${r.asignado?.cambios} precios actualizados.`, { description: "Se puede revertir desde Historial." })
                setTab("historial")
                return true
              }}
            />
          </TabsContent>
        ) : (
          <p className="flex items-center gap-2 t-texto-sm text-muted-foreground">
            <Lock className="size-4" /> Tu rol puede ver precios, pero no cambiarlos.
          </p>
        )}
        <TabsContent value="historial">
          <Historial />
        </TabsContent>
        <TabsContent value="listas">
          <ul className="grid gap-3 sm:grid-cols-3">
            {e.listas.map((l) => (
              <li key={l.id} className="rounded-xl border border-linea bg-card p-4">
                <Ficha>{l.esDefault ? "Lista principal" : "Lista"}</Ficha>
                <p className="mt-1 text-lg font-semibold">{l.nombre}</p>
                <p className="t-texto-sm text-muted-foreground">Margen sugerido para productos nuevos: {l.margenSugerido} %</p>
                <p className="mt-2 t-texto-sm text-muted-foreground">{Object.values(e.clientes).filter((c) => c.listaId === l.id).length} clientes usan esta lista</p>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </Requiere>
  )
}

function Historial() {
  const { e } = useDatos()
  const { ejecutar, puede } = useApp()
  if (!e.aumentos.length) return <p className="t-texto-sm text-muted-foreground">Todavía no hubo aumentos.</p>
  return (
    <ul className="space-y-2">
      {e.aumentos.map((a) => {
        const autor = e.usuarios.find((u) => u.id === a.usuarioId)
        const ejemplo = a.cambios[0]
        return (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-linea bg-card p-4">
            <History className="size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{a.descripcion}</p>
              <p className="t-texto-sm text-muted-foreground">
                {new Date(a.fecha).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })} · {autor?.nombre ?? "—"} · {a.listaIds.map((l) => e.listas.find((x) => x.id === l)?.nombre).join(", ")}
              </p>
              {ejemplo && (
                <p className="mt-1 t-texto-sm text-muted-foreground">
                  Ej.: {e.productos[ejemplo.productoId]?.nombre} {formatoPesos(ejemplo.antes, { sinDecimales: true })} → {formatoPesos(ejemplo.despues, { sinDecimales: true })}
                </p>
              )}
            </div>
            <span className="num t-texto-sm font-semibold">+{a.porcentaje} %</span>
            <span className="num t-texto-sm text-muted-foreground">{a.cambios.length} precios</span>
            {a.revertido ? (
              <span className="rounded-full bg-muted px-2 py-0.5 t-texto-sm text-muted-foreground">Revertido</span>
            ) : (
              puede("precios.editar") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!confirm(`¿Revertir "${a.descripcion}"? Los precios vuelven a como estaban (salvo los que cambiaron después).`)) return
                    const r = await ejecutar("precios.revertir", { aumentoId: a.id }, null)
                    if (!r.ok) return toast.error(r.error)
                    toast.success("Aumento revertido", { description: r.avisos[0] })
                  }}
                >
                  <RotateCcw /> Revertir
                </Button>
              )
            )}
          </li>
        )
      })}
    </ul>
  )
}
