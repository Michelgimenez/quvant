"use client"

import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Check, ShieldCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EstadoFeatureBadge } from "@/components/base/sellos"
import { lanzarSalto } from "@/components/marca/salto"
import { MapaSucursales } from "@/components/negocio/mapa-sucursales"
import { Avance, Fila, Numero, Tarjeta } from "@/components/negocio/piezas"
import { formatoPesosCorto } from "@/dominio/dinero"
import { suma } from "@/dominio/negocio"
import { cn } from "@/lib/utils"
import { hace, horaCorta, useAhoraDemo, useDatosEmpresa, useDemo, useTiendaDemo } from "../contexto"
import { useResumen } from "../tableros/comun"
import { EncabezadoModulo } from "./vista-modulo"

/** Un porcentaje con un decimal y coma decimal (0,307 → "30,7 %"). */
const porcentaje = (v: number) => `${(v * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`

/** Sucursales: el mapa grande y la ficha de la sucursal elegida. */
export function SucursalesGrupo() {
  const datos = useDatosEmpresa("grupo")
  const { resumen } = useResumen("grupo")
  const [elegida, setElegida] = useState<number>(resumen.ranking[0]?.indice ?? 0)
  const [provincia, setProvincia] = useState<string | null>(null)
  const s = datos.sucursales[elegida]
  const r = resumen.ranking.find((x) => x.indice === elegida)
  const semana = resumen.serie.slice(-7).map((d) => d.porSucursal[elegida] ?? 0)
  const lista = resumen.ranking.filter((x) => !provincia || x.provincia === provincia).sort((a, b) => b.hoy - a.hoy)
  return (
    <div>
      <EncabezadoModulo empresa="grupo" modulo="sucursales" detalle="Las 40 sucursales en el mapa, con lo que vende cada una hoy. Tocá una para ver su ficha." />
      <div className="grid grid-cols-[320px_1fr_360px] gap-3">
        <Tarjeta etiqueta="Mapa · ventas de hoy" densidad="densa" className="self-start">
          <MapaSucursales sucursales={datos.sucursales} ventas={resumen.porSucursalHoy} ancho={290} alto={560} paso={7} destacada={elegida} onElegir={setElegida} className="w-full" />
        </Tarjeta>
        <Tarjeta etiqueta="Sucursales" densidad="densa">
          <div className="flex flex-wrap gap-1">
            {[null, ...resumen.porProvincia.map((p) => p.provincia)].map((p) => (
              <button key={p ?? "todas"} type="button" onClick={() => setProvincia(p)} aria-pressed={provincia === p} className={cn("t-etiqueta rounded px-2 py-1", provincia === p ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {p ?? "Todas"}
              </button>
            ))}
          </div>
          <ul className="sin-scrollbar max-h-[560px] divide-y divide-linea overflow-y-auto">
            {lista.map((x) => (
              <li key={x.indice}>
                <button type="button" onClick={() => setElegida(x.indice)} className={cn("t-dato flex w-full items-center gap-3 py-1.5 text-left", elegida === x.indice && "bg-muted")}>
                  <span className="w-7 text-muted-foreground">{datos.sucursales[x.indice].codigo}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {x.nombre} <span className="text-muted-foreground">· {x.provincia}</span>
                  </span>
                  <span className="w-20 text-right font-semibold">{formatoPesosCorto(x.hoy)}</span>
                  <Avance valor={x.avance} className="w-20" />
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
        {s && r && (
          <Tarjeta densidad="amplia" etiqueta={`Sucursal ${s.codigo} · ${s.provincia}`} titulo={s.nombre} className="self-start">
            <Numero valor={r.hoy} formato="pesos-corto" tamano="lg" />
            <div className="flex items-center gap-2">
              <Avance valor={r.avance} marca className="flex-1" />
              <span className="t-dato">{Math.round(r.avance * 100)} % del objetivo</span>
            </div>
            <div className="space-y-1.5">
              <Fila etiqueta="Tickets hoy" valor={r.tickets} />
              <Fila etiqueta="Margen · 30 días" valor={porcentaje(r.margen)} />
              <Fila etiqueta="Productos críticos" valor={<span className={cn(r.criticos > 60 && "text-alerta")}>{r.criticos}</span>} />
              <Fila etiqueta="Cajas" valor={s.puestos} />
            </div>
            <div>
              <p className="t-etiqueta mb-1.5 text-muted-foreground">Últimos 7 días</p>
              <div className="flex h-16 items-end gap-1">
                {semana.map((v, i) => (
                  <span key={i} className={cn("flex-1", i === semana.length - 1 ? "bg-[var(--serie-1)]" : "bg-gris-7")} style={{ height: `${Math.max(4, (v / Math.max(1, ...semana)) * 100)}%` }} />
                ))}
              </div>
            </div>
          </Tarjeta>
        )}
      </div>
    </div>
  )
}

type Columna = "hoy" | "semana" | "avance" | "margen" | "ticket" | "criticos"

/** Comparación: las 40 sucursales en una tabla ordenable, con la semana de cada una. */
export function ComparacionGrupo() {
  const { datos, resumen } = useResumen("grupo")
  const [orden, setOrden] = useState<Columna>("hoy")
  const filas = useMemo(
    () =>
      resumen.ranking.map((r) => {
        const semana = suma(resumen.serie.slice(-7).map((d) => d.porSucursal[r.indice] ?? 0))
        const tickets7 = suma(datos.dias.slice(-7).map((d) => d.tickets[r.indice] ?? 0)) || 1
        return { ...r, semana, ticket: semana / tickets7, serie: resumen.serie.slice(-14).map((d) => d.porSucursal[r.indice] ?? 0) }
      }),
    [resumen, datos],
  )
  const ordenadas = [...filas].sort((a, b) => (b[orden] as number) - (a[orden] as number))
  const encabezado = (c: Columna, nombre: string) => (
    <th className="w-[96px] pb-2 text-right font-medium">
      <button type="button" onClick={() => setOrden(c)} className={cn("t-etiqueta", orden === c ? "text-foreground underline underline-offset-4" : "text-muted-foreground hover:text-foreground")}>
        {nombre}
      </button>
    </th>
  )
  return (
    <div>
      <EncabezadoModulo empresa="grupo" modulo="comparacion" detalle="Todas las sucursales con los mismos números, para ver de un vistazo cuál anda bien y cuál necesita atención. Tocá un encabezado para ordenar." />
      <Tarjeta densidad="densa">
        <table className="w-full table-fixed">
          <thead>
            <tr className="t-etiqueta text-left text-muted-foreground">
              <th className="w-8 pb-2 font-medium">#</th>
              <th className="pb-2 font-medium">Sucursal</th>
              <th className="w-[140px] pb-2 font-medium">14 días</th>
              {encabezado("hoy", "Hoy")}
              {encabezado("semana", "7 días")}
              {encabezado("avance", "Objetivo")}
              {encabezado("ticket", "Ticket")}
              {encabezado("margen", "Margen")}
              {encabezado("criticos", "Críticos")}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((r, i) => {
              const max = Math.max(1, ...r.serie)
              return (
                <tr key={r.indice} className="t-dato h-[30px] border-t border-linea">
                  <td className="text-muted-foreground">{i + 1}</td>
                  <td className="truncate pr-2">
                    {r.nombre} <span className="text-muted-foreground">· {r.provincia}</span>
                  </td>
                  <td>
                    <span className="flex h-4 items-end gap-px pr-4">
                      {r.serie.map((v, j) => (
                        <span key={j} className={cn("flex-1", j === r.serie.length - 1 ? "bg-[var(--serie-1)]" : "bg-gris-6")} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
                      ))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right font-semibold">{formatoPesosCorto(r.hoy)}</td>
                  <td className="whitespace-nowrap text-right">{formatoPesosCorto(r.semana)}</td>
                  <td className={cn("text-right", r.avance < 0.6 && "text-alerta")}>{Math.round(r.avance * 100)} %</td>
                  <td className="whitespace-nowrap text-right">{formatoPesosCorto(r.ticket)}</td>
                  <td className="text-right">{porcentaje(r.margen)}</td>
                  <td className={cn("text-right", r.criticos > 60 && "text-alerta")}>{r.criticos}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Tarjeta>
    </div>
  )
}

/** Aprobaciones por niveles: hasta $ 8 M aprueba la gerencia regional; más, también dirección. Completa → el salto. */
export function AprobacionesGrupo() {
  const datos = useDatosEmpresa("grupo")
  const tienda = useTiendaDemo()
  const ahora = useAhoraDemo()
  const aprobaciones = useDemo((s) => s.porEmpresa.grupo.aprobaciones)
  const x = datos.extras.tipo === "grupo" ? datos.extras : null
  const estado = (id: string) => aprobaciones.find((a) => a.id === id)
  const resuelta = (id: string, nivel: 1 | 2) => {
    const a = estado(id)
    return Boolean(a?.rechazada || (nivel === 1 ? a?.nivel1 : a?.nivel2))
  }
  const lista = (x?.aprobaciones ?? []).map((a) => ({ ...a, e: estado(a.id), completa: resuelta(a.id, a.nivel) }))
  // Arranca en la primera pendiente de dos niveles (muestra el circuito completo); si no hay, en la primera pendiente.
  const [elegida, setElegida] = useState(lista.find((a) => !a.completa && a.nivel === 2)?.id ?? lista.find((a) => !a.completa)?.id ?? lista[0]?.id)
  const a = lista.find((q) => q.id === elegida)
  const boton = useRef<HTMLButtonElement>(null)
  const aprobar = (nivel: 1 | 2) => {
    if (!a) return
    tienda.getState().actualizar("grupo", (acc) => {
      const otras = acc.aprobaciones.filter((q) => q.id !== a.id)
      const actual = acc.aprobaciones.find((q) => q.id === a.id) ?? { id: a.id }
      return { ...acc, aprobaciones: [...otras, { ...actual, [nivel === 1 ? "nivel1" : "nivel2"]: ahora }] }
    })
    if (nivel === a.nivel) lanzarSalto({ desde: boton.current, mensaje: "Aprobación completa" })
    else toast.success("Aprobada por la gerencia regional. Ahora la ve dirección.")
  }
  const rechazar = () => {
    if (!a) return
    tienda.getState().actualizar("grupo", (acc) => ({ ...acc, aprobaciones: [...acc.aprobaciones.filter((q) => q.id !== a.id), { id: a.id, rechazada: ahora }] }))
    toast.info(`${a.numero} rechazada: vuelve a la sucursal con el motivo`)
  }
  const pendientes = lista.filter((q) => !q.completa).length
  return (
    <div>
      <EncabezadoModulo empresa="grupo" modulo="aprobaciones" detalle="Las compras grandes no salen sin firma. Hasta $ 8 M aprueba la gerencia regional; por encima, también dirección. Todo queda en la auditoría." />
      <div className="grid grid-cols-[1fr_420px] gap-4">
        <Tarjeta etiqueta={`Órdenes de compra · ${pendientes} pendientes`} densidad="densa">
          <ul className="divide-y divide-linea">
            {lista.map((q) => (
              <li key={q.id}>
                <button type="button" onClick={() => setElegida(q.id)} className={cn("flex w-full items-center gap-3 py-2 text-left", elegida === q.id && "bg-muted")}>
                  <span className="t-dato w-24 shrink-0">{q.numero}</span>
                  <span className="min-w-0 flex-1">
                    <span className="t-texto-sm block truncate">{q.proveedor}</span>
                    <span className="t-etiqueta block truncate text-muted-foreground">
                      {datos.sucursales[q.sucursal]?.nombre} · {hace(Date.parse(q.t), ahora)}
                    </span>
                  </span>
                  <span className="t-etiqueta w-20 shrink-0 text-muted-foreground">{q.nivel === 2 ? "2 niveles" : "1 nivel"}</span>
                  <span className="t-dato w-20 shrink-0 text-right font-semibold">{formatoPesosCorto(q.monto)}</span>
                  <span className={cn("t-etiqueta w-24 shrink-0 text-right", q.e?.rechazada ? "text-error" : q.completa ? "text-ok" : q.e?.nivel1 ? "text-alerta" : "text-muted-foreground")}>
                    {q.e?.rechazada ? "Rechazada" : q.completa ? "Aprobada" : q.e?.nivel1 ? "Falta dirección" : "Pendiente"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
        {a && (
          <Tarjeta densidad="amplia" etiqueta={`${a.numero} · ${datos.sucursales[a.sucursal]?.nombre}`} titulo={a.proveedor} className="self-start">
            <p className="t-texto-sm text-muted-foreground">{a.detalle}</p>
            <Numero valor={a.monto} tamano="lg" />
            <p className="t-texto-sm text-muted-foreground">Pide: {a.solicita}</p>
            <ol className="space-y-2 border-t border-linea pt-3">
              {([1, 2] as const)
                .filter((n) => n <= a.nivel)
                .map((n) => {
                  const hecha = n === 1 ? a.e?.nivel1 : a.e?.nivel2
                  return (
                    <li key={n} className="flex items-center gap-3">
                      <span className={cn("flex size-6 items-center justify-center border", hecha ? "border-ok text-ok" : "border-gris-5 text-muted-foreground")}>{hecha ? <Check className="size-3.5" /> : <span className="t-dato">{n}</span>}</span>
                      <span className="t-texto-sm flex-1">{n === 1 ? "Gerencia regional" : "Dirección"}</span>
                      {hecha && <span className="t-dato text-muted-foreground">{horaCorta(hecha)}</span>}
                    </li>
                  )
                })}
            </ol>
            {!a.completa && (
              <div className="flex gap-2">
                <Button ref={boton} className="h-11 flex-1" onClick={() => aprobar(a.e?.nivel1 ? 2 : 1)} data-testid="aprobar">
                  <ShieldCheck /> Aprobar · {a.e?.nivel1 ? "dirección" : "gerencia regional"}
                </Button>
                <Button variant="outline" className="h-11" onClick={rechazar}>
                  <X /> Rechazar
                </Button>
              </div>
            )}
          </Tarjeta>
        )}
      </div>
    </div>
  )
}

/** Auditoría: quién hizo qué y cuándo, incluidas las aprobaciones del visitante. */
export function AuditoriaGrupo() {
  const datos = useDatosEmpresa("grupo")
  const aprobaciones = useDemo((s) => s.porEmpresa.grupo.aprobaciones)
  const x = datos.extras.tipo === "grupo" ? datos.extras : null
  const [filtro, setFiltro] = useState<string | null>(null)
  const propias = aprobaciones.flatMap((a) => {
    const o = x?.aprobaciones.find((q) => q.id === a.id)
    const filas = []
    if (a.nivel1) filas.push({ id: `${a.id}-1`, t: new Date(a.nivel1).toISOString(), usuario: "Vos (demo)", rol: "Gerencia regional", sucursal: o?.sucursal ?? null, accion: "Aprobó una compra", detalle: `${o?.numero} · nivel 1` })
    if (a.nivel2) filas.push({ id: `${a.id}-2`, t: new Date(a.nivel2).toISOString(), usuario: "Vos (demo)", rol: "Dirección", sucursal: o?.sucursal ?? null, accion: "Aprobó una compra", detalle: `${o?.numero} · nivel 2` })
    if (a.rechazada) filas.push({ id: `${a.id}-r`, t: new Date(a.rechazada).toISOString(), usuario: "Vos (demo)", rol: "Dirección", sucursal: o?.sucursal ?? null, accion: "Rechazó una compra", detalle: `${o?.numero}` })
    return filas
  })
  const registros = [...propias, ...(x?.auditoria ?? [])].sort((a, b) => b.t.localeCompare(a.t))
  const acciones = [...new Set(registros.map((r) => r.accion))]
  return (
    <div>
      <EncabezadoModulo empresa="grupo" modulo="auditoria" detalle="Cada acción queda registrada con quién, cuándo, desde qué rol y en qué sucursal. No se puede borrar." />
      <div className="mb-3 flex flex-wrap gap-1">
        {[null, ...acciones].map((a) => (
          <button key={a ?? "todo"} type="button" onClick={() => setFiltro(a)} aria-pressed={filtro === a} className={cn("t-etiqueta rounded px-2 py-1", filtro === a ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {a ?? "Todo"}
          </button>
        ))}
      </div>
      <Tarjeta densidad="densa">
        <table className="w-full table-fixed">
          <thead>
            <tr className="t-etiqueta text-left text-muted-foreground">
              <th className="w-16 pb-2 font-medium">Hora</th>
              <th className="w-48 pb-2 font-medium">Quién</th>
              <th className="w-44 pb-2 font-medium">Rol</th>
              <th className="w-40 pb-2 font-medium">Sucursal</th>
              <th className="pb-2 font-medium">Qué hizo</th>
            </tr>
          </thead>
          <tbody>
            {registros
              .filter((r) => !filtro || r.accion === filtro)
              .map((r) => (
                <tr key={r.id} className="t-dato h-8 border-t border-linea">
                  <td className="text-muted-foreground">{horaCorta(Date.parse(r.t))}</td>
                  <td className="truncate pr-2">{r.usuario}</td>
                  <td className="truncate pr-2 text-muted-foreground">{r.rol}</td>
                  <td className="truncate pr-2 text-muted-foreground">{r.sucursal === null ? "Todo el grupo" : datos.sucursales[r.sucursal]?.nombre}</td>
                  <td className="truncate">
                    {r.accion} <span className="text-muted-foreground">· {r.detalle}</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Tarjeta>
    </div>
  )
}

const PERMISOS = ["Ver ventas", "Vender", "Ver costos", "Precios", "Comprar", "Aprobar", "Ajustar stock", "Todo el grupo", "Usuarios"] as const
const MATRIZ: Record<string, readonly boolean[]> = {
  Dirección: [true, false, true, true, true, true, false, true, true],
  "Gerencia regional": [true, false, true, true, true, true, true, false, false],
  "Encargado de sucursal": [true, true, false, false, true, false, true, false, false],
  Compras: [false, false, true, false, true, false, false, true, false],
  Administración: [true, false, true, false, false, false, false, true, true],
  Depósito: [false, false, false, false, false, false, true, false, false],
  Caja: [false, true, false, false, false, false, false, false, false],
}

/** Permisos por rol y por sucursal. */
export function PermisosGrupo() {
  const datos = useDatosEmpresa("grupo")
  const x = datos.extras.tipo === "grupo" ? datos.extras : null
  return (
    <div>
      <EncabezadoModulo empresa="grupo" modulo="permisos" detalle={`${suma((x?.roles ?? []).map((r) => r.usuarios))} usuarios en ${x?.roles.length ?? 0} roles. Cada persona ve y hace solo lo que le corresponde, en sus sucursales.`} />
      <Tarjeta densidad="densa">
        <table className="w-full">
          <thead>
            <tr className="t-etiqueta text-left text-muted-foreground">
              <th className="pb-2 font-medium">Rol</th>
              <th className="pb-2 text-right font-medium">Usuarios</th>
              <th className="pb-2 pl-4 font-medium">Alcance</th>
              {PERMISOS.map((p) => (
                <th key={p} className="w-[88px] px-1 pb-2 text-center font-medium">
                  <span className="block leading-tight">{p}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(x?.roles ?? []).map((r) => (
              <tr key={r.rol} className="t-dato h-10 border-t border-linea">
                <td className="font-semibold">{r.rol}</td>
                <td className="text-right">{r.usuarios}</td>
                <td className="pl-4 text-muted-foreground">{r.alcance}</td>
                {(MATRIZ[r.rol] ?? []).map((v, i) => (
                  <td key={i} className="text-center">
                    {v ? <Check className="mx-auto size-4" aria-label="Sí" /> : <span className="text-gris-6" aria-label="No">·</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Tarjeta>
    </div>
  )
}

/** Integraciones: con su estado real (ninguna está conectada de verdad todavía). */
export function IntegracionesGrupo() {
  const datos = useDatosEmpresa("grupo")
  const x = datos.extras.tipo === "grupo" ? datos.extras : null
  return (
    <div>
      <EncabezadoModulo empresa="grupo" modulo="integraciones" detalle="Lo que se conecta con Quvant, con su estado tal cual: las que dicen demo están emuladas; las que dicen próximamente, todavía no existen." />
      <div className="grid grid-cols-2 gap-3">
        {(x?.integraciones ?? []).map((i) => (
          <Tarjeta key={i.nombre} densidad="amplia" titulo={i.nombre}>
            <p className="t-texto-sm text-muted-foreground">{i.detalle}</p>
            <EstadoFeatureBadge estado={i.estado} className="self-start" />
          </Tarjeta>
        ))}
      </div>
    </div>
  )
}

