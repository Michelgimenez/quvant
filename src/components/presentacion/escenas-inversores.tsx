"use client"

import { createContext, useContext } from "react"
import { motion } from "motion/react"
import { Boxes, Clock, FileWarning, Layers, MessageSquareWarning, Network, ServerCrash, ShoppingCart, Tags, Wrench } from "lucide-react"
import type { DemoEmbebida } from "@/cliente/demo-embebida"
import { EstadoFeatureBadge, TextoConfig } from "@/components/base/sellos"
import { Wordmark } from "@/components/marca/marca"
import { YunqueArmado } from "@/components/marca/yunque-armado"
import { DemoConexion } from "@/components/sitio/demo-conexion"
import { ETAPAS } from "@/config/hoja-de-ruta"
import { MERCADO, PILARES, TERRENO } from "@/config/inversores"
import { PRECIOS } from "@/config/precios"
import { proyectar, SUPUESTOS } from "@/config/proyecciones"
import { SITIO } from "@/config/sitio"
import { FEATURES, type EstadoFeature } from "@/showcase/features"
import { cn } from "@/lib/utils"
import { Aparecer, Bajada, Lienzo, Titulo, TrazoAnimado } from "./kit"
import { useEscena, type DefinicionEscena } from "./motor"
import { PeliculaProducto } from "./pelicula-producto"

/** Datos sensibles: llegan del servidor solo después de validar la clave. */
export type DatosInversores = {
  inversion: { montoTexto: string; destino: readonly { id: string; nombre: string; porcentaje: number; detalle: string }[]; nota: string }
  equipo: readonly { nombre: string; rol: string; foto: string | null; bio: string }[]
  contacto: { nombre: string; email: string; telefono: string }
}

const DatosCtx = createContext<{ datos: DatosInversores; demo: DemoEmbebida | null } | null>(null)
export const ProveedorDatosInversores = DatosCtx.Provider
function useDatosInversores() {
  const d = useContext(DatosCtx)
  if (!d) throw new Error("Faltan los datos de la presentación")
  return d
}

// Paleta de partes validada (modo oscuro, pares adyacentes): ver docs/ARQUITECTURA.md
const PARTES = ["#5b83f6", "#d95926", "#199e70", "#c98500"]

function Apertura() {
  const { activa, velocidad, reinicio } = useEscena()
  return (
    <Lienzo sinMarca>
      <div className="flex h-full flex-col items-center justify-center gap-10 pb-16">
        <YunqueArmado key={`${activa}:${reinicio}`} activo={activa} velocidad={velocidad} className="h-[300px] w-auto" />
        <Aparecer demora={1.6} y={20}>
          <Wordmark className="h-[120px] text-niebla" />
        </Aparecer>
        <Aparecer demora={2.2} y={10}>
          <p className="font-mono text-[22px] uppercase tracking-[0.3em] text-acero">Presentación para inversores · 2026</p>
        </Aparecer>
      </div>
    </Lienzo>
  )
}

const ICONOS_DOLOR = [Clock, ServerCrash, FileWarning, MessageSquareWarning, Layers]

function Problema() {
  return (
    <Lienzo numero="02" etiqueta="El problema">
      <Aparecer>
        <Titulo className="max-w-[1640px] text-[76px]">{MERCADO.titular}</Titulo>
      </Aparecer>
      <div className="mt-12 grid grid-cols-3 gap-8">
        {MERCADO.datos.map((d, i) => (
          <Aparecer key={i} demora={0.5 + i * 0.15} className="rounded-3xl border border-white/10 bg-superficie/80 p-7">
            <p className="text-[28px] font-bold text-niebla">
              <TextoConfig texto={d.valor} />
            </p>
            <p className="mt-2 text-[22px] text-acero">{d.etiqueta}</p>
          </Aparecer>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-4">
        {MERCADO.dolores.map((d, i) => {
          const I = ICONOS_DOLOR[i % ICONOS_DOLOR.length]
          return (
            <Aparecer key={d} demora={1.1 + i * 0.12} y={12} className="flex items-center gap-3 rounded-full border border-white/10 bg-hierro px-6 py-2.5 text-[22px] text-niebla">
              <I className="size-6 text-error" /> {d}
            </Aparecer>
          )
        })}
      </div>
    </Lienzo>
  )
}

function Terreno() {
  return (
    <Lienzo numero="03" etiqueta="Lo que vimos en el terreno">
      <Aparecer>
        <p className="font-mono text-[24px] uppercase tracking-[0.2em] text-chispa">Caso real · anonimizado</p>
        <Titulo className="mt-4">{TERRENO.caso}</Titulo>
        <Bajada className="mt-4">{TERRENO.alcance}.</Bajada>
      </Aparecer>
      <ul className="mt-14 grid grid-cols-2 gap-x-10 gap-y-6">
        {TERRENO.hallazgos.map((h, i) => (
          <Aparecer key={h.area} demora={0.5 + i * 0.15} x={-20} y={0} className="flex gap-6 border-l-4 border-temple pl-6">
            <div>
              <p className="text-[22px] uppercase tracking-widest text-acero">{h.area}</p>
              <p className="mt-1 text-[28px] text-niebla">
                <TextoConfig texto={h.hallazgo} />
              </p>
            </div>
          </Aparecer>
        ))}
      </ul>
      <Aparecer demora={1.5} className="mt-12 text-[30px] text-niebla">
        <TextoConfig texto={TERRENO.conclusion} />
      </Aparecer>
    </Lienzo>
  )
}

const ICONO_PILAR = { stock: Boxes, ventas: ShoppingCart, precios: Tags, servicio: Wrench, multinegocio: Network }

function Solucion() {
  return (
    <Lienzo numero="04" etiqueta="La solución">
      <Aparecer>
        <Titulo className="max-w-[1550px] text-[76px]">Yunque: el sistema de gestión en la nube para negocios con stock complejo, que sigue vendiendo aunque se corte internet.</Titulo>
      </Aparecer>
      <div className="mt-14 grid grid-cols-5 gap-6">
        {PILARES.map((p, i) => {
          const I = ICONO_PILAR[p.id]
          const disponibles = FEATURES.filter((f) => f.escena === p.id && f.estado === "disponible").length
          return (
            <Aparecer key={p.id} demora={0.6 + i * 0.14} y={36} className="flex flex-col rounded-3xl border border-white/10 bg-superficie/80 p-8">
              <I className="size-14 shrink-0 text-temple" />
              <p className="mt-7 text-[34px] font-bold leading-tight text-niebla">{p.nombre}</p>
              <p className="mt-3 flex-1 text-[22px] leading-snug text-acero">{p.frase}</p>
              <p className="mt-6 font-mono text-[18px] text-ok">
                {disponibles} {disponibles === 1 ? "función disponible" : "funciones disponibles"}
              </p>
            </Aparecer>
          )
        })}
      </div>
    </Lienzo>
  )
}

function DemoProducto() {
  const { demo } = useDatosInversores()
  return (
    <Lienzo numero="05" etiqueta="Demo del producto · empresa demo">
      {demo && <PeliculaProducto demo={demo} />}
    </Lienzo>
  )
}

function Diferencial() {
  const { activa, velocidad, reinicio } = useEscena()
  return (
    <Lienzo numero="06" etiqueta="El diferencial">
      <div className="grid h-full grid-cols-[500px_1fr] items-center gap-16">
        <div>
          <Aparecer>
            <Titulo className="text-[76px]">Se corta internet. Se sigue vendiendo.</Titulo>
          </Aparecer>
          <Aparecer demora={0.4}>
            <Bajada className="mt-8 text-[28px]">Cada mostrador tiene su base local y su cola. Cuando vuelve la conexión, todo se sincroniza solo, con reglas claras para los conflictos.</Bajada>
          </Aparecer>
          <Aparecer demora={0.7}>
            <p className="mt-10 font-mono text-[20px] uppercase tracking-widest text-chispa">En vivo · mismo motor que la app</p>
          </Aparecer>
        </div>
        <Aparecer demora={0.3} escala={0.97}>
          {/* zoom (estático) agranda la demo sin romper su grilla interna */}
          <div style={{ zoom: 1.2 }}>
            <DemoConexion guion={{ activo: activa, velocidad, reinicio }} />
          </div>
        </Aparecer>
      </div>
    </Lienzo>
  )
}

function Modelo() {
  const { activa, velocidad, reducir } = useEscena()
  const tri = proyectar(SUPUESTOS)
  const mayor = Math.max(...tri.map((t) => t.mrrUSD), 1)
  // Escala con marcas redondas (1, 2, 2,5 o 5 × 10^n) para que el eje se lea fácil
  const base = 10 ** Math.floor(Math.log10(mayor / 4))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * base).find((v) => v * 4 >= mayor) ?? base * 10
  const max = paso * 4
  return (
    <Lienzo numero="07" etiqueta="Modelo de negocio">
      <div className="grid h-full grid-cols-[620px_1fr] gap-20">
        <div className="space-y-6">
          <Aparecer>
            <Titulo className="text-[64px]">Licencia mensual por negocio + implementación.</Titulo>
          </Aparecer>
          <Aparecer demora={0.4} className="rounded-3xl border border-white/10 bg-superficie/80 p-7">
            <p className="text-[20px] uppercase tracking-widest text-acero">Ingreso recurrente</p>
            <p className="mt-2 text-[30px] text-niebla">
              negocios activos × <span className="font-bold">USD {PRECIOS.desdePorNegocio}</span> por mes
            </p>
          </Aparecer>
          <Aparecer demora={0.55} className="rounded-3xl border border-white/10 bg-superficie/80 p-7">
            <p className="text-[20px] uppercase tracking-widest text-acero">Ingreso por implementación</p>
            <p className="mt-2 text-[30px] text-niebla">negocios nuevos × implementación (se cotiza por negocio)</p>
          </Aparecer>
          <Aparecer demora={0.7}>
            <p className="text-[22px] leading-snug text-acero">Cada cliente nuevo suma la licencia todos los meses. La implementación cubre migración, configuración y capacitación.</p>
          </Aparecer>
        </div>
        <div className="flex flex-col">
          <Aparecer demora={0.3}>
            <p className="font-mono text-[20px] uppercase tracking-widest text-chispa">{SUPUESTOS.etiqueta}</p>
            <p className="mt-2 text-[22px] text-acero">Ingreso mensual recurrente al final de cada trimestre (USD) si se cumplieran estos supuestos. No es un pronóstico.</p>
          </Aparecer>
          <svg viewBox="0 0 1000 460" className="mt-6 min-h-0 w-full flex-1" role="img" aria-label="Proyección ilustrativa del ingreso mensual por trimestre">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1="70" x2="1000" y1={400 - f * 360} y2={400 - f * 360} stroke="rgb(238 241 244 / 0.08)" />
                <text x="60" y={404 - f * 360} textAnchor="end" className="fill-acero font-mono text-[18px]">
                  {((max * f) / 1000).toLocaleString("es-AR")}k
                </text>
              </g>
            ))}
            {tri.map((t, i) => {
              const ancho = 64
              const x = 110 + i * (880 / tri.length)
              const h = (t.mrrUSD / max) * 360
              return (
                <g key={t.trimestre}>
                  <motion.rect
                    x={x}
                    y={400 - h}
                    width={ancho}
                    height={h}
                    rx="6"
                    fill="#5b83f6"
                    style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: activa ? 1 : 0 }}
                    transition={{ duration: reducir ? 0 : 0.7 / velocidad, delay: activa && !reducir ? (0.5 + i * 0.08) / velocidad : 0 }}
                  />
                  <text x={x + ancho / 2} y="432" textAnchor="middle" className="fill-acero font-mono text-[18px]">
                    T{t.trimestre}
                  </text>
                  {i === tri.length - 1 && (
                    <text x={x + ancho / 2} y={390 - h} textAnchor="middle" className="fill-niebla font-mono text-[20px]">
                      {t.mrrUSD.toLocaleString("es-AR")}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          <Aparecer demora={1.2} className="mt-4 grid grid-cols-3 gap-4 text-[18px] text-acero">
            <p>Licencia: USD {SUPUESTOS.licenciaMensualUSD}/mes</p>
            <p>Bajas: {(SUPUESTOS.churnMensual * 100).toLocaleString("es-AR")} % mensual</p>
            <p>Negocios nuevos por trimestre: {SUPUESTOS.negociosNuevosPorTrimestre.join(", ")}</p>
          </Aparecer>
        </div>
      </div>
    </Lienzo>
  )
}

function EstadoActual() {
  const columnas: EstadoFeature[] = ["disponible", "demo", "próximamente"]
  return (
    <Lienzo numero="08" etiqueta="Estado actual · con honestidad">
      <div className="flex items-end justify-between">
        <Aparecer>
          <Titulo className="text-[72px]">Demo funcional. Primer piloto en negociación.</Titulo>
        </Aparecer>
      </div>
      <Aparecer demora={0.3}>
        <Bajada className="mt-3 text-[28px]">Todavía no hay clientes pagando. Esto es lo que funciona hoy, lo que se ve con partes emuladas y lo que viene.</Bajada>
      </Aparecer>
      <div className="mt-10 grid grid-cols-3 gap-8">
        {columnas.map((c, i) => {
          const lista = FEATURES.filter((f) => f.estado === c)
          return (
            <Aparecer key={c} demora={0.5 + i * 0.2} className="rounded-3xl border border-white/10 bg-superficie/80 p-7">
              <div className="flex items-center justify-between">
                <EstadoFeatureBadge estado={c} className="h-9 border-white/10 bg-hierro px-4 text-[16px]" />
                <span className="font-mono text-[40px] font-bold text-niebla">{lista.length}</span>
              </div>
              <ul className="mt-5 space-y-2">
                {lista.slice(0, 8).map((f) => (
                  <li key={f.id} className="text-[21px] leading-snug text-niebla">
                    {f.nombre}
                  </li>
                ))}
                {lista.length > 8 && <li className="text-[19px] text-acero">y {lista.length - 8} más</li>}
              </ul>
            </Aparecer>
          )
        })}
      </div>
    </Lienzo>
  )
}

function HojaDeRuta() {
  const { activa, velocidad, reducir } = useEscena()
  return (
    <Lienzo numero="09" etiqueta="Hoja de ruta · de demo a producción">
      <Aparecer>
        <Titulo className="text-[80px]">Cinco etapas para llegar a producción.</Titulo>
      </Aparecer>
      <div className="relative mt-24">
        <svg viewBox="0 0 1640 40" className="absolute inset-x-0 top-[2px] w-full" aria-hidden>
          <TrazoAnimado d="M20 20 H1620" stroke="#3b6ef5" strokeWidth="4" strokeLinecap="round" fill="none" demora={0.4} duracion={1.6} />
        </svg>
        <ol className="relative grid grid-cols-5 gap-6">
          {ETAPAS.map((et, i) => (
            <li key={et.id}>
              <motion.span
                className={cn("block size-[44px] rounded-full border-4", i === 0 ? "border-chispa bg-chispa/30" : "border-temple bg-hierro")}
                initial={{ scale: 0 }}
                animate={{ scale: activa ? 1 : 0 }}
                transition={{ duration: reducir ? 0 : 0.4 / velocidad, delay: activa && !reducir ? (0.6 + i * 0.3) / velocidad : 0 }}
              />
              <Aparecer demora={0.8 + i * 0.3} y={16} className="mt-8 pr-4">
                <p className="font-mono text-[18px] uppercase tracking-widest text-acero">Etapa {i + 1}{i === 0 && " · siguiente"}</p>
                <p className="mt-2 text-[32px] font-bold leading-tight text-niebla">{et.nombre}</p>
                <p className="mt-3 text-[20px] leading-snug text-acero">{et.detalle}</p>
              </Aparecer>
            </li>
          ))}
        </ol>
      </div>
    </Lienzo>
  )
}

/** Arco de dona entre dos fracciones (0 = arriba, sentido horario), con 2px de separación. */
function arco(desde: number, hasta: number, r = 210, centro = 260) {
  const separacion = 2 / r // radianes, unos 2px sobre el arco
  const a0 = desde * 2 * Math.PI - Math.PI / 2 + separacion
  const a1 = hasta * 2 * Math.PI - Math.PI / 2 - separacion
  const punto = (a: number) => `${(centro + r * Math.cos(a)).toFixed(2)} ${(centro + r * Math.sin(a)).toFixed(2)}`
  return `M ${punto(a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${punto(a1)}`
}

function Inversion() {
  const { datos } = useDatosInversores()
  const { activa, velocidad, reducir } = useEscena()
  const fracciones = datos.inversion.destino.map((d) => d.porcentaje / 100)
  const inicios = fracciones.map((_, i) => fracciones.slice(0, i).reduce((a, b) => a + b, 0))
  return (
    <Lienzo numero="10" etiqueta="Para qué es la inversión">
      <div className="grid h-full grid-cols-[1fr_640px] items-center gap-16">
        <div>
          <Aparecer>
            <p className="text-[30px] text-acero">Buscamos</p>
            <p className="mt-2 text-[96px] font-extrabold leading-none tracking-tight text-niebla">
              <TextoConfig texto={datos.inversion.montoTexto} />
            </p>
          </Aparecer>
          <ul className="mt-14 space-y-6">
            {datos.inversion.destino.map((d, i) => (
              <Aparecer key={d.id} demora={0.6 + i * 0.15} x={-16} y={0} className="flex items-start gap-5">
                <span className="mt-2 size-6 shrink-0 rounded-md" style={{ background: PARTES[i % PARTES.length] }} aria-hidden />
                <div>
                  <p className="text-[32px] font-bold text-niebla">
                    {d.nombre} <span className="font-mono text-acero">· {d.porcentaje} %</span>
                  </p>
                  <p className="text-[22px] text-acero">{d.detalle}</p>
                </div>
              </Aparecer>
            ))}
          </ul>
          <Aparecer demora={1.4} className="mt-10 text-[20px] text-acero">
            <TextoConfig texto={datos.inversion.nota} />
          </Aparecer>
        </div>
        <svg viewBox="0 0 520 520" className="w-full" role="img" aria-label="Destino de la inversión por porcentaje">
          {datos.inversion.destino.map((d, i) => (
            <motion.path
              key={d.id}
              d={arco(inicios[i], inicios[i] + fracciones[i])}
              fill="none"
              stroke={PARTES[i % PARTES.length]}
              strokeWidth="64"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={activa ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: reducir ? 0 : 0.6 / velocidad, delay: activa && !reducir ? (0.5 + i * 0.3) / velocidad : 0, ease: "easeOut" }}
            />
          ))}
          <text x="260" y="250" textAnchor="middle" className="fill-niebla text-[44px] font-bold">
            100 %
          </text>
          <text x="260" y="292" textAnchor="middle" className="fill-acero font-mono text-[20px]">
            preliminar
          </text>
        </svg>
      </div>
    </Lienzo>
  )
}

function Equipo() {
  const { datos } = useDatosInversores()
  return (
    <Lienzo numero="11" etiqueta="Equipo">
      <Aparecer>
        <Titulo className="text-[80px]">Quiénes lo construyen.</Titulo>
      </Aparecer>
      <div className="mt-16 grid grid-cols-2 gap-10">
        {datos.equipo.map((p, i) => (
          <Aparecer key={i} demora={0.4 + i * 0.2} className="flex gap-8 rounded-3xl border border-white/10 bg-superficie/80 p-10">
            {p.foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto cargada en la configuración
              <img src={p.foto} alt={p.nombre} className="size-40 rounded-2xl object-cover" />
            ) : (
              <div className="flex size-40 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-chispa/60 text-center font-mono text-[16px] text-chispa">
                [COMPLETAR
                <br />
                foto]
              </div>
            )}
            <div className="space-y-3">
              <p className="text-[40px] font-bold text-niebla">
                <TextoConfig texto={p.nombre} />
              </p>
              <p className="text-[26px] text-acero">
                <TextoConfig texto={p.rol} />
              </p>
              <p className="text-[22px] text-acero">
                <TextoConfig texto={p.bio} />
              </p>
            </div>
          </Aparecer>
        ))}
      </div>
    </Lienzo>
  )
}

function Cierre() {
  const { datos } = useDatosInversores()
  const { activa, velocidad, reinicio } = useEscena()
  return (
    <Lienzo sinMarca>
      <div className="flex h-full flex-col items-center justify-center gap-10 pb-16 text-center">
        <YunqueArmado key={`${activa}:${reinicio}`} activo={activa} velocidad={velocidad} className="h-[240px] w-auto" />
        <Aparecer demora={1.5}>
          <p className="text-[96px] font-extrabold tracking-[-0.035em] text-niebla">{SITIO.tagline}</p>
        </Aparecer>
        <Aparecer demora={2.0} className="space-y-2 text-[28px] text-acero">
          <p>
            <TextoConfig texto={datos.contacto.nombre} />
          </p>
          <p>
            <TextoConfig texto={datos.contacto.email} /> · <TextoConfig texto={datos.contacto.telefono} />
          </p>
        </Aparecer>
      </div>
    </Lienzo>
  )
}

export const ESCENAS_INVERSORES: DefinicionEscena[] = [
  { id: "apertura", titulo: "Apertura", largo: 100, duracion: 6, Componente: Apertura },
  { id: "problema", titulo: "El problema", largo: 120, duracion: 11, Componente: Problema },
  { id: "terreno", titulo: "Lo que vimos en el terreno", largo: 120, duracion: 11, Componente: Terreno },
  { id: "solucion", titulo: "La solución", largo: 120, duracion: 11, Componente: Solucion },
  { id: "demo", titulo: "Demo del producto", largo: 150, duracion: 24, Componente: DemoProducto },
  { id: "diferencial", titulo: "El diferencial", largo: 140, duracion: 15, Componente: Diferencial },
  { id: "modelo", titulo: "Modelo de negocio", largo: 120, duracion: 13, Componente: Modelo },
  { id: "estado", titulo: "Estado actual", largo: 120, duracion: 12, Componente: EstadoActual },
  { id: "hoja-de-ruta", titulo: "Hoja de ruta", largo: 120, duracion: 12, Componente: HojaDeRuta },
  { id: "inversion", titulo: "Para qué es la inversión", largo: 120, duracion: 12, Componente: Inversion },
  { id: "equipo", titulo: "Equipo", largo: 110, duracion: 9, Componente: Equipo },
  { id: "cierre", titulo: "Cierre", largo: 100, duracion: 10, Componente: Cierre },
]
