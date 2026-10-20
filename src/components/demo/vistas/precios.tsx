"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Fila, Tarjeta } from "@/components/negocio/piezas"
import { formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import { redondearPrecio } from "@/demo/azar"
import type { IdEmpresa } from "@/demo/empresas"
import { cn } from "@/lib/utils"
import { useDatosEmpresa } from "../contexto"
import { EncabezadoModulo } from "./vista-modulo"

/**
 * El aumento masivo con vista previa: llega la lista del proveedor y se carga en minutos. Antes de aplicar,
 * cuántos productos cambian, el aumento real después del redondeo y qué márgenes quedan bajos.
 * En la demo no se guarda en los datos: se muestra el impacto y se confirma.
 */
export function VistaPrecios({ empresa }: { empresa: IdEmpresa }) {
  const datos = useDatosEmpresa(empresa)
  const grupos = useMemo(() => {
    const clave = empresa === "kiosco" ? "proveedor" : "categoria"
    const nombres = empresa === "kiosco" && datos.extras.tipo === "kiosco" ? new Map(datos.extras.proveedores.map((p) => [p.id, p.nombre])) : null
    const m = new Map<string, string>()
    for (const p of datos.productos) m.set(p[clave], nombres?.get(p[clave]) ?? p[clave])
    return [...m.entries()].slice(0, 16)
  }, [datos, empresa])
  const [grupo, setGrupo] = useState(grupos[0]?.[0] ?? "")
  const [porcentaje, setPorcentaje] = useState("6")
  const pct = Number(porcentaje.replace(",", ".")) || 0
  const vista = useMemo(() => {
    const clave = empresa === "kiosco" ? "proveedor" : "categoria"
    const lista = datos.productos.filter((p) => p[clave] === grupo)
    const cambios = lista.map((p) => {
      const nuevo = Math.round(redondearPrecio((p.precio / 100) * (1 + pct / 100)) * 100)
      return { p, nuevo, margen: nuevo ? (nuevo - p.costo) / nuevo : 0 }
    })
    const antes = cambios.reduce((a, c) => a + c.p.precio * Math.max(1, c.p.stock), 0)
    const despues = cambios.reduce((a, c) => a + c.nuevo * Math.max(1, c.p.stock), 0)
    return { cambios, real: antes ? (despues / antes - 1) * 100 : 0, bajos: cambios.filter((c) => c.margen < 0.2).length, stock: despues - antes }
  }, [datos, grupo, pct, empresa])
  return (
    <div>
      <EncabezadoModulo empresa={empresa} modulo="precios" detalle="Llega la lista del proveedor y la cargás en minutos. Antes de aplicar, ves el impacto." />
      <div className="grid grid-cols-[340px_1fr] gap-4">
        <Tarjeta densidad="amplia" etiqueta="Aumento masivo" className="self-start">
          <label className="t-etiqueta text-muted-foreground" htmlFor="grupo-precios">
            {empresa === "kiosco" ? "Proveedor" : "Categoría"}
          </label>
          <select id="grupo-precios" value={grupo} onChange={(e) => setGrupo(e.target.value)} className="t-texto h-12 rounded-lg border border-input bg-background px-3">
            {grupos.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
          <label className="t-etiqueta text-muted-foreground" htmlFor="porcentaje">
            Porcentaje
          </label>
          <Input id="porcentaje" inputMode="decimal" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} className="t-numero-lg h-14" />
          <div className="space-y-2 border-t border-linea pt-3">
            <Fila etiqueta="Productos que cambian" valor={vista.cambios.length} fuerte />
            <Fila etiqueta="Aumento real (con redondeo)" valor={`${vista.real.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`} />
            <Fila etiqueta="Márgenes por debajo del 20 %" valor={<span className={cn(vista.bajos && "text-alerta")}>{vista.bajos}</span>} />
            <Fila etiqueta="Tu stock vale" valor={`${vista.stock >= 0 ? "+" : ""}${formatoPesosCorto(vista.stock)}`} />
          </div>
          <Button className="h-12" disabled={!vista.cambios.length || !pct} onClick={() => toast.success(`Precios actualizados: ${vista.cambios.length} productos (en la demo, solo se muestra el impacto).`)} data-testid="aplicar-aumento">
            Aplicar a {vista.cambios.length} productos
          </Button>
        </Tarjeta>
        <Tarjeta densidad="amplia" etiqueta="Vista previa">
          <table className="w-full">
            <thead>
              <tr className="t-etiqueta text-left text-muted-foreground">
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 text-right font-medium">Antes</th>
                <th className="pb-2 text-right font-medium">Después</th>
                <th className="pb-2 text-right font-medium">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {vista.cambios.slice(0, 12).map((c) => (
                <tr key={c.p.id} className="t-dato h-9">
                  <td className="max-w-0 truncate pr-3">{c.p.nombre}</td>
                  <td className="text-right text-muted-foreground">{formatoPesos(c.p.precio, { sinDecimales: true })}</td>
                  <td className="text-right font-semibold">{formatoPesos(c.nuevo, { sinDecimales: true })}</td>
                  <td className={cn("text-right", c.margen < 0.2 && "text-alerta")}>{Math.round(c.margen * 100)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vista.cambios.length > 12 && <p className="t-texto-sm text-muted-foreground">y {vista.cambios.length - 12} más.</p>}
        </Tarjeta>
      </div>
    </div>
  )
}
