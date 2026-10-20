"use client"

import { useMemo, useState } from "react"
import { CloudOff, Download, ScrollText, Search } from "lucide-react"
import { useDatos } from "@/cliente/app-contexto"
import { EncabezadoPagina, Requiere, Vacio } from "@/components/app/pagina"
import { TablaRapida, type Columna } from "@/components/app/tabla-rapida"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RegistroAuditoria } from "@/dominio/tipos"
import { descargarCSV } from "@/lib/csv"
import { normalizar } from "@/lib/texto"

const AREAS: Record<string, string> = {
  venta: "Ventas",
  presupuesto: "Presupuestos",
  stock: "Stock",
  conteo: "Conteos",
  precios: "Precios",
  precio: "Precios",
  producto: "Productos",
  cliente: "Clientes",
  cuenta: "Cuentas corrientes",
  servicio: "Servicio técnico",
  compra: "Compras",
  entrega: "Entregas",
  caja: "Caja",
  org: "Configuración",
  usuario: "Usuarios",
  importar: "Importación",
  sucursal: "Configuración",
  lista: "Precios",
}

export function Auditoria() {
  const { e, v } = useDatos()
  const [texto, setTexto] = useState("")
  const [usuario, setUsuario] = useState("todos")
  const [area, setArea] = useState("todas")
  const [soloSinConexion, setSoloSinConexion] = useState(false)

  const filas = useMemo(() => {
    const q = normalizar(texto)
    return e.auditoria.filter(
      (a) =>
        (usuario === "todos" || a.usuarioId === usuario) &&
        (area === "todas" || AREAS[a.accion.split(".")[0]] === area) &&
        (!soloSinConexion || a.origen === "sin_conexion") &&
        (!q || normalizar(a.resumen).includes(q)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, texto, usuario, area, soloSinConexion])

  const nombre = (id: string) => e.usuarios.find((u) => u.id === id)?.nombre ?? "—"
  const columnas: Columna<RegistroAuditoria>[] = [
    { id: "fecha", encabezado: "Cuándo", ancho: "150px", orden: (a) => a.fecha, celda: (a) => <span className="num t-texto-sm text-muted-foreground">{new Date(a.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "medium" })}</span> },
    { id: "quien", encabezado: "Quién", ancho: "150px", orden: (a) => nombre(a.usuarioId), celda: (a) => <span className="truncate t-texto-sm">{nombre(a.usuarioId)}</span> },
    { id: "area", encabezado: "Área", ancho: "140px", orden: (a) => a.accion, celda: (a) => <span className="ficha">{AREAS[a.accion.split(".")[0]] ?? a.accion}</span> },
    {
      id: "que",
      encabezado: "Qué",
      ancho: "minmax(240px,3fr)",
      celda: (a) => (
        <span className="flex min-w-0 items-center gap-2">
          {a.origen === "sin_conexion" && <CloudOff className="size-3.5 shrink-0 text-alerta" aria-label="Hecho sin conexión" />}
          <span className="truncate">{a.resumen}</span>
        </span>
      ),
    },
  ]

  return (
    <Requiere permiso="auditoria.ver">
      <EncabezadoPagina
        ficha={`Auditoría · ${e.auditoria.length} registros`}
        titulo="Registro de auditoría"
        descripcion="Quién hizo qué y cuándo, en cada acción. En producción, además, la base registra cada cambio de cada fila y no permite borrarlo ni editarlo."
        acciones={
          <Button variant="outline" onClick={() => descargarCSV("auditoria", [["Fecha", "Usuario", "Acción", "Detalle", "Origen"], ...filas.map((a) => [new Date(a.fecha).toLocaleString("es-AR"), nombre(a.usuarioId), a.accion, a.resumen, a.origen])])}>
            <Download /> Exportar
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={usuario} onValueChange={setUsuario}>
          <SelectTrigger className="w-48" aria-label="Usuario">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las personas</SelectItem>
            {e.usuarios.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-48" aria-label="Área">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las áreas</SelectItem>
            {[...new Set(Object.values(AREAS))].map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="inline-flex items-center gap-2 t-texto-sm text-muted-foreground">
          <input type="checkbox" checked={soloSinConexion} onChange={(ev) => setSoloSinConexion(ev.target.checked)} className="accent-[var(--foreground)]" />
          Solo hechas sin conexión
        </label>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Buscar en el detalle" className="h-9 pl-9" aria-label="Buscar en la auditoría" />
        </div>
      </div>
      <TablaRapida
        etiqueta="Registro de auditoría"
        filas={filas}
        columnas={columnas}
        clave={(a) => a.id}
        alto="calc(100dvh - 300px)"
        tarjeta={(a) => (
          <div className="min-w-0">
            <p className="truncate t-texto-sm">{a.resumen}</p>
            <p className="ficha">
              {nombre(a.usuarioId)} · {new Date(a.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
        )}
        vacio={<Vacio icono={ScrollText} titulo="Sin registros con ese filtro" />}
      />
    </Requiere>
  )
}
