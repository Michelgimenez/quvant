"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import gsap from "gsap"
import { Cloud, CloudOff, Wifi, WifiOff } from "lucide-react"
import { crearDemoEmbebida, type DemoEmbebida } from "@/cliente/demo-embebida"
import { MiniaturaProducto } from "@/components/base/ilustracion"
import { Punto } from "@/components/base/sellos"
import { CapaSaltos, lanzarSalto } from "@/components/marca/salto"
import { Switch } from "@/components/ui/switch"
import { formatoPesos } from "@/dominio/dinero"
import { listaDefault, precioDe } from "@/dominio/estado"
import type { Producto } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

const BUSCAR = ["Disco de corte metal 115", "Guantes de nitrilo", "Cinta aisladora", "Amoladora angular 115 mm 850", "Electrodos 6013", "Lubricante multiuso"]

/**
 * "Nunca se cae": un mostrador de verdad (mismo motor que la app) y un
 * servidor emulado. El visitante corta internet, sigue vendiendo, lo vuelve a
 * conectar y ve cómo la cola se sincroniza sola.
 */
/** Guion automático (presentaciones): vende, corta, sigue vendiendo y reconecta solo. */
export type GuionConexion = { activo: boolean; velocidad: number; reinicio: number }

export function DemoConexion({ compacta = false, guion }: { compacta?: boolean; guion?: GuionConexion }) {
  const [demo, setDemo] = useState<DemoEmbebida | null>(null)
  useEffect(() => {
    let vivo = true
    crearDemoEmbebida().then((d) => vivo && setDemo(d))
    return () => {
      vivo = false
    }
  }, [])
  if (!demo) {
    return (
      <div className="t-texto-sm flex h-[420px] items-center justify-center rounded-lg border border-linea bg-superficie-1/60 text-acero" role="status">
        Preparando el mostrador de demostración…
      </div>
    )
  }
  return (
    <>
      <Mostrador demo={demo} compacta={compacta} guion={guion} />
      <CapaSaltos />
    </>
  )
}

function Mostrador({ demo, compacta, guion }: { demo: DemoEmbebida; compacta: boolean; guion?: GuionConexion }) {
  const { motor } = demo
  const version = useSyncExternalStore(
    (cb) => motor.suscribir(cb),
    () => `${motor.version}:${motor.conexion}:${motor.pendientes.length}`,
    () => "0",
  )
  const [conectado, setConectado] = useState(true)
  const [mias, setMias] = useState<string[]>([])
  const [recibidas, setRecibidas] = useState<{ id: string; numero: number; total: number }[]>([])
  const panelServidor = useRef<HTMLDivElement>(null)
  const e = motor.estado
  const cc = e.sucursales.find((s) => s.codigo === "CC")!
  const lista = listaDefault(e)

  const productos = useMemo(
    () => BUSCAR.map((q) => Object.values(demo.semilla.productos).find((p) => p.nombre.startsWith(q))).filter(Boolean) as Producto[],
    [demo],
  )

  useEffect(
    () =>
      motor.suscribir(async (ev) => {
        if (ev.tipo !== "sincronizado") return
        const srv = await demo.servidor.estadoActual()
        setRecibidas((prev) => {
          const ya = new Set(prev.map((r) => r.id))
          const nuevas = mias.filter((id) => !ya.has(id) && srv.ventas[id]?.numero).map((id) => ({ id, numero: srv.ventas[id].numero!, total: srv.ventas[id].total }))
          return [...nuevas.reverse(), ...prev].slice(0, 8)
        })
        if (ev.ventasSinConexion > 0) {
          lanzarSalto({ desde: panelServidor.current, mensaje: `Cola sincronizada · ${ev.ventasSinConexion} ${ev.ventasSinConexion === 1 ? "venta" : "ventas"}` })
        }
      }),
    [motor, demo, mias],
  )

  const vender = async (p: Producto) => {
    const precio = precioDe(e, lista.id, p.id)
    const id = motor.uuid()
    const cantidad = p.unidad === "u" || p.unidad === "caja" ? 1 : 2
    const n = await motor.siguienteLocal("demo")
    const r = await motor.ejecutar(
      "venta.crear",
      {
        venta: {
          id,
          sucursalId: cc.id,
          puesto: 1,
          numeroLocal: `CC1-L${String(n).padStart(4, "0")}`,
          fecha: new Date().toISOString(),
          clienteId: null,
          listaId: lista.id,
          items: [{ productoId: p.id, descripcion: p.nombre, cantidad, precioUnitario: precio, descuentoPct: 0, costoUnitario: 0 }],
          pagos: [{ medio: "efectivo", importe: precio * cantidad }],
          entrega: null,
        },
      },
      { sucursalId: cc.id },
    )
    if (r.ok) setMias((xs) => [id, ...xs].slice(0, 30))
  }

  // Guion para presentaciones
  useEffect(() => {
    if (!guion?.activo) return
    let cancelado = false
    const t = (s: number) => new Promise<void>((ok, mal) => setTimeout(() => (cancelado ? mal(new Error("cancelado")) : ok()), (s * 1000) / guion.velocidad))
    const red = (v: boolean) => {
      setConectado(v)
      demo.setRed(v)
    }
    ;(async () => {
      red(true)
      await t(1.0)
      await vender(productos[0])
      await t(1.6)
      red(false)
      await t(1.1)
      await vender(productos[1])
      await t(0.9)
      await vender(productos[2])
      await t(0.9)
      await vender(productos[4])
      await t(2.0)
      red(true)
    })().catch(() => {})
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guion?.activo, guion?.reinicio])

  // El pulso de la red: un cuadradito que viaja por la línea mientras hay conexión (GSAP, el único reloj).
  const flujo = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = flujo.current
    if (!el || !conectado || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const vertical = el.parentElement ? el.parentElement.clientHeight > el.parentElement.clientWidth : false
    const t = gsap.fromTo(el, vertical ? { yPercent: -100, y: 0 } : { xPercent: -100, x: 0 }, vertical ? { y: () => el.parentElement?.clientHeight ?? 96, duration: 1.2, ease: "none", repeat: -1 } : { x: () => el.parentElement?.clientWidth ?? 96, duration: 1.2, ease: "none", repeat: -1 })
    return () => {
      t.kill()
    }
  }, [conectado])

  const pendientes = motor.pendientes.filter((o) => o.tipo === "venta.crear").length
  const sinConexion = !conectado
  void version // fuerza el re-render cuando cambia el motor

  return (
    // Consultas de contenedor (no de ventana): se ve igual en el sitio y dentro del escenario de las presentaciones
    <div className="@container">
      <div className={cn("grid gap-4 rounded-lg border border-linea bg-superficie-1 p-4 @xl:p-6", compacta ? "" : "@3xl:grid-cols-[minmax(0,1.25fr)_auto_minmax(0,1fr)]")} data-testid="demo-conexion">
        {/* Mostrador */}
        <section className="space-y-3 rounded-md border border-linea bg-negro p-4" aria-label="Mostrador de demostración">
          <div className="flex items-center justify-between gap-2">
            <p className="t-etiqueta text-acero">Mostrador · CC · puesto 1</p>
            <span className={cn("t-texto-sm inline-flex h-7 items-center gap-2 border px-2.5", sinConexion ? "border-alerta" : "border-linea")} data-testid="demo-estado">
              <Punto tono={sinConexion ? "alerta" : pendientes ? "acero" : "ok"} pulso={sinConexion} />
              {sinConexion ? `Sin conexión${pendientes ? ` · ${pendientes} ${pendientes === 1 ? "venta" : "ventas"} en cola` : ""}` : pendientes ? "Sincronizando" : "Sincronizado"}
            </span>
          </div>
          <p className="t-texto-sm text-acero">Tocá un producto para venderlo.</p>
          <div className="grid grid-cols-2 gap-2 @xl:grid-cols-3">
            {productos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => vender(p)}
                className="flex items-center gap-2 rounded-md border border-linea bg-superficie-1 px-2.5 py-2 text-left transition-colors hover:border-gris-8 active:translate-y-px"
              >
                <MiniaturaProducto tipo={p.ilustracion} className="size-8" />
                <span className="min-w-0">
                  <span className="t-texto-sm block truncate text-blanco">{p.nombre.replace(/ (Abrasur|Corta|Escudo|Protek|Lumen|Conductel|Lubrimax|Arkon|Vulkor|Torkan|Brava)$/, "")}</span>
                  <span className="t-dato block text-acero">{formatoPesos(precioDe(e, lista.id, p.id), { sinDecimales: true })}</span>
                </span>
              </button>
            ))}
          </div>
          <ul className="space-y-1.5" aria-label="Ventas de este mostrador" aria-live="polite">
            {mias.slice(0, 5).map((id) => {
              const v = e.ventas[id]
              if (!v) return null
              const enCola = v.numero === null
              return (
                <li key={id} className="t-dato flex items-center gap-2 bg-superficie-1 px-2.5 py-1.5">
                  <span className={cn("num", enCola ? "text-alerta" : "text-ok")}>{enCola ? v.numeroLocal : `#${v.numero}`}</span>
                  <span className="min-w-0 flex-1 truncate text-acero">{v.items[0]?.descripcion}</span>
                  <span className="num text-blanco">{formatoPesos(v.total, { sinDecimales: true })}</span>
                  <span className={cn("t-etiqueta border px-1.5 py-0.5", enCola ? "border-alerta text-alerta" : "border-ok text-ok")}>{enCola ? "en cola" : "sincronizada"}</span>
                </li>
              )
            })}
            {mias.length === 0 && <li className="t-texto-sm border border-dashed border-linea px-3 py-3 text-center text-acero">Todavía no vendiste nada.</li>}
          </ul>
        </section>

        {/* Conexión */}
        <div className="flex items-center justify-center gap-3 @3xl:flex-col">
          <div className="relative h-1 w-24 overflow-hidden @3xl:h-24 @3xl:w-1" aria-hidden>
            {conectado ? (
              <>
                <span className="absolute inset-0 bg-foreground/30" />
                <span ref={flujo} className="absolute -top-px size-1.5 bg-foreground @3xl:left-[-1px] @3xl:top-0" />
              </>
            ) : (
              <span className="absolute inset-0 border-t-2 border-dashed border-error/70 @3xl:border-l-2 @3xl:border-t-0" />
            )}
          </div>
          <label className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-md border px-4 py-3 text-center", conectado ? "border-linea bg-negro" : "border-error bg-negro")}>
            {conectado ? <Wifi className="size-5 text-ok" /> : <WifiOff className="size-5 text-error" />}
            <span className="t-texto-sm font-semibold text-blanco">{conectado ? "Internet: conectado" : "Internet: cortado"}</span>
            <Switch
              checked={conectado}
              onCheckedChange={(v) => {
                setConectado(v)
                demo.setRed(v)
              }}
              aria-label="Internet"
              data-testid="demo-interruptor"
            />
            <span className="t-etiqueta text-acero">{conectado ? "Cortá la conexión" : "Volvé a conectar"}</span>
          </label>
          <div className="relative h-1 w-24 overflow-hidden @3xl:h-24 @3xl:w-1" aria-hidden>
            {conectado ? <span className="absolute inset-0 bg-foreground/30" /> : <span className="absolute inset-0 border-t-2 border-dashed border-error/70 @3xl:border-l-2 @3xl:border-t-0" />}
          </div>
        </div>

        {/* Servidor */}
        <section ref={panelServidor} className="space-y-3 rounded-md border border-linea bg-negro p-4" aria-label="Servidor">
          <div className="flex items-center justify-between">
            <p className="t-etiqueta text-acero">Servidor · la nube</p>
            {conectado ? <Cloud className="size-4 text-ok" /> : <CloudOff className="size-4 text-error" />}
          </div>
          <p className="t-texto-sm text-acero">{conectado ? "Recibe cada venta y le pone su número definitivo." : "No le llega nada. El mostrador no se entera: sigue vendiendo."}</p>
          <ul className="space-y-1.5">
            {recibidas.map((r) => (
              <li key={r.id} className="t-dato flex items-center gap-2 bg-superficie-1 px-2.5 py-1.5">
                <span className="num text-ok">#{r.numero}</span>
                <span className="flex-1 text-acero">venta recibida</span>
                <span className="num text-blanco">{formatoPesos(r.total, { sinDecimales: true })}</span>
              </li>
            ))}
            {recibidas.length === 0 && <li className="t-texto-sm border border-dashed border-linea px-3 py-3 text-center text-acero">Esperando ventas…</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
