"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftRight, ClipboardCheck, PackageX, Plus, ScanBarcode, Search, X } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { EscanerCodigo } from "@/components/app/escaner"
import { EncabezadoPagina, Requiere, Vacio } from "@/components/app/pagina"
import { TablaRapida, type Columna } from "@/components/app/tabla-rapida"
import { MiniaturaProducto } from "@/components/base/ilustracion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buscarProductos, ejemplosEscaneo } from "@/dominio/busqueda"
import { formatoCantidad, formatoPesos, formatoPesosCorto, formatoPorcentaje } from "@/dominio/dinero"
import { claveStock, listaDefault, precioDe } from "@/dominio/estado"
import { estadoStock, stockValorizado } from "@/dominio/indicadores"
import { margen } from "@/dominio/precios"
import type { Producto } from "@/dominio/tipos"
import { cn } from "@/lib/utils"
import { DetalleProducto } from "./detalle-producto"
import { DialogoNuevoProducto, DialogoTransferencia } from "./dialogos"

type FiltroStock = "todos" | "sin" | "bajo"

export function Inventario() {
  const { e, v } = useDatos()
  const { puede, usuario } = useApp()
  const params = useSearchParams()
  const router = useRouter()
  const [texto, setTexto] = useState("")
  const [categoria, setCategoria] = useState("todas")
  const [marca, setMarca] = useState("todas")
  // Desde Forja se llega filtrado por sucursal y ubicación ("HE-A": un rack del depósito)
  const sucursalPedida = params.get("sucursal")
  const [sucursal, setSucursal] = useState(
    sucursalPedida && (usuario.sucursalIds === null || usuario.sucursalIds.includes(sucursalPedida)) ? sucursalPedida : usuario.sucursalIds?.length === 1 ? usuario.sucursalIds[0] : "todas",
  )
  const [filtroStock, setFiltroStock] = useState<FiltroStock>((params.get("stock") as FiltroStock) ?? "todos")
  const ubicacion = sucursal === "todas" ? null : params.get("ubicacion")
  const [escaner, setEscaner] = useState(false)
  const [transferir, setTransferir] = useState(false)
  const [nuevo, setNuevo] = useState(false)
  const seleccionado = params.get("producto")

  const sucursales = useMemo(
    () => e.sucursales.filter((s) => usuario.sucursalIds === null || usuario.sucursalIds.includes(s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v],
  )
  const lista = listaDefault(e)
  const verCostos = puede("costos.ver")

  const abrir = useCallback(
    (id: string | null) => {
      const p = new URLSearchParams(params.toString())
      if (id) p.set("producto", id)
      else p.delete("producto")
      router.replace(`/app/inventario${p.size ? `?${p}` : ""}`, { scroll: false })
    },
    [params, router],
  )

  const filas = useMemo(() => {
    let base = texto.trim() ? buscarProductos(e, texto, 500) : Object.values(e.productos).filter((p) => p.activo)
    if (categoria !== "todas") base = base.filter((p) => p.categoriaId === categoria)
    if (marca !== "todas") base = base.filter((p) => p.marcaId === marca)
    const sucs = sucursal === "todas" ? sucursales.map((s) => s.id) : [sucursal]
    if (filtroStock !== "todos") base = base.filter((p) => sucs.some((s) => estadoStock(e, s, p.id) === filtroStock))
    if (sucursal !== "todas") base = base.filter((p) => e.stock[claveStock(sucursal, p.id)])
    if (ubicacion) base = base.filter((p) => e.stock[claveStock(sucursal, p.id)]?.ubicacion.startsWith(ubicacion))
    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, texto, categoria, marca, sucursal, filtroStock, sucursales, ubicacion])

  const quitarUbicacion = () => {
    const p = new URLSearchParams(params.toString())
    p.delete("ubicacion")
    router.replace(`/app/inventario${p.size ? `?${p}` : ""}`, { scroll: false })
  }

  const resumen = useMemo(() => {
    const sucs = sucursal === "todas" ? sucursales.map((s) => s.id) : [sucursal]
    let sin = 0
    let bajo = 0
    for (const p of Object.values(e.productos)) {
      if (sucs.some((s) => estadoStock(e, s, p.id) === "sin")) sin++
      else if (sucs.some((s) => estadoStock(e, s, p.id) === "bajo")) bajo++
    }
    return { sin, bajo, valorizado: sucursal === "todas" ? stockValorizado(e) : stockValorizado(e, sucursal) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, sucursal, sucursales])

  const nombreMarca = useMemo(() => new Map(e.marcas.map((m) => [m.id, m.nombre])), [e.marcas])
  const nombreCategoria = useMemo(() => new Map(e.categorias.map((c) => [c.id, c.nombre])), [e.categorias])
  const sucsVisibles = sucursal === "todas" ? sucursales : sucursales.filter((s) => s.id === sucursal)

  const total = (p: Producto) => sucsVisibles.reduce((t, s) => t + (e.stock[claveStock(s.id, p.id)]?.cantidad ?? 0), 0)

  const columnas: Columna<Producto>[] = [
    {
      id: "producto",
      encabezado: "Producto",
      ancho: "minmax(260px,2.4fr)",
      orden: (p) => p.nombre,
      celda: (p) => (
        <div className="flex items-center gap-3">
          <MiniaturaProducto tipo={p.ilustracion} className="size-9" />
          <div className="min-w-0">
            <p className="truncate font-medium">{p.nombre}</p>
            <p className="ficha truncate">
              {p.sku} · {nombreMarca.get(p.marcaId)}
            </p>
          </div>
        </div>
      ),
    },
    { id: "categoria", encabezado: "Categoría", ancho: "minmax(120px,1fr)", orden: (p) => nombreCategoria.get(p.categoriaId) ?? "", ocultarMovil: true, celda: (p) => <span className="truncate text-muted-foreground">{nombreCategoria.get(p.categoriaId)}</span> },
    ...sucsVisibles.map<Columna<Producto>>((s) => ({
      id: `suc-${s.id}`,
      encabezado: s.codigo,
      ancho: "72px",
      alinear: "der",
      orden: (p) => e.stock[claveStock(s.id, p.id)]?.cantidad ?? -1,
      celda: (p) => <CantidadStock cantidad={e.stock[claveStock(s.id, p.id)]?.cantidad} estado={estadoStock(e, s.id, p.id)} />,
    })),
    ...(sucsVisibles.length > 1 ? [{ id: "total", encabezado: "Total", ancho: "72px", alinear: "der" as const, orden: total, celda: (p: Producto) => <span className="num font-semibold">{formatoCantidad(total(p))}</span> }] : []),
    { id: "precio", encabezado: lista.nombre, ancho: "110px", alinear: "der", orden: (p) => precioDe(e, lista.id, p.id), celda: (p) => <span className="num">{formatoPesos(precioDe(e, lista.id, p.id), { sinDecimales: true })}</span> },
    ...(verCostos
      ? [
          {
            id: "margen",
            encabezado: "Margen",
            ancho: "76px",
            alinear: "der" as const,
            orden: (p: Producto) => margen(precioDe(e, lista.id, p.id), p.costo, p.iva) ?? 0,
            celda: (p: Producto) => {
              const m = margen(precioDe(e, lista.id, p.id), p.costo, p.iva)
              return <span className={cn("num text-xs", m !== null && m < 20 ? "text-error-texto" : "text-muted-foreground")}>{m === null ? "—" : formatoPorcentaje(m, 0)}</span>
            },
          },
        ]
      : []),
  ]

  const detectar = useCallback(
    (codigo: string) => {
      const [p] = buscarProductos(e, codigo, 1)
      if (p) abrir(p.id)
      else toast.error(`No hay ningún producto con el código ${codigo}`)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v, abrir],
  )

  return (
    <Requiere permiso="inventario.ver" modulo="inventario">
      <EncabezadoPagina
        ficha={`Inventario · ${Object.keys(e.productos).length} productos`}
        titulo="Inventario"
        descripcion="El stock de cada sucursal, en tiempo real."
        acciones={
          <>
            <Button variant="outline" onClick={() => setEscaner(true)}>
              <ScanBarcode /> Escanear
            </Button>
            {puede("conteo.realizar") && (
              <Button variant="outline" asChild>
                <Link href="/app/inventario/conteos">
                  <ClipboardCheck /> Conteos
                </Link>
              </Button>
            )}
            {puede("stock.transferir") && sucursales.length > 1 && (
              <Button variant="outline" onClick={() => setTransferir(true)}>
                <ArrowLeftRight /> Transferir
              </Button>
            )}
            {puede("inventario.editar") && (
              <Button onClick={() => setNuevo(true)}>
                <Plus /> Nuevo producto
              </Button>
            )}
          </>
        }
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Nombre, SKU o código de barras" className="h-10 pl-9" aria-label="Buscar producto" />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="h-10 w-full" aria-label="Categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {e.categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={marca} onValueChange={setMarca}>
          <SelectTrigger className="h-10 w-full" aria-label="Marca">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las marcas</SelectItem>
            {[...e.marcas].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sucursal} onValueChange={setSucursal}>
          <SelectTrigger className="h-10 w-full" aria-label="Sucursal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sucursales.length > 1 && <SelectItem value="todas">Todas las sucursales</SelectItem>}
            {sucursales.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.codigo} · {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Filtrar por estado de stock">
        {(
          [
            ["todos", "Todos", null],
            ["sin", "Sin stock", resumen.sin],
            ["bajo", "Bajo el mínimo", resumen.bajo],
          ] as const
        ).map(([id, nombre, n]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filtroStock === id}
            onClick={() => setFiltroStock(id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
              filtroStock === id ? "border-foreground/30 bg-muted font-semibold text-foreground" : "border-linea text-muted-foreground hover:text-foreground",
            )}
          >
            {id === "sin" && <span className="size-1.5 rounded-full bg-error" />}
            {id === "bajo" && <span className="size-1.5 rounded-full bg-chispa" />}
            {nombre}
            {n !== null && <span className="num">{n}</span>}
          </button>
        ))}
        {ubicacion && (
          <button type="button" onClick={quitarUbicacion} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-foreground/30 bg-muted px-3 text-xs font-semibold" data-testid="filtro-ubicacion">
            Ubicación {ubicacion}
            <X className="size-3.5" aria-label="Quitar filtro de ubicación" />
          </button>
        )}
        {verCostos && <span className="ml-auto text-xs text-muted-foreground">Stock valorizado a costo: <span className="num font-semibold text-foreground">{formatoPesosCorto(resumen.valorizado)}</span></span>}
      </div>

      <TablaRapida
        etiqueta="Productos e inventario"
        filas={filas}
        columnas={columnas}
        clave={(p) => p.id}
        onElegir={(p) => abrir(p.id)}
        alto="calc(100dvh - 330px)"
        altoFila={58}
        tarjeta={(p) => (
          <div className="flex w-full items-center gap-3">
            <MiniaturaProducto tipo={p.ilustracion} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{p.nombre}</p>
              <p className="ficha truncate">
                {p.sku} · {formatoPesos(precioDe(e, lista.id, p.id), { sinDecimales: true })}
              </p>
            </div>
            <div className="flex gap-1.5">
              {sucsVisibles.map((s) => (
                <span key={s.id} className="text-center">
                  <span className="block text-[9px] text-muted-foreground">{s.codigo}</span>
                  <CantidadStock cantidad={e.stock[claveStock(s.id, p.id)]?.cantidad} estado={estadoStock(e, s.id, p.id)} />
                </span>
              ))}
            </div>
          </div>
        )}
        vacio={<Vacio icono={PackageX} titulo="No hay productos con esos filtros" texto="Probá con otra búsqueda o limpiá los filtros." />}
      />

      <DetalleProducto productoId={seleccionado} onCerrar={() => abrir(null)} />
      <EscanerCodigo abierto={escaner} onAbierto={setEscaner} onDetectar={detectar} ejemplos={e.org.esDemo ? ejemplosEscaneo(e) : []} titulo="Consultar stock" />
      {transferir && <DialogoTransferencia onCerrar={() => setTransferir(false)} />}
      {nuevo && <DialogoNuevoProducto onCerrar={() => setNuevo(false)} onCreado={(id) => abrir(id)} />}
    </Requiere>
  )
}

export function CantidadStock({ cantidad, estado }: { cantidad: number | undefined; estado: ReturnType<typeof estadoStock> }) {
  if (estado === "no_lleva" || cantidad === undefined) return <span className="text-xs text-muted-foreground/60">—</span>
  return (
    <span
      className={cn(
        "num inline-flex min-w-9 justify-end rounded px-1.5 py-0.5 text-[13px]",
        estado === "sin" && "bg-error/15 font-semibold text-error-texto",
        estado === "bajo" && "bg-chispa/15 font-semibold text-chispa-texto",
      )}
      title={estado === "sin" ? "Sin stock" : estado === "bajo" ? "Bajo el mínimo" : undefined}
    >
      {formatoCantidad(cantidad)}
    </span>
  )
}
