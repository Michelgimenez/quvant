"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import { CheckCircle2, ScanBarcode, Search, ShoppingCart } from "lucide-react"
import { ProveedorApp, useConexion, useDatos } from "@/cliente/app-contexto"
import { sesionDemo, type DemoEmbebida } from "@/cliente/demo-embebida"
import { LogoOrg } from "@/components/base/logo-org"
import { MiniaturaProducto } from "@/components/base/ilustracion"
import { Punto } from "@/components/base/sellos"
import { Carrito } from "@/components/comercial/carrito"
import { lanzarSalto } from "@/components/marca/salto"
import { buscarProductos } from "@/dominio/busqueda"
import { formatoCantidad, formatoPesos } from "@/dominio/dinero"
import { claveStock, listaDefault } from "@/dominio/estado"
import type { ItemComercial, Producto } from "@/dominio/tipos"
import { itemDesdeProducto, totalItems } from "@/dominio/ventas"
import { cn } from "@/lib/utils"
import { useEscena } from "./motor"

type Paso = "mostrador" | "escaneo" | "presupuesto"
const PASOS: Paso[] = ["mostrador", "escaneo", "presupuesto"]

/** Título y bajada de cada paso de la película. */
export type TextosPelicula = [titulo: string, bajada: string][]

const TEXTOS: TextosPelicula = [
  ["Venta de mostrador", "Teclado o lector. Sigue funcionando sin internet."],
  ["Escaneo con el celular", "El depósito consulta stock apuntando la cámara."],
  ["Presupuesto → venta", "Un clic y el presupuesto aceptado es una venta."],
]

/**
 * Escena "Demo del producto": componentes reales de la app sobre la empresa
 * demo, con un cursor animado. Vende en el mostrador, escanea con el celular
 * y convierte un presupuesto en venta (operaciones reales del motor).
 */
export function PeliculaProducto({ demo, textos = TEXTOS, bucle = false }: { demo: DemoEmbebida; textos?: TextosPelicula; bucle?: boolean }) {
  const sesion = useMemo(() => sesionDemo(demo), [demo])
  return (
    <ProveedorApp motor={demo.motor} servidor={demo.servidor} sesion={sesion}>
      <Pelicula demo={demo} textos={textos} bucle={bucle} />
    </ProveedorApp>
  )
}

function esperar(ms: number, cancelado: { v: boolean }) {
  return new Promise<void>((ok, mal) => setTimeout(() => (cancelado.v ? mal(new Error("cancelado")) : ok()), ms))
}

function Pelicula({ demo, textos, bucle }: { demo: DemoEmbebida; textos: TextosPelicula; bucle: boolean }) {
  const { activa, velocidad, escala, reducir, reinicio } = useEscena()
  const { motor } = demo
  // Suscripción al motor: la pantalla se actualiza cuando la cola se sincroniza
  const { e } = useDatos()
  const { pendientes } = useConexion()
  const cc = e.sucursales.find((s) => s.codigo === "CC")!
  const lista = listaDefault(e)
  const raiz = useRef<HTMLDivElement>(null)
  const refBuscador = useRef<HTMLDivElement>(null)
  const refResultado = useRef<HTMLLIElement>(null)
  const refCobrar = useRef<HTMLButtonElement>(null)
  const refConfirmar = useRef<HTMLButtonElement>(null)
  const refConvertir = useRef<HTMLButtonElement>(null)
  const refTelefono = useRef<HTMLDivElement>(null)
  const [paso, setPaso] = useState<Paso>("mostrador")
  const [texto, setTexto] = useState("")
  const [resultados, setResultados] = useState<Producto[]>([])
  const [items, setItems] = useState<ItemComercial[]>([])
  const [cobrando, setCobrando] = useState(false)
  const [ventaId, setVentaId] = useState<string | null>(null)
  const [escaneado, setEscaneado] = useState<Producto | null>(null)
  const [convertido, setConvertido] = useState<string | null>(null)
  const [cursor, setCursor] = useState({ x: 1500, y: 900, clic: 0 })
  // En bucle, cada vuelta vuelve a correr el guion (con un presupuesto distinto)
  const [vuelta, setVuelta] = useState(0)
  const ventasLocales = useRef(0)
  const numeroLocal = () => `CC1-L${String(++ventasLocales.current).padStart(4, "0")}`

  const elegirPresupuesto = () =>
    Object.values(motor.estado.presupuestos).find((p) => p.sucursalId === cc.id && (p.estado === "enviado" || p.estado === "aceptado") && p.items.length >= 2 && p.items.length <= 4) ??
    Object.values(motor.estado.presupuestos).find((p) => p.estado === "enviado" || p.estado === "aceptado")!
  const [presupuestoId, setPresupuestoId] = useState(() => elegirPresupuesto().id)
  const presupuesto = e.presupuestos[presupuestoId]
  const productoEscaneo = useMemo(() => Object.values(demo.semilla.productos).find((p) => p.nombre.startsWith("Soldadora inverter 200")) ?? Object.values(demo.semilla.productos)[0], [demo])

  const moverA = (r: React.RefObject<HTMLElement | null>, clic = false) => {
    const el = r.current
    const base = raiz.current
    if (!el || !base) return
    const a = el.getBoundingClientRect()
    const b = base.getBoundingClientRect()
    setCursor((c) => ({ x: (a.left - b.left + a.width * 0.6) / escala, y: (a.top - b.top + a.height * 0.55) / escala, clic: clic ? c.clic + 1 : c.clic }))
  }

  useEffect(() => {
    if (!activa) return
    const cancelado = { v: false }
    // Con movimiento reducido se mantienen los tiempos del guion: solo el cursor deja de deslizarse
    const t = (s: number) => esperar((s * 1000) / velocidad, cancelado)
    const tipear = async (frase: string) => {
      for (let i = 1; i <= frase.length; i++) {
        setTexto(frase.slice(0, i))
        await t(0.06)
      }
      setResultados(buscarProductos(motor.estado, frase, 4))
    }
    ;(async () => {
      // Estado inicial
      setPaso("mostrador")
      setTexto("")
      setResultados([])
      setItems([])
      setCobrando(false)
      setVentaId(null)
      setEscaneado(null)
      setConvertido(null)
      const pres = elegirPresupuesto()
      setPresupuestoId(pres.id)
      await t(0.8)
      // 1 · Venta de mostrador
      moverA(refBuscador, true)
      await t(0.7)
      await tipear("amoladora 115")
      await t(0.4)
      moverA(refResultado, true)
      await t(0.6)
      const [p1] = buscarProductos(motor.estado, "amoladora 115", 1)
      setItems((xs) => [...xs, itemDesdeProducto(motor.estado, p1, lista.id)])
      setResultados([])
      setTexto("")
      await t(0.5)
      moverA(refBuscador, true)
      await tipear("disco de corte metal 115")
      await t(0.4)
      moverA(refResultado, true)
      await t(0.6)
      const [p2] = buscarProductos(motor.estado, "disco de corte metal 115", 1)
      setItems((xs) => [...xs, itemDesdeProducto(motor.estado, p2, lista.id, 10)])
      setResultados([])
      setTexto("")
      await t(0.6)
      moverA(refCobrar, true)
      await t(0.5)
      setCobrando(true)
      await t(0.7)
      moverA(refConfirmar, true)
      await t(0.5)
      const id = motor.uuid()
      const actuales = [itemDesdeProducto(motor.estado, p1, lista.id), itemDesdeProducto(motor.estado, p2, lista.id, 10)]
      await motor.ejecutar(
        "venta.crear",
        { venta: { id, sucursalId: cc.id, puesto: 1, numeroLocal: numeroLocal(), fecha: new Date().toISOString(), clienteId: null, listaId: lista.id, items: actuales, pagos: [{ medio: "efectivo", importe: totalItems(actuales) }], entrega: null } },
        { sucursalId: cc.id },
      )
      setVentaId(id)
      setCobrando(false)
      await t(2.4)
      // 2 · Escaneo con el celular
      setPaso("escaneo")
      await t(1.0)
      moverA(refTelefono)
      await t(1.6)
      setEscaneado(productoEscaneo)
      await t(2.6)
      // 3 · Presupuesto que pasa a venta
      setPaso("presupuesto")
      await t(1.2)
      moverA(refConvertir, true)
      await t(0.7)
      const r = await motor.ejecutar(
        "presupuesto.convertir",
        {
          presupuestoId: pres.id,
          venta: { id: motor.uuid(), sucursalId: pres.sucursalId, puesto: 1, numeroLocal: numeroLocal(), fecha: new Date().toISOString(), clienteId: pres.clienteId, listaId: pres.listaId, items: pres.items, pagos: [{ medio: "transferencia", importe: pres.total }], entrega: null },
        },
        { sucursalId: pres.sucursalId },
      )
      if (r.ok) {
        lanzarSalto({ desde: refConvertir.current, mensaje: "Presupuesto → venta" })
        setConvertido(motor.estado.presupuestos[pres.id]?.ventaId ?? "")
      }
      if (bucle) {
        await t(6)
        setVuelta((v) => v + 1)
      }
    })().catch(() => {})
    return () => {
      cancelado.v = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa, reinicio, vuelta])

  const venta = ventaId ? e.ventas[ventaId] : null
  const ventaConvertida = convertido ? e.ventas[convertido] : null
  const total = totalItems(items)
  const pasos = PASOS.map((id, i) => [id, ...textos[i]] as const)

  return (
    <div ref={raiz} className="relative size-full">
      <div className="grid h-full grid-cols-[440px_1fr] items-center gap-16">
        <ol className="space-y-6">
          {pasos.map(([id, titulo, texto], i) => (
            <li key={id} className={cn("rounded-2xl border p-6 transition-[opacity,transform] duration-500", paso === id ? "border-foreground/60 bg-superficie-1 opacity-100" : "translate-x-2 border-white/5 opacity-45")}>
              <p className="font-mono text-[18px] tracking-widest text-acero">0{i + 1}</p>
              <p className="mt-2 text-[32px] font-bold leading-tight text-blanco">{titulo}</p>
              <p className="mt-2 text-[20px] text-acero">{texto}</p>
            </li>
          ))}
        </ol>

        <div className="relative">
          {/* Pantalla de la app */}
          <div className="dark overflow-hidden rounded-[18px] border border-white/10 bg-background text-foreground shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)]" style={{ height: 600 }}>
            <div className="h-[3px]" style={{ background: e.org.colorAcento }} />
            <div className="flex items-center gap-4 border-b border-linea px-6 py-3">
              <LogoOrg org={e.org} alto="h-9" />
              <span className="ml-auto inline-flex h-8 items-center gap-2 rounded-full border border-linea bg-superficie-2 px-3 text-[13px]">
                <Punto tono={pendientes ? "acero" : "ok"} /> {pendientes ? "Sincronizando" : "Sincronizado"}
              </span>
            </div>
            <div className="relative p-6">
              {paso === "presupuesto" ? (
                <TarjetaPresupuesto presupuesto={presupuesto} botonRef={refConvertir} venta={ventaConvertida ? (ventaConvertida.numero ? `#${ventaConvertida.numero}` : ventaConvertida.numeroLocal) : null} />
              ) : (
                <div className="grid grid-cols-[1fr_280px] gap-5">
                  <div className="space-y-3">
                    <div ref={refBuscador} className="relative">
                      <div className="flex h-11 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-[15px]">
                        <Search className="size-4 text-muted-foreground" />
                        <span className={texto ? "text-foreground" : "text-muted-foreground"}>{texto || "Buscar por nombre, SKU o código…"}</span>
                        <span className="ml-auto inline-flex size-8 items-center justify-center rounded-md border border-linea">
                          <ScanBarcode className="size-4" />
                        </span>
                      </div>
                      {resultados.length > 0 && (
                        <ul className="absolute inset-x-0 top-12 z-10 space-y-0.5 rounded-lg border border-linea bg-popover p-1 shadow-xl">
                          {resultados.map((p, i) => (
                            <li key={p.id} ref={i === 0 ? refResultado : undefined} className={cn("flex items-center gap-3 rounded-md px-2 py-1.5", i === 0 && "bg-muted")}>
                              <MiniaturaProducto tipo={p.ilustracion} className="size-8" />
                              <span className="min-w-0 flex-1 truncate text-sm">{p.nombre}</span>
                              <span className="num text-xs text-muted-foreground">{formatoCantidad(motor.estado.stock[claveStock(cc.id, p.id)]?.cantidad ?? 0)} u.</span>
                              <span className="num text-sm font-semibold">{formatoPesos(motor.estado.precios[`${lista.id}:${p.id}`]?.precio ?? 0, { sinDecimales: true })}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Carrito items={items} onCambiar={() => {}} sucursalId={cc.id} listaId={lista.id} />
                  </div>
                  <div className="space-y-3 rounded-xl border border-linea bg-card p-4">
                    <p className="text-sm text-muted-foreground">Consumidor final · Minorista</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-[34px] font-semibold tracking-tight">{formatoPesos(total)}</p>
                    <button ref={refCobrar} type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-medium text-primary-foreground">
                      <ShoppingCart className="size-4" /> Cobrar
                    </button>
                    {venta && (
                      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-lg border border-ok/40 bg-ok/10 p-3 text-sm">
                        <CheckCircle2 className="size-5 text-ok" /> Venta {venta.numero ? `#${venta.numero}` : venta.numeroLocal}
                      </motion.p>
                    )}
                  </div>
                </div>
              )}
              {cobrando && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-negro/60">
                  <div className="w-[420px] space-y-4 rounded-xl border border-linea bg-popover p-6">
                    <p className="text-lg font-semibold">Cobrar</p>
                    <p className="text-4xl font-semibold tracking-tight">{formatoPesos(total)}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {["Efectivo", "Débito", "Mercado Pago"].map((m, i) => (
                        <span key={m} className={cn("rounded-lg border px-2 py-3 text-center", i === 0 ? "border-primary bg-primary/15 font-semibold" : "border-linea")}>
                          {m}
                        </span>
                      ))}
                    </div>
                    <button ref={refConfirmar} type="button" className="h-11 w-full rounded-lg bg-primary font-medium text-primary-foreground">
                      Confirmar venta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Celular para el escaneo */}
          <motion.div
            ref={refTelefono}
            className="dark absolute -bottom-10 right-10 z-30 w-[330px] overflow-hidden rounded-[42px] border-[10px] border-[#22272f] bg-background text-foreground shadow-2xl"
            initial={{ opacity: 0, y: 80 }}
            animate={paso === "escaneo" ? { opacity: 1, y: 0 } : { opacity: 0, y: 80 }}
            transition={{ duration: 0.6 / velocidad }}
            style={{ height: 520 }}
          >
            <div className="relative h-[250px] bg-[#05070a]">
              <div className="absolute inset-x-10 top-1/2 h-[3px] -translate-y-1/2 bg-error/90 shadow-[0_0_14px_3px_rgba(229,72,77,0.6)]" />
              <svg viewBox="0 0 200 80" className="absolute left-1/2 top-1/2 w-44 -translate-x-1/2 -translate-y-1/2 opacity-80" aria-hidden>
                {Array.from({ length: 34 }, (_, i) => (
                  <rect key={i} x={i * 5.8} y="0" width={i % 3 === 0 ? 3 : 1.5} height="70" fill="#eef1f4" />
                ))}
              </svg>
              <p className="absolute bottom-3 left-0 right-0 text-center font-mono text-[11px] text-acero">{escaneado ? escaneado.codigoBarras : "Apuntá al código…"}</p>
            </div>
            {escaneado && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <MiniaturaProducto tipo={escaneado.ilustracion} className="size-11" />
                  <p className="text-sm font-semibold leading-snug">{escaneado.nombre}</p>
                </div>
                <ul className="space-y-1.5">
                  {e.sucursales.map((s) => (
                    <li key={s.id} className="flex justify-between rounded-md bg-superficie-2 px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">
                        {s.codigo} · {s.nombre}
                      </span>
                      <span className="num font-semibold">{e.stock[claveStock(s.id, escaneado.id)] ? formatoCantidad(e.stock[claveStock(s.id, escaneado.id)].cantidad) : "—"}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Cursor animado */}
      <motion.svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-0 top-0 z-50 size-9 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
        animate={{ x: cursor.x, y: cursor.y }}
        transition={{ duration: reducir ? 0 : 0.55 / velocidad, ease: [0.3, 0.7, 0.2, 1] }}
        aria-hidden
      >
        <path d="M4 2l15 10-7 1.5L9 21z" fill="#eef1f4" stroke="#0e1116" strokeWidth="1.4" strokeLinejoin="round" />
      </motion.svg>
      <motion.span
        key={cursor.clic}
        className="pointer-events-none absolute left-0 top-0 z-40 size-10 rounded-full border-2 border-alerta"
        initial={{ x: cursor.x - 14, y: cursor.y - 14, scale: 0.2, opacity: cursor.clic ? 0.9 : 0 }}
        animate={{ x: cursor.x - 14, y: cursor.y - 14, scale: 1.4, opacity: 0 }}
        transition={{ duration: 0.5 / velocidad }}
        aria-hidden
      />
    </div>
  )
}

function TarjetaPresupuesto({ presupuesto, botonRef, venta }: { presupuesto: import("@/dominio/tipos").Presupuesto; botonRef: React.RefObject<HTMLButtonElement | null>; venta: string | null }) {
  return (
    <div className="mx-auto max-w-[720px] space-y-4 rounded-xl border border-linea bg-card p-6">
      <div className="flex items-center gap-2">
        <span className="ficha">Presupuesto #{presupuesto.numero}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", venta ? "bg-ok/15 text-ok" : "bg-foreground/15 text-foreground")}>{venta ? "Convertido en venta" : "Enviado"}</span>
      </div>
      <p className="text-2xl font-bold">{presupuesto.clienteNombre}</p>
      <ul className="divide-y divide-linea rounded-lg border border-linea">
        {presupuesto.items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="num w-10 text-muted-foreground">{formatoCantidad(it.cantidad)} ×</span>
            <span className="min-w-0 flex-1 truncate">{it.descripcion}</span>
            <span className="num">{formatoPesos(Math.round(it.cantidad * it.precioUnitario), { sinDecimales: true })}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-end justify-between">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-3xl font-semibold">{formatoPesos(presupuesto.total)}</span>
      </div>
      {venta ? (
        <p className="flex items-center gap-2 rounded-lg border border-ok/40 bg-ok/10 p-3 text-sm">
          <CheckCircle2 className="size-5 text-ok" /> Convertido en la venta {venta}
        </p>
      ) : (
        <button ref={botonRef} type="button" className="flex h-12 items-center gap-2 rounded-lg bg-primary px-5 font-medium text-primary-foreground">
          <ShoppingCart className="size-4" /> Convertir en venta
        </button>
      )}
    </div>
  )
}
