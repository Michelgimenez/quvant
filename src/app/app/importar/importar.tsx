"use client"

import { useMemo, useState } from "react"
import Papa from "papaparse"
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { EncabezadoPagina, Panel, Requiere } from "@/components/app/pagina"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatoCantidad, formatoPesos } from "@/dominio/dinero"
import { CAMPOS, detectarColumnas, NOMBRE_CAMPO, OBLIGATORIOS, PLANTILLA_CSV, validarFilas, type Mapeo } from "@/dominio/importacion"
import { descargarArchivo } from "@/lib/csv"
import { cn } from "@/lib/utils"

type Archivo = { nombre: string; encabezados: string[]; filas: (string | number | null)[][] }

async function leerArchivo(f: File): Promise<Archivo> {
  if (f.size > 10 * 1024 * 1024) throw new Error("El archivo supera los 10 MB")
  if (/\.xlsx$/i.test(f.name)) {
    const { readSheet } = await import("read-excel-file/browser")
    const datos = await readSheet(f)
    const [enc, ...resto] = datos
    return {
      nombre: f.name,
      encabezados: (enc ?? []).map((c) => String(c ?? "")),
      filas: resto.map((r) => r.map((c) => (c === null || c === undefined ? null : c instanceof Date ? c.toISOString().slice(0, 10) : typeof c === "number" ? c : String(c)))),
    }
  }
  const texto = await f.text()
  const r = Papa.parse<string[]>(texto.replace(/^﻿/, ""), { skipEmptyLines: "greedy" })
  const [enc, ...resto] = r.data
  return { nombre: f.name, encabezados: enc ?? [], filas: resto }
}

export function Importar() {
  return (
    <Requiere permiso="importar.datos">
      <Asistente />
    </Requiere>
  )
}

function Asistente() {
  const { e } = useDatos()
  const { ejecutar, motor, sucursalesPermitidas } = useApp()
  const [archivo, setArchivo] = useState<Archivo | null>(null)
  const [mapeo, setMapeo] = useState<Mapeo | null>(null)
  const [listaId, setListaId] = useState(e.listas.find((l) => l.esDefault)?.id ?? e.listas[0].id)
  const [sucursalId, setSucursalId] = useState<string>("ninguna")
  const [resultado, setResultado] = useState<{ creados: number; actualizados: number } | null>(null)
  const [arrastrando, setArrastrando] = useState(false)

  const validacion = useMemo(() => (archivo && mapeo ? validarFilas(e, archivo.filas, mapeo) : null), [archivo, mapeo, e])

  const cargar = async (f: File) => {
    try {
      const a = await leerArchivo(f)
      if (!a.encabezados.length) throw new Error("El archivo está vacío")
      setArchivo(a)
      setMapeo(detectarColumnas(a.encabezados))
      setResultado(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const paso = !archivo ? 1 : resultado ? 4 : 2

  return (
    <>
      <EncabezadoPagina
        ficha="Importación de datos"
        titulo="Traé tu catálogo"
        descripcion="Desde Excel o CSV, con el formato de tu sistema actual. Asignás las columnas, revisás los errores y recién ahí se importa."
        acciones={
          <Button variant="outline" onClick={() => descargarArchivo("plantilla-quvant.csv", "﻿" + PLANTILLA_CSV)}>
            <Download /> Plantilla CSV
          </Button>
        }
      />
      <ol className="mb-4 flex flex-wrap gap-2 t-texto-sm" aria-label="Pasos">
        {["Subir archivo", "Asignar columnas y revisar", "Importar"].map((p, i) => (
          <li key={p} className={cn("rounded-full border px-3 py-1", paso >= i + 1 ? "border-primary/50 bg-primary/10 text-foreground" : "border-linea text-muted-foreground")}>
            {i + 1}. {p}
          </li>
        ))}
      </ol>

      {!archivo && (
        <label
          onDragOver={(ev) => {
            ev.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(ev) => {
            ev.preventDefault()
            setArrastrando(false)
            const f = ev.dataTransfer.files[0]
            if (f) void cargar(f)
          }}
          className={cn("flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors", arrastrando ? "border-primary bg-primary/5" : "border-linea hover:border-acero/50")}
        >
          <FileSpreadsheet className="size-8 text-muted-foreground" />
          <span className="font-semibold">Arrastrá el archivo o hacé clic para elegirlo</span>
          <span className="t-texto-sm text-muted-foreground">Excel (.xlsx) o CSV, hasta 10 MB. No se modifica nada hasta que confirmes.</span>
          <input type="file" accept=".csv,.xlsx,text/csv" className="sr-only" onChange={(ev) => ev.target.files?.[0] && void cargar(ev.target.files[0])} data-testid="archivo-importacion" />
        </label>
      )}

      {archivo && mapeo && validacion && !resultado && (
        <div className="space-y-4">
          <Panel titulo={`Columnas de “${archivo.nombre}”`} ficha={`${archivo.filas.length} filas`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {CAMPOS.map((c) => (
                <div key={c} className="space-y-1">
                  <Label className="t-texto-sm">
                    {NOMBRE_CAMPO[c]}
                    {OBLIGATORIOS.includes(c) && <span className="text-error"> *</span>}
                  </Label>
                  <Select value={mapeo[c] === null ? "-" : String(mapeo[c])} onValueChange={(x) => setMapeo({ ...mapeo, [c]: x === "-" ? null : Number(x) })}>
                    <SelectTrigger size="sm" className="w-full" aria-label={NOMBRE_CAMPO[c]}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">— No importar —</SelectItem>
                      {archivo.encabezados.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Columna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-3">
            <Resumen icono={CheckCircle2} tono="ok" titulo="Listas para importar" valor={validacion.validas.length} pie={`${validacion.nuevos} nuevas · ${validacion.actualizados} actualizan productos existentes`} />
            <Resumen icono={AlertTriangle} tono={validacion.errores.length ? "alerta" : "ok"} titulo="Con errores" valor={new Set(validacion.errores.map((x) => x.fila)).size} pie="no se importan; corregilas en el archivo y volvé a subirlo" />
            <Panel titulo="Destino">
              <div className="space-y-2">
                <Select value={listaId} onValueChange={setListaId}>
                  <SelectTrigger size="sm" className="w-full" aria-label="Lista de precios destino">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {e.listas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        Precios a lista {l.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sucursalId} onValueChange={setSucursalId}>
                  <SelectTrigger size="sm" className="w-full" aria-label="Sucursal del stock">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguna">No tocar el stock</SelectItem>
                    {sucursalesPermitidas.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Stock en {s.codigo} · {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Panel>
          </div>

          {validacion.errores.length > 0 && (
            <Panel titulo="Errores encontrados">
              <ul className="max-h-60 space-y-1 overflow-auto t-texto-sm">
                {validacion.errores.slice(0, 200).map((x, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="num w-16 shrink-0 text-muted-foreground">Fila {x.fila}</span>
                    <span>{x.mensaje}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {validacion.validas.length > 0 && (
            <Panel titulo="Vista previa" ficha="Primeras 8 filas válidas">
              <div className="overflow-auto">
                <table className="w-full t-texto-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      {["SKU", "Descripción", "Rubro", "Marca", "Costo", "Precio", "Stock"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validacion.validas.slice(0, 8).map((f) => (
                      <tr key={f.sku} className="border-t border-linea">
                        <td className="num px-2 py-1.5">{f.sku}</td>
                        <td className="px-2 py-1.5">{f.nombre}</td>
                        <td className="px-2 py-1.5">{f.categoria}</td>
                        <td className="px-2 py-1.5">{f.marca}</td>
                        <td className="num px-2 py-1.5">{formatoPesos(f.costo)}</td>
                        <td className="num px-2 py-1.5">{f.precio === null ? "—" : formatoPesos(f.precio)}</td>
                        <td className="num px-2 py-1.5">{f.stock === null ? "—" : formatoCantidad(f.stock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!validacion.validas.length}
              onClick={async () => {
                const r = await ejecutar("importar.productos", { importacionId: motor.uuid(), filas: validacion.validas, listaId, sucursalId: sucursalId === "ninguna" ? null : sucursalId }, null)
                if (!r.ok) return toast.error(r.error)
                setResultado({ creados: Number(r.asignado?.creados ?? 0), actualizados: Number(r.asignado?.actualizados ?? 0) })
              }}
            >
              <Upload /> Importar {validacion.validas.length} productos
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setArchivo(null)
                setMapeo(null)
              }}
            >
              Elegir otro archivo
            </Button>
          </div>
        </div>
      )}

      {resultado && (
        <Panel>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="size-10 text-ok" />
            <p className="text-lg font-semibold">Importación terminada</p>
            <p className="t-texto-sm text-muted-foreground">
              {resultado.creados} productos nuevos y {resultado.actualizados} actualizados. Quedó registrado en la auditoría.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setArchivo(null)
                setMapeo(null)
                setResultado(null)
              }}
            >
              Importar otro archivo
            </Button>
          </div>
        </Panel>
      )}
    </>
  )
}

function Resumen({ icono: Icono, tono, titulo, valor, pie }: { icono: React.ComponentType<{ className?: string }>; tono: "ok" | "alerta"; titulo: string; valor: number; pie: string }) {
  return (
    <div className="rounded-xl border border-linea bg-card p-4">
      <p className="flex items-center gap-2 t-texto-sm text-muted-foreground">
        <Icono className={cn("size-4", tono === "ok" ? "text-ok" : "text-alerta")} /> {titulo}
      </p>
      <p className="mt-1 text-3xl font-semibold">{valor.toLocaleString("es-AR")}</p>
      <p className="t-texto-sm text-muted-foreground">{pie}</p>
    </div>
  )
}
