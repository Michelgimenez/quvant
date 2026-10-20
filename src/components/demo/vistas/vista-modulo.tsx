"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { TablaRapida, type Columna } from "@/components/app/tabla-rapida"
import { EstadoFeatureBadge } from "@/components/base/sellos"
import { Input } from "@/components/ui/input"
import { Tarjeta } from "@/components/negocio/piezas"
import { formatoPesos } from "@/dominio/dinero"
import { normalizar } from "@/lib/texto"
import type { ClienteNegocio, ProductoNegocio } from "@/dominio/negocio"
import { stockGrupo } from "@/demo/generar"
import { EMPRESAS, type IdEmpresa, type ModuloDemo } from "@/demo/empresas"
import { feature, type EstadoFeature } from "@/showcase/features"
import { cn } from "@/lib/utils"
import { useDatosEmpresa } from "../contexto"

/** El estado real de cada módulo en el registro de funcionalidades (el sello se ve siempre). */
const FEATURE_DE: Partial<Record<ModuloDemo, string>> = {
  mostrador: "mostrador",
  caja: "caja",
  fiado: "clientes-cuentas",
  presupuestos: "presupuestos",
  servicio: "servicio-tecnico",
  inventario: "inventario-multisucursal",
  transferencias: "transferencias",
  precios: "aumento-masivo",
  compras: "compras",
  proveedores: "compras",
  clientes: "clientes-cuentas",
  reportes: "reportes",
  permisos: "roles-permisos",
  auditoria: "auditoria",
  forja: "forja",
}

/** Lo que en una empresa en particular tiene su propia ficha en el registro. */
const FEATURE_POR_EMPRESA: Partial<Record<IdEmpresa, Partial<Record<ModuloDemo, string>>>> = {
  kiosco: { mostrador: "mostrador-kiosco", fiado: "fiado", proveedores: "pedido-sugerido" },
  distribuidora: { preventa: "preventa", reparto: "hoja-ruta-mapa", cobranzas: "cobranzas-calle" },
  grupo: { sucursales: "comparacion-sucursales", comparacion: "comparacion-sucursales", aprobaciones: "aprobaciones-niveles" },
}

export function SelloModulo({ modulo, empresa }: { modulo: ModuloDemo; empresa?: IdEmpresa }) {
  const id = (empresa && FEATURE_POR_EMPRESA[empresa]?.[modulo]) ?? FEATURE_DE[modulo]
  const f = id ? feature(id) : null
  const estado: EstadoFeature = f?.estado ?? "demo"
  return <EstadoFeatureBadge estado={estado} />
}

function nombreModulo(empresa: IdEmpresa, modulo: ModuloDemo) {
  return EMPRESAS[empresa].navegacion.flatMap((g) => g.items).find((i) => i.modulo === modulo)?.nombre ?? modulo
}

export function EncabezadoModulo({ empresa, modulo, detalle, acciones }: { empresa: IdEmpresa; modulo: ModuloDemo; detalle: string; acciones?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="t-etiqueta text-muted-foreground">{EMPRESAS[empresa].nombreCorto}</p>
          <SelloModulo modulo={modulo} empresa={empresa} />
        </div>
        <h1 className="t-titulo">{nombreModulo(empresa, modulo)}</h1>
        <p className="t-texto-sm max-w-2xl text-muted-foreground">{detalle}</p>
      </div>
      {acciones}
    </div>
  )
}

function Buscador({ valor, onCambio, placeholder }: { valor: string; onCambio: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-md flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} className="h-10 pl-9" aria-label={placeholder} />
    </div>
  )
}

/** Productos y stock: tabla virtualizada (en el grupo, 25.000 filas, con el stock por sucursal calculado a pedido). */
export function VistaProductos({ empresa, modulo }: { empresa: IdEmpresa; modulo: ModuloDemo }) {
  const datos = useDatosEmpresa(empresa)
  const [q, setQ] = useState("")
  const busqueda = useDeferredValue(q)
  const esGrupo = empresa === "grupo"
  const filas = useMemo(() => {
    const n = normalizar(busqueda)
    const lista = n ? datos.productos.filter((p) => normalizar(`${p.nombre} ${p.sku} ${p.codigo} ${p.categoria}`).includes(n)) : datos.productos
    return lista
  }, [datos, busqueda])
  const stockDe = (p: ProductoNegocio) => (esGrupo ? datos.sucursales.reduce((a, _, s) => a + stockGrupo(Number(p.id.slice(2)), s), 0) : p.stock)
  const columnas: Columna<ProductoNegocio>[] = [
    { id: "nombre", encabezado: "Producto", celda: (p) => <span className="t-texto-sm block truncate">{p.nombre}</span>, orden: (p) => p.nombre },
    { id: "sku", encabezado: "SKU", celda: (p) => <span className="t-dato text-muted-foreground">{p.sku}</span>, orden: (p) => p.sku, ancho: "130px" },
    { id: "categoria", encabezado: "Categoría", celda: (p) => <span className="t-dato truncate text-muted-foreground">{p.categoria}</span>, orden: (p) => p.categoria, ancho: "170px" },
    {
      id: "stock",
      encabezado: esGrupo ? "Stock · 40 suc." : "Stock",
      celda: (p) => {
        const s = stockDe(p)
        return <span className={cn("t-dato", s <= 0 ? "text-error" : s <= p.minimo ? "text-alerta" : "")}>{s.toLocaleString("es-AR")}</span>
      },
      orden: (p) => stockDe(p),
      ancho: "120px",
      alinear: "der",
    },
    { id: "precio", encabezado: "Precio", celda: (p) => <span className="t-dato font-semibold">{formatoPesos(p.precio, { sinDecimales: true })}</span>, orden: (p) => p.precio, ancho: "120px", alinear: "der" },
  ]
  return (
    <div>
      <EncabezadoModulo
        empresa={empresa}
        modulo={modulo}
        detalle={esGrupo ? `${datos.productos.length.toLocaleString("es-AR")} productos en ${datos.sucursales.length} sucursales. La búsqueda y el orden andan sobre el catálogo completo; el stock de cada sucursal se calcula al mirarlo.` : `${datos.productos.length.toLocaleString("es-AR")} productos, con su stock y su precio.`}
      />
      <div className="mb-3 flex items-center gap-3">
        <Buscador valor={q} onCambio={setQ} placeholder="Buscar por nombre, SKU o código" />
        <span className="t-dato text-muted-foreground">{filas.length.toLocaleString("es-AR")} resultados</span>
      </div>
      <TablaRapida filas={filas} columnas={columnas} clave={(p) => p.id} etiqueta="Productos" alto="calc(100dvh - 300px)" altoFila={40} />
    </div>
  )
}

/** Clientes y cuentas corrientes (o el fiado de los vecinos, en el kiosco). */
export function VistaClientes({ empresa, modulo }: { empresa: IdEmpresa; modulo: ModuloDemo }) {
  const datos = useDatosEmpresa(empresa)
  const [q, setQ] = useState("")
  const filas = useMemo(() => {
    const n = normalizar(q)
    return datos.clientes.filter((c) => !n || normalizar(`${c.nombre} ${c.zona}`).includes(n))
  }, [datos, q])
  const columnas: Columna<ClienteNegocio>[] = [
    { id: "nombre", encabezado: empresa === "kiosco" ? "Vecino" : "Cliente", celda: (c) => <span className="t-texto-sm block truncate">{c.nombre}</span>, orden: (c) => c.nombre },
    { id: "zona", encabezado: "Zona", celda: (c) => <span className="t-dato text-muted-foreground">{c.zona}</span>, orden: (c) => c.zona, ancho: "200px" },
    { id: "lista", encabezado: "Lista", celda: (c) => <span className="t-dato text-muted-foreground">{c.lista}</span>, orden: (c) => c.lista, ancho: "200px" },
    { id: "dias", encabezado: "Días", celda: (c) => <span className={cn("t-dato", c.diasDeuda > 30 && "text-alerta")}>{c.diasDeuda || "—"}</span>, orden: (c) => c.diasDeuda, ancho: "80px", alinear: "der" },
    { id: "saldo", encabezado: "Debe", celda: (c) => <span className="t-dato font-semibold">{c.saldo ? formatoPesos(c.saldo, { sinDecimales: true }) : "—"}</span>, orden: (c) => c.saldo, ancho: "140px", alinear: "der" },
  ]
  return (
    <div>
      <EncabezadoModulo empresa={empresa} modulo={modulo} detalle={`${datos.clientes.length} ${empresa === "kiosco" ? "vecinos" : "clientes"}, con su saldo y su lista de precios.`} />
      <div className="mb-3 flex items-center gap-3">
        <Buscador valor={q} onCambio={setQ} placeholder="Buscar por nombre o zona" />
      </div>
      <TablaRapida filas={filas} columnas={columnas} clave={(c) => c.id} etiqueta="Clientes" alto="calc(100dvh - 300px)" altoFila={40} ordenInicial={{ id: "saldo", asc: false }} />
    </div>
  )
}

/** Un módulo sin recorrido propio todavía: qué hace y su estado real. */
export function VistaModuloGenerica({ empresa, modulo }: { empresa: IdEmpresa; modulo: ModuloDemo }) {
  const id = FEATURE_DE[modulo]
  const f = id ? feature(id) : null
  return (
    <div>
      <EncabezadoModulo empresa={empresa} modulo={modulo} detalle={f?.frase ?? "Un módulo de Quvant."} />
      <Tarjeta densidad="amplia" className="max-w-2xl">
        <p className="t-texto">{f?.frase}</p>
        {f?.nota && <p className="t-texto-sm text-muted-foreground">{f.nota}</p>}
        <p className="t-texto-sm text-muted-foreground">En esta demo, el recorrido de este módulo se ve desde el tablero. En la app real funciona con los datos de tu negocio.</p>
      </Tarjeta>
    </div>
  )
}
