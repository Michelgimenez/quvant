"use client"

import { useState } from "react"
import { Download, ImageUp, Plug, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { reiniciarDemo } from "@/cliente/motor-demo"
import { EncabezadoPagina, Panel, Requiere } from "@/components/app/pagina"
import { LogoOrg } from "@/components/base/logo-org"
import { EstadoFeatureBadge } from "@/components/base/sellos"
import { ConQuvantDiscreto } from "@/components/marca/con-quvant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { COLOR_DEMO } from "@/datos/demo/catalogo"
import { MODULOS, type Modulo } from "@/dominio/tipos"
import { ESTADO_INTEGRACIONES, integraciones } from "@/integraciones"
import { contraste, esHexValido, nivelAA, textoSobre } from "@/lib/color"
import { descargarArchivo, descargarCSV, pesos } from "@/lib/csv"
import { cn } from "@/lib/utils"

const NOMBRE_MODULO: Record<Modulo, [string, string]> = {
  inventario: ["Inventario", "Stock multisucursal, conteos, transferencias"],
  precios: ["Precios", "Listas y aumento masivo"],
  mostrador: ["Mostrador", "Ventas, caja y cobros"],
  presupuestos: ["Presupuestos", "Presupuestos que pasan a venta"],
  servicio: ["Servicio técnico", "Taller y avisos a clientes"],
  clientes: ["Clientes", "Fichas y cuentas corrientes"],
  compras: ["Compras", "Órdenes a proveedores y recepción"],
  entregas: ["Entregas", "Hoja de ruta"],
  reportes: ["Reportes", "Números del negocio"],
}

const PRESETS = ["#12A594", "#FF5A1F", "#E5484D", "#3466F0", "#8E4EC6", "#F5A524", "#0D0D0F", "#30A46C"]

export function Configuracion() {
  return (
    <Requiere permiso="config.editar">
      <EncabezadoPagina ficha="Configuración de la organización" titulo="Configuración" descripcion="Tu marca adentro del sistema, los módulos que usás y tus datos." />
      <Tabs defaultValue="marca">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="marca">Marca</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="estructura">Sucursales y listas</TabsTrigger>
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
          <TabsTrigger value="datos">Tus datos</TabsTrigger>
        </TabsList>
        <TabsContent value="marca">
          <Marca />
        </TabsContent>
        <TabsContent value="modulos">
          <Modulos />
        </TabsContent>
        <TabsContent value="estructura">
          <Estructura />
        </TabsContent>
        <TabsContent value="integraciones">
          <Integraciones />
        </TabsContent>
        <TabsContent value="datos">
          <Datos />
        </TabsContent>
      </Tabs>
    </Requiere>
  )
}

function leerLogo(archivo: File): Promise<string> {
  return new Promise((ok, mal) => {
    if (archivo.size > 300 * 1024) return mal(new Error("El logo pesa más de 300 KB"))
    if (!/^image\/(svg\+xml|png|jpeg|webp)$/.test(archivo.type)) return mal(new Error("Formato no admitido (SVG, PNG, JPG o WebP)"))
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => mal(new Error("No se pudo leer el archivo"))
    r.readAsDataURL(archivo)
  })
}

function Marca() {
  const { e } = useDatos()
  const { ejecutar } = useApp()
  const [nombre, setNombre] = useState(e.org.nombre)
  const [color, setColor] = useState(e.org.colorAcento)
  const [logo, setLogo] = useState(e.org.logo)
  const [logoNegativo, setLogoNegativo] = useState(e.org.logoNegativo)
  const valido = esHexValido(color)
  const texto = valido ? textoSobre(color) : "#ffffff"
  const nivel = valido ? nivelAA(color, texto) : "insuficiente"
  const vistaOrg = { nombre, logo, logoNegativo, colorAcento: valido ? color : e.org.colorAcento }

  const subir = (set: (s: string) => void) => async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]
    if (!f) return
    try {
      set(await leerLogo(f))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Panel titulo="Identidad">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="org-nombre">Nombre de la empresa</Label>
            <Input id="org-nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["Logo (fondo claro)", logo, setLogo, "bg-white"],
                ["Logo (fondo oscuro)", logoNegativo, setLogoNegativo, "bg-negro"],
              ] as const
            ).map(([etiqueta, valor, set, fondo]) => (
              <div key={etiqueta} className="space-y-1.5">
                <Label>{etiqueta}</Label>
                <div className={cn("flex h-20 items-center justify-center rounded-lg border border-linea p-3", fondo)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- logo subido por la organización */}
                  {valor ? <img src={valor} alt="" className="max-h-full max-w-full" /> : <span className="t-texto-sm text-acero">Sin logo</span>}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 t-texto-sm text-foreground hover:underline">
                  <ImageUp className="size-3.5" /> Subir (SVG, PNG, máx. 300 KB)
                  <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="sr-only" onChange={subir(set as (s: string) => void)} />
                </label>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-color">Color de acento</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={valido ? color : "#000000"} onChange={(ev) => setColor(ev.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer rounded border border-linea bg-transparent" aria-label="Elegir color" />
              <Input id="org-color" value={color} onChange={(ev) => setColor(ev.target.value)} className="num w-32" aria-invalid={!valido || undefined} />
              <span className={cn("rounded-full px-2 py-0.5 t-texto-sm font-medium", nivel === "insuficiente" ? "bg-error/15 text-error" : "bg-ok/15 text-ok")}>
                {nivel === "insuficiente" ? "Contraste bajo" : `Contraste ${nivel}`} {valido && `· ${contraste(color, texto).toFixed(1)}:1`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setColor(p)} className="size-7 rounded-md border border-linea" style={{ background: p }} aria-label={`Usar ${p}`} />
              ))}
            </div>
            <p className="t-texto-sm text-muted-foreground">El texto sobre el color se elige solo (blanco o negro) para que siempre se lea.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!valido}
              onClick={async () => {
                const r = await ejecutar("org.config", { cambios: { nombre, colorAcento: color.toUpperCase(), logo, logoNegativo } }, null)
                if (!r.ok) return toast.error(r.error)
                toast.success("Marca actualizada en todo el sistema")
              }}
            >
              <Save /> Guardar
            </Button>
            {e.org.esDemo && (
              <Button
                variant="outline"
                onClick={() => {
                  setColor(COLOR_DEMO)
                  setLogo("/demo/ferreteria-industrial-demo-claro.svg")
                  setLogoNegativo("/demo/ferreteria-industrial-demo-oscuro.svg")
                  setNombre("Ferretería Industrial Demo")
                }}
              >
                <RotateCcw /> Marca de la demo
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <Panel titulo="Vista previa" ficha="Así se ve tu sistema">
        <div className="space-y-4">
          {(["dark", "light"] as const).map((tema) => (
            <div key={tema} className={cn("overflow-hidden rounded-lg border border-linea", tema)}>
              <div className="bg-background text-foreground">
                <div className="h-[3px]" style={{ background: vistaOrg.colorAcento }} />
                <div className="flex items-center gap-3 border-b border-linea px-3 py-2">
                  <LogoOrg org={vistaOrg} alto="h-7" />
                  <span className="ml-auto inline-flex h-6 items-center gap-1.5 rounded-full border border-linea px-2 t-texto-sm">
                    <span className="size-1.5 rounded-full bg-ok" /> Sincronizado
                  </span>
                  <span className="inline-flex size-6 items-center justify-center rounded-full t-texto-sm font-bold" style={{ background: vistaOrg.colorAcento, color: texto }}>
                    MO
                  </span>
                </div>
                <div className="grid grid-cols-[120px_1fr]">
                  <div className="space-y-1 border-r border-linea bg-sidebar p-2 t-texto-sm">
                    {["Tablero", "Mostrador", "Inventario"].map((x, i) => (
                      <div key={x} className={cn("relative rounded px-2 py-1", i === 1 ? "bg-sidebar-accent font-medium" : "text-muted-foreground")}>
                        {i === 1 && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full" style={{ background: vistaOrg.colorAcento }} />}
                        {x}
                      </div>
                    ))}
                    <div className="pt-3">
                      <ConQuvantDiscreto className="text-[9px]" />
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="h-2.5 w-24 rounded bg-muted" />
                    <div className="h-14 rounded-md border border-linea bg-card" />
                    <div className="h-7 w-28 rounded-md bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function Modulos() {
  const { e } = useDatos()
  const { ejecutar } = useApp()
  return (
    <Panel titulo="Módulos activos" ficha="Activá solo lo que tu negocio usa">
      <ul className="divide-y divide-linea">
        {MODULOS.map((m) => (
          <li key={m} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="t-texto-sm font-medium">{NOMBRE_MODULO[m][0]}</p>
              <p className="t-texto-sm text-muted-foreground">{NOMBRE_MODULO[m][1]}</p>
            </div>
            <Switch
              checked={e.org.modulos[m] !== false}
              aria-label={`Módulo ${NOMBRE_MODULO[m][0]}`}
              onCheckedChange={async (activo) => {
                const r = await ejecutar("org.config", { cambios: { modulos: { [m]: activo } } }, null)
                if (!r.ok) return toast.error(r.error)
                toast.success(`${NOMBRE_MODULO[m][0]} ${activo ? "activado" : "desactivado"}`)
              }}
            />
          </li>
        ))}
      </ul>
      <p className="mt-2 t-texto-sm text-muted-foreground">Desactivar un módulo lo saca del menú y bloquea sus operaciones. Los datos no se borran.</p>
    </Panel>
  )
}

function Estructura() {
  const { e } = useDatos()
  const { ejecutar, motor } = useApp()
  const [nuevaLista, setNuevaLista] = useState("")
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel titulo="Negocios y sucursales">
        <div className="space-y-4">
          {e.negocios.map((n) => (
            <div key={n.id} className="space-y-2">
              <p className="t-texto-sm font-semibold">
                {n.nombre} <span className="ficha ml-1">CUIT {n.cuit}</span>
              </p>
              {e.sucursales
                .filter((s) => s.negocioId === n.id)
                .map((s) => (
                  <form
                    key={s.id}
                    className="grid grid-cols-[48px_minmax(0,1fr)_72px_auto] items-center gap-2"
                    onSubmit={async (ev) => {
                      ev.preventDefault()
                      const fd = new FormData(ev.currentTarget)
                      const r = await ejecutar("sucursal.guardar", { sucursalId: s.id, cambios: { nombre: String(fd.get("nombre")), puestos: Number(fd.get("puestos")) } }, null)
                      if (!r.ok) return toast.error(r.error)
                      toast.success("Sucursal actualizada")
                    }}
                  >
                    <span className="num t-texto-sm text-muted-foreground">{s.codigo}</span>
                    <Input name="nombre" defaultValue={s.nombre} aria-label={`Nombre de ${s.codigo}`} className="h-8" />
                    <Input name="puestos" type="number" min={1} max={50} defaultValue={s.puestos} aria-label={`Puestos de ${s.codigo}`} className="num h-8" />
                    <Button size="sm" variant="ghost" type="submit">
                      Guardar
                    </Button>
                  </form>
                ))}
            </div>
          ))}
          <p className="t-texto-sm text-muted-foreground">Las sucursales nuevas se dan de alta junto con el equipo de Quvant durante la implementación.</p>
        </div>
      </Panel>
      <Panel titulo="Listas de precios">
        <ul className="space-y-2">
          {e.listas.map((l) => (
            <li key={l.id}>
              <form
                className="grid grid-cols-[minmax(0,1fr)_96px_auto] items-center gap-2"
                onSubmit={async (ev) => {
                  ev.preventDefault()
                  const fd = new FormData(ev.currentTarget)
                  const r = await ejecutar("lista.guardar", { listaId: l.id, cambios: { nombre: String(fd.get("nombre")), margenSugerido: Number(fd.get("margen")) } }, null)
                  if (!r.ok) return toast.error(r.error)
                  toast.success("Lista actualizada")
                }}
              >
                <Input name="nombre" defaultValue={l.nombre} aria-label="Nombre de la lista" className="h-8" />
                <div className="relative">
                  <Input name="margen" type="number" defaultValue={l.margenSugerido} aria-label="Margen sugerido" className="num h-8 pr-6" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 t-texto-sm text-muted-foreground">%</span>
                </div>
                <Button size="sm" variant="ghost" type="submit">
                  Guardar
                </Button>
              </form>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const r = await ejecutar("lista.guardar", { listaId: motor.uuid(), nuevo: { nombre: nuevaLista, margenSugerido: 40 } }, null)
            if (!r.ok) return toast.error(r.error)
            setNuevaLista("")
            toast.success("Lista creada")
          }}
        >
          <Input value={nuevaLista} onChange={(ev) => setNuevaLista(ev.target.value)} placeholder="Nueva lista (ej.: Revendedores)" className="h-8" aria-label="Nueva lista" />
          <Button size="sm" type="submit" disabled={nuevaLista.trim().length < 2}>
            Crear
          </Button>
        </form>
      </Panel>
    </div>
  )
}

function Integraciones() {
  const [probando, setProbando] = useState<string | null>(null)
  const probar = async (id: string) => {
    setProbando(id)
    const i = integraciones()
    try {
      if (id === "arca") {
        const r = await i.facturador.autorizar({ ventaId: `prueba-${Date.now()}`, tipo: "FB", total: 100 })
        toast.success(`ARCA respondió · CAE ${r.cae}`, { description: r.emulado ? "Respuesta emulada: no es un CAE real." : undefined })
      } else if (id === "mercadopago") {
        const r = await i.cobrador.crearCobroQR(100, "prueba")
        toast.success(`QR generado · ${r.id}`, { description: r.emulado ? "Cobro emulado." : undefined })
      } else if (id === "whatsapp") {
        const r = await i.mensajeria.enviar("+54 9 11 0000-0000", "Prueba")
        toast.success("Mensaje de prueba aceptado", { description: r.emulado ? "Envío emulado: no salió ningún mensaje." : undefined })
      } else {
        toast.info("Todavía no está construida.")
      }
    } finally {
      setProbando(null)
    }
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {ESTADO_INTEGRACIONES.map((x) => (
        <Panel key={x.id}>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{x.nombre}</p>
              <EstadoFeatureBadge estado={x.estado === "proximamente" ? "próximamente" : x.estado === "emulada" ? "demo" : "disponible"} />
            </div>
            <p className="t-texto-sm text-muted-foreground">{x.descripcion}</p>
            <p className="t-texto-sm text-muted-foreground">{x.detalle}</p>
            <Button size="sm" variant="outline" disabled={x.estado === "proximamente" || probando === x.id} onClick={() => probar(x.id)}>
              <Plug /> {probando === x.id ? "Probando…" : "Probar conexión"}
            </Button>
          </div>
        </Panel>
      ))}
    </div>
  )
}

function Datos() {
  const { e } = useDatos()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel titulo="Exportar" ficha="Tus datos, siempre exportables">
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="outline"
            onClick={() =>
              descargarCSV("productos", [
                ["SKU", "Código de barras", "Nombre", "Categoría", "Marca", "Unidad", "Costo", "IVA", ...e.listas.map((l) => `Precio ${l.nombre}`), ...e.sucursales.map((s) => `Stock ${s.codigo}`)],
                ...Object.values(e.productos).map((p) => [
                  p.sku,
                  p.codigoBarras,
                  p.nombre,
                  e.categorias.find((c) => c.id === p.categoriaId)?.nombre,
                  e.marcas.find((m) => m.id === p.marcaId)?.nombre,
                  p.unidad,
                  pesos(p.costo),
                  p.iva,
                  ...e.listas.map((l) => pesos(e.precios[`${l.id}:${p.id}`]?.precio ?? 0)),
                  ...e.sucursales.map((s) => e.stock[`${s.id}:${p.id}`]?.cantidad ?? ""),
                ]),
              ])
            }
          >
            <Download /> Productos, precios y stock (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              descargarCSV("ventas", [
                ["Número", "Fecha", "Sucursal", "Cliente", "Total", "Estado", "Origen"],
                ...Object.values(e.ventas).map((v) => [v.numero ?? v.numeroLocal, new Date(v.fecha).toLocaleString("es-AR"), e.sucursales.find((s) => s.id === v.sucursalId)?.codigo, v.clienteId ? e.clientes[v.clienteId]?.nombre : "Consumidor final", pesos(v.total), v.estado, v.origen]),
              ])
            }
          >
            <Download /> Ventas (CSV)
          </Button>
          <Button variant="outline" onClick={() => descargarArchivo(`quvant-${e.org.slug}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(e, null, 1), "application/json")}>
            <Download /> Todo (JSON completo)
          </Button>
        </div>
      </Panel>
      <Panel titulo="Copias de seguridad">
        <p className="t-texto-sm text-muted-foreground">
          En producción la base de datos hace copias diarias automáticas (según el plan contratado) y los datos se pueden exportar cuando quieras. La restauración probada forma parte de la auditoría previa a producción (ver hoja de ruta).
        </p>
        {e.org.esDemo && (
          <Button
            variant="outline"
            className="mt-3"
            onClick={async () => {
              if (!confirm("¿Reiniciar los datos de la demo en este navegador?")) return
              await reiniciarDemo(e.org.id)
              location.reload()
            }}
          >
            <RotateCcw /> Reiniciar datos de la demo
          </Button>
        )}
      </Panel>
    </div>
  )
}
