import { getImageProps } from "next/image"
import {
  Boxes,
  Building2,
  CircleCheck,
  Clock,
  Database,
  Download,
  Factory,
  FileWarning,
  KeyRound,
  Layers,
  MessageSquareWarning,
  ScrollText,
  ServerCrash,
  ShieldCheck,
  Store,
  Tractor,
  Wrench,
} from "lucide-react"
import { EstadoFeatureBadge, TextoConfig } from "@/components/base/sellos"
import { Chispa, Logo } from "@/components/marca/marca"
import { PRECIOS } from "@/config/precios"
import { SITIO } from "@/config/sitio"
import { ETIQUETA_ESTADO, FEATURES, type EstadoFeature } from "@/showcase/features"
import { cn } from "@/lib/utils"

export function Encabezado({ ficha, titulo, bajada, id, centrado = false }: { ficha: string; titulo: string; bajada?: string; id: string; centrado?: boolean }) {
  return (
    <div className={cn("mb-10 max-w-3xl space-y-3", centrado && "mx-auto text-center")}>
      <p className="ficha text-acero">{ficha}</p>
      <h2 id={id} className="text-balance text-3xl font-extrabold text-niebla sm:text-5xl">
        {titulo}
      </h2>
      {bajada && <p className="text-pretty text-lg text-acero">{bajada}</p>}
    </div>
  )
}

const PROBLEMAS = [
  { icono: Clock, titulo: "Sistemas viejos que se traban", texto: "Pantallas lentas, instalados en una sola PC y que nadie se anima a tocar." },
  { icono: ServerCrash, titulo: "Se cae el servidor, se frena la venta", texto: "Un corte de internet o de luz y el mostrador queda parado con gente esperando." },
  { icono: FileWarning, titulo: "Precios que llevan un día", texto: "Llega la lista del proveedor y actualizar miles de artículos es una jornada perdida." },
  { icono: MessageSquareWarning, titulo: "Presupuestos perdidos en WhatsApp", texto: "Se mandan, nadie les hace seguimiento y no se sabe cuántos se concretan." },
  { icono: Layers, titulo: "Cada negocio por separado", texto: "Varias sucursales o negocios y ninguna pantalla que muestre todo junto." },
]

export function Problema() {
  return (
    <section id="problema" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-20" aria-labelledby="titulo-problema">
      <Encabezado id="titulo-problema" ficha="01 · El problema" titulo="El sistema no puede ser el que frena el negocio." bajada="En una ferretería industrial se venden miles de artículos, con precios que cambian todo el tiempo. Con las herramientas de siempre, eso cuesta caro." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PROBLEMAS.map((p) => (
          <li key={p.titulo} className="rounded-xl border border-white/10 bg-superficie/70 p-5">
            <p.icono className="size-6 text-acero" aria-hidden />
            <h3 className="mt-4 font-semibold text-niebla">{p.titulo}</h3>
            <p className="mt-2 text-sm text-acero">{p.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

const MODULOS = [
  { id: "app-tablero", titulo: "Tablero multinegocio", texto: "Todos tus negocios y sucursales en una pantalla: ventas de hoy, lo más vendido y lo que hay que atender.", features: ["tablero-multinegocio", "reportes"] },
  { id: "app-mostrador", titulo: "Mostrador", texto: "Rápido con teclado y lector, cobra con cualquier medio y sigue funcionando sin internet.", features: ["mostrador", "mostrador-sin-conexion", "caja"] },
  { id: "app-inventario", titulo: "Inventario", texto: "El stock de cada sucursal, conteos con el celular y transferencias con registro.", features: ["inventario-multisucursal", "escaneo-camara", "conteos"] },
  { id: "app-precios", titulo: "Precios al día", texto: "Aumentos por marca, rubro o proveedor con vista previa del impacto antes de aplicar.", features: ["aumento-masivo", "listas-precios"] },
  { id: "app-presupuestos", titulo: "Presupuestos", texto: "Prolijos, con seguimiento, y pasan a venta con un clic.", features: ["presupuestos"] },
  { id: "app-servicio", titulo: "Servicio técnico", texto: "Cada equipo en el taller con su estado, su técnico y el aviso al cliente.", features: ["servicio-tecnico", "avisos-whatsapp"] },
  { id: "app-clientes", titulo: "Clientes y cuentas corrientes", texto: "Saldo, límite y movimientos de cada cliente, a la vista de quien vende.", features: ["clientes-cuentas"] },
  { id: "app-configuracion", titulo: "Tu marca adentro", texto: "Tu logo y tu color en el sistema. Activás solo los módulos que usás.", features: ["co-branding", "modulos-por-org"] },
]

export function Modulos() {
  return (
    <section id="modulos" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-20" aria-labelledby="titulo-modulos">
      <Encabezado id="titulo-modulos" ficha="03 · Módulos" titulo="Todo el negocio, en un solo lugar." bajada="Capturas reales de la app, con los datos de la empresa de demostración. Cada función dice en qué estado está hoy." />
      <div className="space-y-16">
        {MODULOS.map((m, i) => (
          <article key={m.id} className={cn("grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]", i % 2 === 1 && "lg:[&>*:first-child]:order-2")}>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-niebla sm:text-3xl">{m.titulo}</h3>
              <p className="text-acero">{m.texto}</p>
              <ul className="space-y-2">
                {m.features.map((fid) => {
                  const f = FEATURES.find((x) => x.id === fid)!
                  return (
                    <li key={fid} className="flex flex-wrap items-center gap-2 text-sm text-niebla">
                      <EstadoFeatureBadge estado={f.estado} className="border-white/10 bg-hierro" />
                      {f.nombre}
                    </li>
                  )
                })}
              </ul>
            </div>
            <MarcoNavegador>
              <Captura id={m.id} alt={`Captura de ${m.titulo} con datos de la empresa demo`} />
            </MarcoNavegador>
          </article>
        ))}
      </div>
    </section>
  )
}

/** Imagen optimizada sin JavaScript en el cliente (props generadas en el servidor). */
function Captura({ id, alt }: { id: string; alt: string }) {
  const { props } = getImageProps({ src: `/capturas/${id}.png`, alt, width: 1440, height: 900, sizes: "(min-width: 1024px) 680px, 100vw" })
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- img nativo con props de next/image (alt incluido)
  return <img {...props} loading="lazy" decoding="async" className="h-auto w-full" />
}

export function MarcoNavegador({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-white/10 bg-superficie shadow-2xl shadow-black/40", className)}>
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2" aria-hidden>
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 h-4 flex-1 rounded bg-white/5" />
      </div>
      {children}
    </div>
  )
}

const AUDIENCIAS = [
  { icono: Factory, titulo: "Ferreterías industriales", texto: "Miles de artículos, venta al gremio y a empresas, cuenta corriente." },
  { icono: Tractor, titulo: "Distribuidores de maquinaria", texto: "Equipos de alto valor, entregas, garantía y servicio técnico." },
  { icono: Building2, titulo: "Corralones", texto: "Mostrador con mucho movimiento, presupuestos de obra y reparto." },
  { icono: Wrench, titulo: "Casas de repuestos", texto: "Códigos, equivalencias y stock exacto por sucursal." },
  { icono: Store, titulo: "Negocios con varias sucursales", texto: "Stock y precios de todas las sucursales en un solo tablero." },
]

export function ParaQuien() {
  return (
    <section className="diferida mx-auto max-w-6xl px-4 py-20" aria-labelledby="titulo-para-quien">
      <Encabezado id="titulo-para-quien" ficha="05 · Para quién es" titulo="Hecho para negocios con stock complicado." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {AUDIENCIAS.map((a) => (
          <li key={a.titulo} className="rounded-xl border border-white/10 bg-superficie/70 p-5">
            <a.icono className="size-6 text-temple" aria-hidden />
            <h3 className="mt-4 font-semibold text-niebla">{a.titulo}</h3>
            <p className="mt-2 text-sm text-acero">{a.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

const SEGURIDAD = [
  { icono: Database, titulo: "Copias diarias", texto: "La base de datos de producción hace copias automáticas todos los días." },
  { icono: Download, titulo: "Tus datos son tuyos", texto: "Exportás productos, ventas y clientes cuando quieras, en Excel o completo." },
  { icono: KeyRound, titulo: "Permisos por rol", texto: "Cada persona ve y hace solo lo suyo. Quien vende no ve costos." },
  { icono: ScrollText, titulo: "Registro de auditoría", texto: "Queda quién hizo qué y cuándo. No se puede borrar ni editar." },
  { icono: ShieldCheck, titulo: "Doble factor", texto: "Dueños y administración entran con un código del celular además de la contraseña." },
  { icono: Boxes, titulo: "Cada empresa separada", texto: "Los datos de cada empresa quedan aislados en la base, con pruebas automáticas que lo verifican." },
]

export function Seguridad() {
  return (
    <section className="diferida mx-auto max-w-6xl px-4 py-20" aria-labelledby="titulo-seguridad">
      <Encabezado id="titulo-seguridad" ficha="06 · Seguridad y tus datos" titulo="Tus datos, cuidados y siempre tuyos." bajada="Sin promesas de certificaciones que no tenemos: antes de pasar a producción, una auditoría externa revisa la arquitectura y la seguridad." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SEGURIDAD.map((s) => (
          <li key={s.titulo} className="flex gap-4 rounded-xl border border-white/10 bg-superficie/70 p-5">
            <s.icono className="size-6 shrink-0 text-ok" aria-hidden />
            <div>
              <h3 className="font-semibold text-niebla">{s.titulo}</h3>
              <p className="mt-1 text-sm text-acero">{s.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Precios() {
  return (
    <section id="precios" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-20" aria-labelledby="titulo-precios">
      <Encabezado
        id="titulo-precios"
        ficha="07 · Precios"
        titulo={`Desde USD ${PRECIOS.desdePorNegocio} por mes por negocio.`}
        bajada={`Usuarios ilimitados. ${PRECIOS.implementacion}`}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {PRECIOS.planes.map((p, i) => (
          <article key={p.id} className={cn("flex flex-col rounded-2xl border p-6", i === 0 ? "border-temple/50 bg-superficie" : "border-white/10 bg-superficie/70")}>
            <h3 className="text-xl font-bold text-niebla">{p.nombre}</h3>
            <p className="mt-1 text-sm text-acero">{p.para}</p>
            <p className="mt-6 text-niebla">
              {p.precioMensual ? (
                <>
                  <span className="text-5xl font-extrabold tracking-tight">USD {p.precioMensual}</span> <span className="text-acero">{p.unidad}</span>
                </>
              ) : (
                <span className="text-3xl font-bold">A medida</span>
              )}
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {p.incluye.map((x) => (
                <li key={x} className="flex gap-2 text-sm text-niebla">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> {x}
                </li>
              ))}
            </ul>
            <a href="#pedir-demo" className={cn("mt-8 inline-flex h-11 items-center justify-center rounded-lg text-sm font-semibold", i === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-white/15 text-niebla hover:border-white/30")}>
              {p.precioMensual ? "Pedir una demo" : "Hablemos"}
            </a>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-acero">Precios en dólares estadounidenses, más impuestos. La implementación (migración de datos, configuración y capacitación) se cotiza según cada negocio.</p>
    </section>
  )
}

export function EstadoProducto() {
  const grupos: EstadoFeature[] = ["disponible", "demo", "próximamente"]
  return (
    <section className="diferida mx-auto max-w-6xl px-4 py-20" aria-labelledby="titulo-estado">
      <Encabezado id="titulo-estado" ficha="Estado real" titulo="Qué está listo hoy." bajada={`${SITIO.estado}. Esto es lo que funciona, lo que se puede ver con partes emuladas y lo que viene.`} />
      <div className="grid gap-4 lg:grid-cols-3">
        {grupos.map((g) => (
          <div key={g} className="rounded-xl border border-white/10 bg-superficie/70 p-5">
            <EstadoFeatureBadge estado={g} className="border-white/10 bg-hierro" />
            <p className="mt-2 text-xs text-acero">
              {g === "disponible" && "Funciona de punta a punta en la app (hoy con datos de demostración)."}
              {g === "demo" && "Se puede usar, con una parte emulada (integración, cobro, envío)."}
              {g === "próximamente" && "En la hoja de ruta. No está construido."}
            </p>
            <ul className="mt-4 space-y-2">
              {FEATURES.filter((f) => f.estado === g).map((f) => (
                <li key={f.id} className="text-sm text-niebla" title={f.nota}>
                  {f.nombre}
                  {f.nota && <span className="block text-xs text-acero">{f.nota}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="sr-only">Estados posibles: {Object.values(ETIQUETA_ESTADO).join(", ")}.</p>
    </section>
  )
}

const PREGUNTAS = [
  ["¿Qué pasa si se corta internet?", "El mostrador sigue vendiendo. Las ventas quedan guardadas en el equipo y se sincronizan solas cuando vuelve la conexión. Si mientras tanto otra sucursal vendió el mismo producto, el sistema lo marca para revisar; la venta nunca se pierde."],
  ["¿Puedo traer los datos de mi sistema actual?", "Sí. El importador lee Excel y CSV con el formato de tu sistema, te deja asignar las columnas y te muestra los errores antes de importar. La migración asistida desde sistemas específicos está en la hoja de ruta."],
  ["¿Hace factura electrónica?", "Todavía no: en la demo el comprobante es emulado y dice “sin validez fiscal”. La conexión con ARCA es una de las primeras etapas de la hoja de ruta, antes de pasar a producción."],
  ["¿Necesito comprar computadoras o un servidor?", "No. Funciona en el navegador de las computadoras y celulares que ya tenés. No hay servidor que mantener en el local."],
  ["¿Cuántos usuarios incluye?", "Los que necesites. El precio es por negocio, no por usuario."],
  ["¿Mis datos pueden verlos otras empresas?", "No. Cada empresa tiene sus datos separados en la base y hay pruebas automáticas que verifican que una empresa no pueda leer los datos de otra."],
  ["¿Qué es el programa de socios fundadores?", "Un cupo limitado de negocios que empiezan primero, con condiciones especiales a cambio de usar el sistema en serio y contarnos qué mejorar."],
]

export function Preguntas() {
  return (
    <section id="preguntas" className="diferida mx-auto max-w-3xl scroll-mt-24 px-4 py-20" aria-labelledby="titulo-preguntas">
      <Encabezado id="titulo-preguntas" ficha="09 · Preguntas" titulo="Lo que nos preguntan." centrado />
      <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-superficie/70">
        {PREGUNTAS.map(([p, r]) => (
          <details key={p} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-niebla">
              {p}
              <span className="text-acero transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-acero">{r}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function PieSitio() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo className="h-7 text-niebla" tono="negativo" />
          <p className="flex items-center gap-2 text-sm text-acero">
            {SITIO.tagline} <Chispa className="size-3" />
          </p>
          <p className="text-xs text-acero">{SITIO.contacto.ciudad}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="ficha text-acero">Producto</p>
          <a href="#modulos" className="block text-niebla hover:underline">
            Módulos
          </a>
          <a href="#precios" className="block text-niebla hover:underline">
            Precios
          </a>
          <a href="/ingresar" className="block text-niebla hover:underline">
            Probar la demo
          </a>
          <a href="/estado" className="block text-niebla hover:underline">
            Estado del sistema
          </a>
        </div>
        <div className="space-y-2 text-sm">
          <p className="ficha text-acero">Contacto</p>
          <p className="text-niebla">
            <TextoConfig texto={SITIO.contacto.email} />
          </p>
          <p className="text-niebla">
            <TextoConfig texto={SITIO.contacto.whatsapp} />
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-acero">
          © 2026 Yunque. Las capturas usan una empresa ficticia (“Ferretería Industrial Demo”); marcas, clientes y precios de la demo son inventados.
        </p>
      </div>
    </footer>
  )
}
