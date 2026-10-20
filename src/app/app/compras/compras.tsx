"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PackagePlus, Plus, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { EncabezadoPagina, Requiere, Vacio } from "@/components/app/pagina"
import { TablaRapida, type Columna } from "@/components/app/tabla-rapida"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatoCantidad, formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import type { EstadoCompra, Id, OrdenCompra } from "@/dominio/tipos"
import { cn } from "@/lib/utils"
import { DetalleCompra, EditorCompra } from "./orden"

export const NOMBRE_ESTADO_COMPRA: Record<EstadoCompra, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  recibida_parcial: "Recibida en parte",
  recibida: "Recibida",
  cancelada: "Cancelada",
}
const TONO: Record<EstadoCompra, string> = {
  borrador: "bg-muted text-muted-foreground",
  enviada: "bg-foreground/15 text-foreground",
  recibida_parcial: "bg-alerta/15 text-alerta",
  recibida: "bg-ok/15 text-ok",
  cancelada: "bg-error/15 text-error",
}
export function ChipCompra({ estado }: { estado: EstadoCompra }) {
  return <span className={cn("rounded-full px-2 py-0.5 t-texto-sm font-medium", TONO[estado])}>{NOMBRE_ESTADO_COMPRA[estado]}</span>
}

export function Compras() {
  const { e, v } = useDatos()
  const { puede, sucursalId, ejecutar, motor, usuario } = useApp()
  const params = useSearchParams()
  const router = useRouter()
  const [editor, setEditor] = useState(false)
  const seleccionada = params.get("id")
  const abrir = (id: string | null) => router.replace(id ? `/app/compras?id=${id}` : "/app/compras", { scroll: false })

  const ordenes = useMemo(
    () => Object.values(e.compras).filter((o) => usuario.sucursalIds === null || usuario.sucursalIds.includes(o.sucursalId)).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v],
  )

  const sugerencias = useMemo(() => {
    const porProveedor: Record<Id, { productoId: Id; cantidad: number; costoUnitario: number; stock: number; minimo: number }[]> = {}
    const pedidos = new Set(ordenes.filter((o) => o.sucursalId === sucursalId && (o.estado === "borrador" || o.estado === "enviada")).flatMap((o) => o.items.map((i) => i.productoId)))
    for (const st of Object.values(e.stock)) {
      if (st.sucursalId !== sucursalId || st.cantidad > st.minimo || pedidos.has(st.productoId)) continue
      const p = e.productos[st.productoId]
      if (!p?.activo) continue
      ;(porProveedor[p.proveedorId] ??= []).push({ productoId: p.id, cantidad: Math.max(1, Math.ceil(st.minimo * 3 - st.cantidad)), costoUnitario: p.costo, stock: st.cantidad, minimo: st.minimo })
    }
    return Object.entries(porProveedor)
      .map(([proveedorId, items]) => ({ proveedor: e.proveedores.find((x) => x.id === proveedorId)!, items }))
      .filter((x) => x.proveedor)
      .sort((a, b) => b.items.length - a.items.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, sucursalId, ordenes])

  const columnas: Columna<OrdenCompra>[] = [
    { id: "numero", encabezado: "Orden", ancho: "110px", orden: (o) => o.numero ?? 0, celda: (o) => <span className="ficha text-foreground">{o.numero ? `OC #${o.numero}` : o.numeroLocal}</span> },
    { id: "proveedor", encabezado: "Proveedor", ancho: "minmax(200px,2fr)", orden: (o) => e.proveedores.find((p) => p.id === o.proveedorId)?.nombre ?? "", celda: (o) => <span className="truncate">{e.proveedores.find((p) => p.id === o.proveedorId)?.nombre}</span> },
    { id: "suc", encabezado: "Suc.", ancho: "56px", celda: (o) => <span className="num t-texto-sm">{e.sucursales.find((s) => s.id === o.sucursalId)?.codigo}</span> },
    { id: "fecha", encabezado: "Fecha", ancho: "100px", orden: (o) => o.fecha, celda: (o) => <span className="num t-texto-sm text-muted-foreground">{new Date(o.fecha).toLocaleDateString("es-AR")}</span> },
    { id: "items", encabezado: "Ítems", ancho: "60px", alinear: "der", celda: (o) => <span className="num t-texto-sm">{o.items.length}</span> },
    { id: "estado", encabezado: "Estado", ancho: "140px", orden: (o) => o.estado, celda: (o) => <ChipCompra estado={o.estado} /> },
    { id: "total", encabezado: "Total", ancho: "120px", alinear: "der", orden: (o) => o.total, celda: (o) => <span className="num">{formatoPesos(o.total, { sinDecimales: true })}</span> },
  ]

  const crearDesdeSugerencia = async (proveedorId: Id, items: { productoId: Id; cantidad: number; costoUnitario: number }[]) => {
    const id = motor.uuid()
    const n = await motor.siguienteLocal("compra")
    const r = await ejecutar(
      "compra.guardar",
      { orden: { id, sucursalId, proveedorId, numeroLocal: `OC-L${String(n).padStart(4, "0")}`, fecha: new Date().toISOString(), items: items.map((i) => ({ ...i, recibido: 0 })), notas: "Sugerida por stock mínimo" } },
      sucursalId,
    )
    if (!r.ok) return toast.error(r.error)
    toast.success("Orden creada en borrador")
    abrir(id)
  }

  const pendientes = ordenes.filter((o) => o.estado === "enviada" || o.estado === "recibida_parcial")

  return (
    <Requiere permiso="compras.ver" modulo="compras">
      <EncabezadoPagina
        ficha={`Compras · ${pendientes.length} órdenes por recibir · ${formatoPesosCorto(pendientes.reduce((t, o) => t + o.total, 0))}`}
        titulo="Compras y proveedores"
        descripcion="Órdenes sugeridas por stock mínimo y recepción con ingreso de stock."
        acciones={
          puede("compras.editar") && (
            <Button onClick={() => setEditor(true)}>
              <Plus /> Nueva orden
            </Button>
          )
        }
      />
      <Tabs defaultValue="ordenes">
        <TabsList className="mb-3">
          <TabsTrigger value="ordenes">Órdenes</TabsTrigger>
          <TabsTrigger value="sugerencias">Sugerencias {sugerencias.length > 0 && <span className="num ml-1 rounded bg-alerta/20 px-1 t-texto-sm">{sugerencias.reduce((t, s) => t + s.items.length, 0)}</span>}</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
        </TabsList>
        <TabsContent value="ordenes">
          <TablaRapida etiqueta="Órdenes de compra" filas={ordenes} columnas={columnas} clave={(o) => o.id} onElegir={(o) => abrir(o.id)} alto="calc(100dvh - 330px)"
            tarjeta={(o) => (
              <div className="flex w-full items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate t-texto-sm">{e.proveedores.find((p) => p.id === o.proveedorId)?.nombre}</p>
                  <p className="ficha">{o.numero ? `OC #${o.numero}` : o.numeroLocal} · {new Date(o.fecha).toLocaleDateString("es-AR")}</p>
                </div>
                <ChipCompra estado={o.estado} />
              </div>
            )}
            vacio={<Vacio icono={PackagePlus} titulo="Todavía no hay órdenes de compra" />}
          />
        </TabsContent>
        <TabsContent value="sugerencias">
          {sugerencias.length === 0 ? (
            <Vacio icono={Sparkles} titulo="No hay nada para reponer en esta sucursal" texto="Todo está por encima del stock mínimo o ya tiene una orden en curso." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {sugerencias.map(({ proveedor, items }) => (
                <section key={proveedor.id} className="rounded-xl border border-linea bg-card p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{proveedor.nombre}</h3>
                      <p className="t-texto-sm text-muted-foreground">
                        {items.length} producto(s) · entrega en ~{proveedor.diasEntrega} días · {formatoPesosCorto(items.reduce((t, i) => t + i.cantidad * i.costoUnitario, 0))}
                      </p>
                    </div>
                    {puede("compras.editar") && (
                      <Button size="sm" onClick={() => crearDesdeSugerencia(proveedor.id, items)}>
                        Crear orden
                      </Button>
                    )}
                  </div>
                  <ul className="space-y-1 t-texto-sm">
                    {items.slice(0, 8).map((i) => (
                      <li key={i.productoId} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">{e.productos[i.productoId].nombre}</span>
                        <span className="num t-texto-sm text-muted-foreground">
                          hay {formatoCantidad(i.stock)} / mín {formatoCantidad(i.minimo)}
                        </span>
                        <span className="num w-14 text-right font-medium">+{formatoCantidad(i.cantidad)}</span>
                      </li>
                    ))}
                    {items.length > 8 && <li className="t-texto-sm text-muted-foreground">y {items.length - 8} más…</li>}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="proveedores">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {e.proveedores.map((p) => (
              <li key={p.id} className="rounded-xl border border-linea bg-card p-4 t-texto-sm">
                <p className="font-semibold">{p.nombre}</p>
                <p className="ficha mt-0.5">CUIT {p.cuit}</p>
                <p className="mt-2 text-muted-foreground">{p.contacto}</p>
                <p className="num t-texto-sm text-muted-foreground">{p.telefono} · {p.email}</p>
                <p className="mt-2 t-texto-sm">Entrega estimada: {p.diasEntrega} días · {Object.values(e.productos).filter((x) => x.proveedorId === p.id).length} productos</p>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
      <DetalleCompra id={seleccionada} onCerrar={() => abrir(null)} />
      {editor && <EditorCompra onCerrar={() => setEditor(false)} onCreada={(id) => abrir(id)} />}
    </Requiere>
  )
}
