import Link from "next/link"
import { getImageProps } from "next/image"
import { ArrowRight, Check, Database, Download, Fingerprint, KeyRound, ScrollText, ShieldCheck } from "lucide-react"
import { EstadoFeatureBadge, Sello, TextoConfig } from "@/components/base/sellos"
import { LogoEmpresa } from "@/components/demo/logo-empresa"
import { Firma } from "@/components/marca/quvant"
import { PRECIOS, textoPrecioPlan } from "@/config/precios"
import { SITIO } from "@/config/sitio"
import { EMPRESAS, EMPRESAS_ORDEN, MODULOS_DEMO, type IdEmpresa } from "@/demo/empresas"
import { ETIQUETA_ESTADO, FEATURES, feature, type EstadoFeature } from "@/showcase/features"
import { cn } from "@/lib/utils"

/**
 * Las secciones del sitio (punto 6 de PROMPT-QUVANT.md). Negro y blanco sobre la grilla, Plex Mono con los estilos
 * cerrados, esquinas casi rectas y el estado real de cada función al lado (src/showcase/features.ts).
 */

export function Encabezado({ ficha, titulo, bajada, id, centrado = false, sello }: { ficha: string; titulo: string; bajada?: string; id: string; centrado?: boolean; sello?: React.ReactNode }) {
  return (
    <div className={cn("mb-12 max-w-3xl space-y-4", centrado && "mx-auto text-center")}>
      <p className={cn("t-etiqueta flex items-center gap-3 text-acero", centrado && "justify-center")}>
        {ficha}
        {sello}
      </p>
      <h2 id={id} className="t-titulo-lg text-blanco">
        {titulo}
      </h2>
      {bajada && <p className="t-texto max-w-2xl text-acero">{bajada}</p>}
    </div>
  )
}

/** Un botón del sitio: blanco (principal) o con borde. */
export function BotonSitio({ href, children, variante = "principal", className }: { href: string; children: React.ReactNode; variante?: "principal" | "borde"; className?: string }) {
  const clases = cn(
    "t-texto inline-flex h-12 items-center justify-center gap-2 rounded-md px-6 font-semibold transition-colors",
    variante === "principal" ? "bg-blanco text-negro hover:bg-gris-11" : "border border-gris-4 text-blanco hover:border-gris-8",
    className,
  )
  if (href.startsWith("/"))
    return (
      <Link href={href} prefetch={false} className={clases}>
        {children}
      </Link>
    )
  return (
    <a href={href} className={clases}>
      {children}
    </a>
  )
}

/** Un chip con el estado real, solo cuando no está disponible del todo (lo disponible no necesita aclaración). */
function EstadoSiHaceFalta({ id }: { id?: string }) {
  if (!id) return null
  const f = feature(id)
  if (f.estado === "disponible") return null
  return <EstadoFeatureBadge estado={f.estado} className="h-5 border-gris-3 bg-transparent px-1.5" />
}

// ───────────── 01 · El problema ─────────────

const PROBLEMAS: { tamano: string; empresa: IdEmpresa; dolores: string[] }[] = [
  { tamano: "Kiosco", empresa: "kiosco", dolores: ["El fiado en un cuaderno que nadie suma.", "La caja que a la noche no cierra.", "Precios que cambian cada semana, a mano."] },
  { tamano: "Comercio", empresa: "ferreteria", dolores: ["Un sistema viejo que se traba y se cae.", "Actualizar la lista del proveedor lleva un día.", "Presupuestos perdidos en WhatsApp."] },
  { tamano: "Distribuidora", empresa: "distribuidora", dolores: ["Pedidos en papel y en audios.", "Deuda en la calle que nadie mira a tiempo.", "Un reparto que se sigue por teléfono."] },
  { tamano: "Empresa", empresa: "grupo", dolores: ["Cada sucursal con su planilla y su verdad.", "Compras grandes sin una firma clara.", "Los números llegan a fin de mes, tarde."] },
]

export function Problema() {
  return (
    <section id="problema" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-problema">
      <Encabezado id="titulo-problema" ficha="01 · El problema" titulo="Cada tamaño tiene su problema. El sistema de siempre no ayuda." bajada="Del kiosco a la empresa, el dolor cambia de forma pero es el mismo: herramientas que se caen, que no se hablan entre sí y que llegan tarde." />
      <ul className="grid gap-px overflow-hidden rounded-lg border border-gris-3 bg-gris-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROBLEMAS.map((p) => (
          <li key={p.tamano} className="space-y-5 bg-negro p-6">
            <p className="t-etiqueta text-blanco">{p.tamano}</p>
            <ul className="lista-punto t-texto space-y-3 text-acero">
              {p.dolores.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ───────────── 03 · Un sistema, cuatro negocios ─────────────

const QUE_MIRA: Record<IdEmpresa, string> = {
  kiosco: "Lo que vendió hoy, lo que tiene que haber en la caja y quién le debe. Nada más.",
  ferreteria: "Dos negocios y tres sucursales: ventas por sucursal, presupuestos abiertos y el taller.",
  distribuidora: "La calle: doce preventistas contra su objetivo, el reparto del día y la deuda.",
  grupo: "Cuarenta sucursales en seis provincias: el consolidado, el mapa y lo que hay que aprobar.",
}

export function CuatroNegocios() {
  return (
    <section id="cuatro-negocios" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-cuatro">
      <Encabezado
        id="titulo-cuatro"
        ficha="03 · Un sistema, cuatro negocios"
        titulo="El mismo Quvant, con lo que cada uno necesita."
        bajada="Cada negocio enciende sus módulos: el kiosco ve una pantalla simple; el grupo, la densidad que necesita para controlar. Son cuatro empresas ficticias que podés recorrer en la demo."
        sello={<Sello titulo="Empresas ficticias con datos de demostración" />}
      />
      <ul className="grid gap-4 md:grid-cols-2">
        {EMPRESAS_ORDEN.map((id) => {
          const e = EMPRESAS[id]
          const encendidos = MODULOS_DEMO.filter((m) => e.modulos[m]).length
          return (
            <li key={id} className="group flex flex-col overflow-hidden rounded-lg border border-gris-3 bg-superficie-1 transition-colors hover:border-gris-5">
              <Link href={`/demo?empresa=${id}`} prefetch={false} className="flex flex-1 flex-col">
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <LogoEmpresa id={id} className="h-6" />
                    <span className="t-etiqueta text-acero">{e.escalaTexto}</span>
                  </div>
                  <p className="t-titulo-sm text-blanco">{e.nombre}</p>
                  <p className="t-texto-sm text-acero">{QUE_MIRA[id]}</p>
                </div>
                <div className="relative mx-6 overflow-hidden rounded-t-md border border-b-0 border-gris-3">
                  <Captura src={`/capturas/sitio/tablero-${id}.png`} alt={`El tablero de ${e.nombre}, empresa ficticia de la demo`} sizes="(min-width: 768px) 520px, 100vw" />
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-gris-3 px-6 py-4">
                  <span className="t-dato truncate text-acero">{encendidos} módulos encendidos</span>
                  <span className="t-texto-sm inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-blanco">
                    Verlo en la demo <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ───────────── 04 · Los módulos ─────────────

const MODULOS: { id: string; empresa: IdEmpresa; ruta: string; titulo: string; texto: string; features: string[] }[] = [
  { id: "kiosco-mostrador", empresa: "kiosco", ruta: "kiosco · vender", titulo: "Mostrador", texto: "Favoritos grandes, lector de códigos y el total que se lee de lejos. Si se corta internet, sigue vendiendo.", features: ["mostrador-kiosco", "mostrador", "mostrador-sin-conexion"] },
  { id: "kiosco-caja", empresa: "kiosco", ruta: "kiosco · caja", titulo: "Caja", texto: "El arqueo contra lo que dice el sistema, billete por billete. Con diferencia cero, la caja cierra.", features: ["caja"] },
  { id: "ferreteria-presupuestos", empresa: "ferreteria", ruta: "ferretería · presupuestos", titulo: "Presupuestos", texto: "Con vencimiento y seguimiento. Cuando el cliente dice que sí, pasan a venta con un clic.", features: ["presupuestos", "clientes-cuentas"] },
  { id: "ferreteria-transferencias", empresa: "ferreteria", ruta: "ferretería · transferencias", titulo: "Stock por sucursal", texto: "Lo que falta en una sucursal sale de otra, con registro: se despacha, viaja y se recibe.", features: ["inventario-multisucursal", "transferencias", "conteos"] },
  { id: "ferreteria-servicio", empresa: "ferreteria", ruta: "ferretería · servicio técnico", titulo: "Servicio técnico", texto: "Cada equipo en el taller con su estado, su técnico y el aviso al cliente cuando está listo.", features: ["servicio-tecnico", "avisos-whatsapp"] },
  { id: "distribuidora-preventa", empresa: "distribuidora", ruta: "distribuidora · preventa", titulo: "Preventa", texto: "El pedido llega desde la calle con la lista de precios de cada cliente y su cuenta corriente.", features: ["preventa", "listas-precios", "cobranzas-calle"] },
  { id: "distribuidora-reparto", empresa: "distribuidora", ruta: "distribuidora · reparto", titulo: "Reparto", texto: "La hoja de ruta de cada camión, entrega por entrega, con lo que falta.", features: ["entregas", "hoja-ruta-mapa"] },
  { id: "grupo-aprobaciones", empresa: "grupo", ruta: "grupo · aprobaciones", titulo: "Control del grupo", texto: "Las compras grandes se aprueban en dos niveles y todo queda en la auditoría. Las sucursales, comparadas con los mismos números.", features: ["aprobaciones-niveles", "comparacion-sucursales", "auditoria"] },
]

export function Modulos() {
  return (
    <section id="modulos" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-modulos">
      <Encabezado id="titulo-modulos" ficha="04 · Los módulos" titulo="Todo el negocio, en un solo lugar." bajada="Capturas de la demo, con sus empresas ficticias. Cada función dice en qué estado está hoy: disponible en la app, en demo o próximamente." />
      <ul className="grid gap-x-6 gap-y-14 md:grid-cols-2">
        {MODULOS.map((m) => (
          <li key={m.id} className="space-y-5">
            <Mockup ruta={m.ruta}>
              <Captura src={`/capturas/sitio/${m.id}.png`} alt={`${m.titulo}, en ${EMPRESAS[m.empresa].nombre} (empresa ficticia)`} sizes="(min-width: 768px) 548px, 100vw" />
            </Mockup>
            <div className="space-y-3">
              <h3 className="t-titulo text-blanco">{m.titulo}</h3>
              <p className="t-texto text-acero">{m.texto}</p>
              <ul className="space-y-1.5">
                {m.features.map((fid) => {
                  const f = feature(fid)
                  return (
                    <li key={fid} className="t-texto-sm flex items-center gap-2 text-blanco">
                      <EstadoFeatureBadge estado={f.estado} className="h-5 border-gris-3 bg-transparent px-1.5" />
                      <span className="sr-only">: </span>
                      {f.nombre}
                    </li>
                  )
                })}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Imagen optimizada sin JavaScript en el cliente (props generadas en el servidor). */
function Captura({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  const { props } = getImageProps({ src, alt, width: 1440, height: 852, sizes })
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- img nativo con props de next/image (alt incluido)
  return <img {...props} loading="lazy" decoding="async" className="block h-auto w-full" />
}

/** El marco de una captura: una ventana sobria, con cuadrados (no círculos) y la ruta en la demo. */
export function Mockup({ ruta, children, className }: { ruta: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-gris-3 bg-superficie-1", className)}>
      <div className="flex items-center gap-3 border-b border-gris-3 px-3 py-2" aria-hidden>
        <span className="flex gap-1">
          <span className="size-[6px] bg-gris-5" />
          <span className="size-[6px] bg-gris-5" />
          <span className="size-[6px] bg-gris-5" />
        </span>
        <span className="t-etiqueta truncate text-gris-7">quvant · demo · {ruta}</span>
      </div>
      {children}
    </div>
  )
}

/** Compatibilidad: las presentaciones usan el marco con este nombre. */
export const MarcoNavegador = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <Mockup ruta="app" className={className}>
    {children}
  </Mockup>
)

// ───────────── 06 · Seguridad y tus datos ─────────────

const SEGURIDAD = [
  { icono: Download, titulo: "Tus datos son tuyos", texto: "Exportás productos, ventas y clientes cuando quieras, completos.", feature: "copias-exportacion" },
  { icono: Database, titulo: "Cada empresa separada", texto: "Los datos de cada empresa quedan aislados en la base, con pruebas automáticas que lo verifican en cada cambio.", feature: "aislamiento-orgs" },
  { icono: KeyRound, titulo: "Permisos por rol", texto: "Cada persona ve y hace solo lo suyo. Quien vende no ve costos.", feature: "roles-permisos" },
  { icono: ScrollText, titulo: "Auditoría", texto: "Queda quién hizo qué y cuándo. No se puede borrar ni editar.", feature: "auditoria" },
  { icono: Fingerprint, titulo: "Doble factor", texto: "Dueños y administración entran con un código del celular además de la contraseña.", feature: "doble-factor" },
  { icono: ShieldCheck, titulo: "Estado a la vista", texto: "Una página pública dice si el sistema anda bien, sin esperar a que alguien pregunte.", feature: "estado-sistema" },
]

export function Seguridad() {
  return (
    <section id="seguridad" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-seguridad">
      <Encabezado
        id="titulo-seguridad"
        ficha="06 · Seguridad y tus datos"
        titulo="Tus datos, cuidados y siempre tuyos."
        bajada="Sin certificaciones que no tenemos. Antes de pasar a producción está prevista una auditoría externa de la arquitectura y la seguridad. Cada punto dice su estado real."
      />
      <ul className="grid gap-px overflow-hidden rounded-lg border border-gris-3 bg-gris-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEGURIDAD.map((s) => {
          const f = feature(s.feature)
          return (
            <li key={s.titulo} className="space-y-3 bg-negro p-6">
              <div className="flex items-center justify-between gap-3">
                <s.icono className="size-5 text-blanco" aria-hidden />
                <EstadoFeatureBadge estado={f.estado} className="h-5 border-gris-3 bg-transparent px-1.5" />
              </div>
              <h3 className="t-titulo-sm text-blanco">{s.titulo}</h3>
              <p className="t-texto-sm text-acero">{s.texto}</p>
              {f.estado !== "disponible" && f.nota && <p className="t-texto-sm text-gris-8">{f.nota}</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ───────────── 07 · Planes ─────────────

export function Planes() {
  return (
    <section id="planes" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-planes">
      <Encabezado id="titulo-planes" ficha="07 · Planes" titulo="Un plan para cada tamaño." bajada={`Pagás por lo que tu negocio usa. La implementación, ${PRECIOS.implementacion.charAt(0).toLowerCase()}${PRECIOS.implementacion.slice(1)}`} />
      <ul className="grid gap-px overflow-hidden rounded-lg border border-gris-3 bg-gris-3 md:grid-cols-2 lg:grid-cols-4">
        {PRECIOS.planes.map((p) => {
          const { precio, unidad } = textoPrecioPlan(p)
          return (
            <li key={p.id} className="flex flex-col bg-negro p-6" data-testid={`plan-${p.id}`}>
              <p className="t-etiqueta text-acero">Plan</p>
              <h3 className="t-titulo mt-1 text-blanco">{p.nombre}</h3>
              <p className="t-texto-sm mt-2 min-h-[3lh] text-acero">{p.para}</p>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="t-numero-lg text-blanco">{precio}</span>
                {unidad && <span className="t-texto-sm text-acero">{unidad}</span>}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.incluye.map((x) => (
                  <li key={x.texto} className="t-texto-sm flex gap-2 text-blanco">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-acero" aria-hidden />
                    <span className="space-x-2">
                      <span>{x.texto}</span>
                      <EstadoSiHaceFalta id={x.feature} />
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 grid gap-2">
                <BotonSitio href="#pedir-demo" variante={p.id === "empresa" ? "borde" : "principal"} className="h-11">
                  {p.id === "empresa" ? "Hablemos" : "Pedir una demo"}
                </BotonSitio>
                <Link href={`/demo?empresa=${p.empresaDemo}`} prefetch={false} className="t-texto-sm inline-flex h-9 items-center justify-center gap-1.5 text-acero transition-colors hover:text-blanco">
                  Ver este tamaño en la demo <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="t-texto-sm mt-4 text-acero">Precios en dólares estadounidenses, más impuestos. Donde dice «Consultá», el precio todavía no está publicado. Las funciones marcadas «En demo» o «Próximamente» se pueden ver en la demo pero no están terminadas en la app.</p>
    </section>
  )
}

// ───────────── 08 · Desarrollo a medida (BORRADOR) ─────────────

const METODO = [
  ["Entender", "Una charla para ver el problema con tus palabras y tus números."],
  ["Planear por fases", "Qué se entrega en cada fase, cuándo y cómo se va a probar."],
  ["Probar antes de seguir", "Cada fase se prueba con vos antes de empezar la siguiente."],
  ["Dejarlo andando", "Documentado, con quién lo mantiene y cómo se sigue."],
] as const

export function DesarrolloAMedida() {
  return (
    <section id="a-medida" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-medida">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Encabezado
            id="titulo-medida"
            ficha="08 · Desarrollo a medida"
            sello={<Sello texto="BORRADOR" titulo="Texto propuesto: falta que Michel lo confirme" />}
            titulo="¿Necesitás algo propio?"
            bajada="Además de Quvant, hacemos software a medida para quien necesita una herramienta que no existe: una integración, un circuito particular o un sistema entero. Se construye por fases y cada fase se prueba antes de seguir."
          />
          <BotonSitio href="#pedir-demo" variante="borde">
            Contanos qué necesitás <ArrowRight className="size-4" />
          </BotonSitio>
        </div>
        <ol className="grid gap-px self-start overflow-hidden rounded-lg border border-gris-3 bg-gris-3 sm:grid-cols-2">
          {METODO.map(([t, d], i) => (
            <li key={t} className="space-y-2 bg-negro p-6">
              <p className="t-dato text-gris-7">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="t-titulo-sm text-blanco">{t}</h3>
              <p className="t-texto-sm text-acero">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ───────────── Estado real ─────────────

export function EstadoProducto() {
  const grupos: EstadoFeature[] = ["disponible", "demo", "próximamente"]
  return (
    <section id="estado" className="diferida mx-auto max-w-6xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-estado">
      <Encabezado id="titulo-estado" ficha="Estado real" titulo="Qué está listo hoy." bajada={`${SITIO.estado}. Lo que funciona en la app, lo que se puede ver con partes emuladas y lo que viene.`} />
      <div className="grid gap-px overflow-hidden rounded-lg border border-gris-3 bg-gris-3 lg:grid-cols-3">
        {grupos.map((g) => (
          <div key={g} className="bg-negro p-6">
            <EstadoFeatureBadge estado={g} className="bg-transparent" />
            <p className="t-texto-sm mt-3 text-acero">
              {g === "disponible" && "Funciona de punta a punta en la app (hoy con datos de demostración)."}
              {g === "demo" && "Se puede ver y usar en la demo, con una parte emulada o sin terminar en la app."}
              {g === "próximamente" && "En la hoja de ruta. No está construido."}
            </p>
            <ul className="mt-5 space-y-2.5">
              {FEATURES.filter((f) => f.estado === g).map((f) =>
                f.nota ? (
                  <li key={f.id}>
                    <details className="group">
                      <summary className="t-texto-sm flex cursor-pointer list-none items-baseline justify-between gap-3 text-blanco [&::-webkit-details-marker]:hidden">
                        {f.nombre}
                        <span className="t-etiqueta shrink-0 text-gris-7 group-open:hidden">Nota</span>
                      </summary>
                      <p className="t-texto-sm mt-1.5 text-gris-8">{f.nota}</p>
                    </details>
                  </li>
                ) : (
                  <li key={f.id} className="t-texto-sm text-blanco">
                    {f.nombre}
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
      <p className="sr-only">Estados posibles: {Object.values(ETIQUETA_ESTADO).join(", ")}.</p>
    </section>
  )
}

// ───────────── 10 · Preguntas ─────────────

const PREGUNTAS = [
  ["¿Sirve para mi negocio, si es chico?", "Sí. Un kiosco usa la caja rápida, el fiado y los precios; no ve lo que no necesita. Cuando el negocio crece, se encienden más módulos sin cambiar de sistema."],
  ["¿Y si tengo muchas sucursales?", "Quvant está pensado para eso: stock por sucursal, transferencias, un tablero que junta todo, permisos por rol y auditoría. En la demo hay un grupo de 40 sucursales para verlo."],
  ["¿Qué pasa si se corta internet?", "El mostrador sigue vendiendo. Las ventas quedan guardadas en el equipo y se sincronizan solas cuando vuelve la conexión. Si mientras tanto otra sucursal vendió el mismo producto, el sistema lo marca para revisar; la venta nunca se pierde."],
  ["¿Puedo traer los datos de mi sistema actual?", "Sí. El importador lee Excel y CSV, te deja asignar las columnas y te muestra los errores antes de importar. La migración asistida desde sistemas específicos está en la hoja de ruta."],
  ["¿Hace factura electrónica?", "Todavía no: en la demo el comprobante es emulado y dice «sin validez fiscal». La conexión con ARCA es una de las primeras etapas de la hoja de ruta, antes de pasar a producción."],
  ["¿Necesito comprar computadoras o un servidor?", "No. Funciona en el navegador de las computadoras y celulares que ya tenés. No hay servidor que mantener en el local."],
  ["¿Mis datos pueden verlos otras empresas?", "No. Cada empresa tiene sus datos separados en la base, y hay pruebas automáticas que verifican que una empresa no pueda leer los datos de otra."],
  ["¿Qué es el programa de socios fundadores?", "Los primeros negocios que empiezan con Quvant, con condiciones especiales a cambio de usarlo en serio y contarnos qué mejorar."],
] as const

export function Preguntas() {
  return (
    <section id="preguntas" className="diferida mx-auto max-w-3xl scroll-mt-24 px-4 py-24" aria-labelledby="titulo-preguntas">
      <Encabezado id="titulo-preguntas" ficha="10 · Preguntas" titulo="Lo que nos preguntan." centrado />
      <div className="divide-y divide-gris-3 rounded-lg border border-gris-3">
        {PREGUNTAS.map(([p, r]) => (
          <details key={p} className="group px-5 py-4">
            <summary className="t-texto flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-blanco [&::-webkit-details-marker]:hidden">
              {p}
              <span className="t-numero text-acero transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="t-texto mt-3 text-acero">{r}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

// ───────────── Pie ─────────────

export function PieSitio() {
  return (
    <footer className="border-t border-gris-3">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-[1.6fr_1fr_1fr]">
        <div className="space-y-4">
          <Firma alto={36} version="principal" bajada />
          <p className="t-texto-sm text-acero">{SITIO.contacto.ciudad}</p>
        </div>
        <nav className="space-y-2.5" aria-label="Producto">
          <p className="t-etiqueta text-acero">Producto</p>
          {[
            ["/demo", "Probar la demo"],
            ["#modulos", "Módulos"],
            ["#planes", "Planes"],
            ["#a-medida", "Desarrollo a medida"],
            ["/estado", "Estado del sistema"],
            ["/ingresar", "Ingresar"],
          ].map(([href, t]) =>
            href.startsWith("/") ? (
              <Link key={href} href={href} prefetch={false} className="t-texto-sm block text-blanco hover:underline">
                {t}
              </Link>
            ) : (
              <a key={href} href={href} className="t-texto-sm block text-blanco hover:underline">
                {t}
              </a>
            ),
          )}
        </nav>
        <div className="space-y-2.5">
          <p className="t-etiqueta text-acero">Contacto</p>
          <p className="t-texto-sm text-blanco">
            <TextoConfig texto={SITIO.contacto.email} />
          </p>
          <p className="t-texto-sm text-blanco">
            <TextoConfig texto={SITIO.contacto.whatsapp} />
          </p>
        </div>
      </div>
      <div className="border-t border-gris-3">
        <p className="t-texto-sm mx-auto max-w-6xl px-4 py-5 text-gris-8">© 2026 Quvant. Las empresas de la demo y de las capturas son ficticias: nombres, marcas, clientes y precios inventados.</p>
      </div>
    </footer>
  )
}
