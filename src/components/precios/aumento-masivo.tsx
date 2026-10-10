"use client"

import { useMemo, useState } from "react"
import { ArrowRight, TrendingUp } from "lucide-react"
import { SelectorMultiple } from "@/components/app/selector-multiple"
import { TablaRapida, type Columna } from "@/components/app/tabla-rapida"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatoPesos, formatoPesosCorto, formatoPorcentaje } from "@/dominio/dinero"
import type { EstadoEmpresa } from "@/dominio/estado"
import { calcularAumento, UMBRAL_MARGEN_BAJO, type CambioPrecio, type ParametrosAumento } from "@/dominio/precios"
import type { Redondeo } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

const REDONDEOS: { id: Redondeo; nombre: string }[] = [
  { id: "10", nombre: "A $10" },
  { id: "100", nombre: "A $100" },
  { id: "1000", nombre: "A $1.000" },
  { id: "99", nombre: "Terminado en ,99" },
  { id: "ninguno", nombre: "Sin redondeo" },
]

/**
 * Aumento masivo con vista previa del impacto. Funciona sobre cualquier
 * estado: la app (aplica con una operación) y el sitio (demo sin aplicar).
 */
export function AumentoMasivo({
  e,
  verCostos,
  onAplicar,
  compacto = false,
  inicial,
}: {
  e: EstadoEmpresa
  verCostos: boolean
  onAplicar?: (p: ParametrosAumento, descripcion: string) => Promise<boolean>
  compacto?: boolean
  inicial?: Partial<{ marcaIds: string[]; porcentaje: number }>
}) {
  const [marcaIds, setMarcas] = useState<string[]>(inicial?.marcaIds ?? [])
  const [categoriaIds, setCategorias] = useState<string[]>([])
  const [proveedorIds, setProveedores] = useState<string[]>([])
  const [porcentaje, setPorcentaje] = useState(String(inicial?.porcentaje ?? 8))
  const [listaIds, setListas] = useState<string[]>(e.listas.map((l) => l.id))
  const [redondeo, setRedondeo] = useState<Redondeo>("10")
  const [descripcion, setDescripcion] = useState("")
  const [aplicando, setAplicando] = useState(false)

  const pct = Number(porcentaje.replace(",", "."))
  const parametros: ParametrosAumento = { filtro: { marcaIds, categoriaIds, proveedorIds }, porcentaje: pct, listaIds, redondeo }
  const claveFiltros = [listaIds.join(), marcaIds.join(), categoriaIds.join(), proveedorIds.join()].join("|")
  const vista = useMemo(() => {
    try {
      return Number.isFinite(pct) && pct !== 0 && listaIds.length ? calcularAumento(e, parametros) : null
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e, pct, redondeo, claveFiltros])

  const nombreLista = (id: string) => e.listas.find((l) => l.id === id)?.nombre ?? ""
  const columnas: Columna<CambioPrecio>[] = [
    {
      id: "producto",
      encabezado: "Producto",
      ancho: "minmax(220px,2fr)",
      orden: (c) => e.productos[c.productoId].nombre,
      celda: (c) => (
        <div className="min-w-0">
          <p className="truncate">{e.productos[c.productoId].nombre}</p>
          <p className="ficha">{nombreLista(c.listaId)}</p>
        </div>
      ),
    },
    { id: "antes", encabezado: "Hoy", ancho: "104px", alinear: "der", orden: (c) => c.antes, celda: (c) => <span className="num text-muted-foreground">{formatoPesos(c.antes, { sinDecimales: true })}</span> },
    { id: "despues", encabezado: "Nuevo", ancho: "112px", alinear: "der", orden: (c) => c.despues, celda: (c) => <span className="num font-semibold">{formatoPesos(c.despues, { sinDecimales: true })}</span> },
    {
      id: "dif",
      encabezado: "Dif.",
      ancho: "70px",
      alinear: "der",
      orden: (c) => c.despues / c.antes,
      celda: (c) => <span className="num text-xs text-ok-texto">+{formatoPorcentaje(((c.despues - c.antes) / c.antes) * 100, 1)}</span>,
    },
    ...(verCostos
      ? [
          {
            id: "margen",
            encabezado: "Margen",
            ancho: "112px",
            alinear: "der" as const,
            orden: (c: CambioPrecio) => c.margenDespues ?? 0,
            celda: (c: CambioPrecio) => (
              <span className={cn("num text-xs", c.margenDespues !== null && c.margenDespues < UMBRAL_MARGEN_BAJO ? "text-error-texto" : "text-muted-foreground")}>
                {c.margenAntes === null ? "—" : formatoPorcentaje(c.margenAntes, 0)} → {c.margenDespues === null ? "—" : formatoPorcentaje(c.margenDespues, 0)}
              </span>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className={cn("grid gap-4", !compacto && "lg:grid-cols-[340px_minmax(0,1fr)]")}>
      <div className="space-y-4 rounded-xl border border-linea bg-card p-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold">¿Qué productos?</p>
          <SelectorMultiple etiqueta="Marcas" opciones={[...e.marcas].sort((a, b) => a.nombre.localeCompare(b.nombre))} valor={marcaIds} onCambio={setMarcas} />
          {!compacto && (
            <>
              <SelectorMultiple etiqueta="Categorías" opciones={e.categorias} valor={categoriaIds} onCambio={setCategorias} />
              <SelectorMultiple etiqueta="Proveedores" opciones={e.proveedores} valor={proveedorIds} onCambio={setProveedores} />
            </>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="aumento-pct" className="text-sm font-semibold">
            ¿Cuánto?
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative w-28">
              <Input id="aumento-pct" inputMode="decimal" value={porcentaje} onChange={(ev) => setPorcentaje(ev.target.value)} className="num h-11 pr-7 text-lg" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {[5, 8, 10, 15].map((n) => (
                <button key={n} type="button" onClick={() => setPorcentaje(String(n))} className={cn("rounded-md border px-2 py-1 text-xs", pct === n ? "border-primary bg-primary/15" : "border-linea hover:border-acero/50")}>
                  {n} %
                </button>
              ))}
            </div>
          </div>
        </div>
        {!compacto && (
          <>
            <fieldset className="space-y-1.5">
              <legend className="mb-1 text-sm font-semibold">¿En qué listas?</legend>
              {e.listas.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={listaIds.includes(l.id)} onCheckedChange={(c) => setListas((xs) => (c ? [...xs, l.id] : xs.filter((x) => x !== l.id)))} />
                  {l.nombre}
                </label>
              ))}
            </fieldset>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Redondeo</Label>
              <Select value={redondeo} onValueChange={(v) => setRedondeo(v as Redondeo)}>
                <SelectTrigger className="w-full" aria-label="Redondeo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REDONDEOS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        <div className={cn("grid gap-3", compacto ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4")}>
          <Resumen etiqueta="Productos afectados" valor={vista ? vista.productos.toLocaleString("es-AR") : "—"} pie={vista ? `${vista.cambios.length.toLocaleString("es-AR")} precios` : undefined} />
          <Resumen etiqueta="Aumento real" valor={vista ? `+${formatoPorcentaje(vista.aumentoPromedio, 1)}` : "—"} pie="después del redondeo" />
          {verCostos && <Resumen etiqueta={`Margen bajo ${UMBRAL_MARGEN_BAJO} %`} valor={vista ? String(vista.margenBajo) : "—"} pie="productos a revisar" alerta={Boolean(vista?.margenBajo)} />}
          <Resumen etiqueta="Stock valorizado" valor={vista ? `+${formatoPesosCorto(vista.impactoStock)}` : "—"} pie={`a precio ${nombreLista(listaIds[0] ?? "")}`} />
        </div>
        {vista && vista.cambios.length > 0 ? (
          <TablaRapida etiqueta="Vista previa de precios" filas={vista.cambios} columnas={columnas} clave={(c) => `${c.listaId}:${c.productoId}`} alto={compacto ? 300 : 440} altoFila={50}
            tarjeta={(c) => (
              <div className="flex w-full items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{e.productos[c.productoId].nombre}</span>
                <span className="num text-xs text-muted-foreground">{formatoPesos(c.antes, { sinDecimales: true })}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span className="num font-semibold">{formatoPesos(c.despues, { sinDecimales: true })}</span>
              </div>
            )}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-linea p-8 text-center text-sm text-muted-foreground">Elegí productos y un porcentaje para ver la vista previa.</div>
        )}
        {onAplicar && vista && vista.cambios.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-linea bg-card p-3">
            <Input value={descripcion} onChange={(ev) => setDescripcion(ev.target.value)} placeholder="Descripción (ej.: lista de proveedor de marzo)" className="min-w-52 flex-1" aria-label="Descripción del aumento" />
            <Button
              disabled={aplicando}
              onClick={async () => {
                setAplicando(true)
                const ok = await onAplicar(parametros, descripcion || `Aumento ${pct} %`)
                setAplicando(false)
                if (ok) setDescripcion("")
              }}
            >
              <TrendingUp /> Aplicar a {vista.cambios.length.toLocaleString("es-AR")} precios
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Resumen({ etiqueta, valor, pie, alerta }: { etiqueta: string; valor: string; pie?: string; alerta?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", alerta ? "border-chispa/50" : "border-linea")}>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight">{valor}</p>
      {pie && <p className="text-[11px] text-muted-foreground">{pie}</p>}
    </div>
  )
}
