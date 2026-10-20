"use client"

import { createContext, useContext } from "react"
import { EstadoFeatureBadge, Sello, TextoConfig } from "@/components/base/sellos"
import { BAJADA, Logotipo } from "@/components/marca/quvant"
import { IsotipoAnimado } from "@/components/marca/isotipo-animado"
import { DemoConexion } from "@/components/sitio/demo-conexion"
import { Escala } from "@/components/sitio/escala"
import { EscalaQuieta } from "@/components/sitio/escala-quieta"
import { VideoForja } from "@/components/sitio/video-forja"
import { ETAPAS } from "@/config/hoja-de-ruta"
import { ESTADO, MERCADO, TERRENO } from "@/config/inversores"
import { PRECIOS, textoPrecioExtension, textoPrecioPlan } from "@/config/precios"
import { licenciaPromedioUSD, proyectar, SUPUESTOS } from "@/config/proyecciones"
import { SITIO } from "@/config/sitio"
import { EMPRESAS, EMPRESAS_ORDEN, MODULOS_DEMO } from "@/demo/empresas"
import { FEATURES, type EstadoFeature } from "@/showcase/features"
import { Aparecer, Bajada, Lienzo, Titulo, TrazoAnimado, useEntrada } from "./kit"
import { useEscena, type DefinicionEscena } from "./motor"

/** Datos sensibles: llegan del servidor solo después de validar la clave. */
export type DatosInversores = {
  inversion: { montoTexto: string; destino: readonly { id: string; nombre: string; porcentaje: number; detalle: string }[]; nota: string }
  equipo: readonly { nombre: string; rol: string; foto: string | null; bio: string }[]
  contacto: { nombre: string; email: string; telefono: string }
}

const DatosCtx = createContext<{ datos: DatosInversores } | null>(null)
export const ProveedorDatosInversores = DatosCtx.Provider
function useDatosInversores() {
  const d = useContext(DatosCtx)
  if (!d) throw new Error("Faltan los datos de la presentación")
  return d
}

/** Las partes de un gráfico, en la escala de grises de la marca (sin colores ajenos al manual). */
const PARTES = ["var(--blanco)", "var(--gris-9)", "var(--gris-6)", "var(--gris-4)"]

const etiqueta = "font-sans text-[20px] font-medium uppercase tracking-[0.2em] text-acero"

function Apertura() {
  const { activa, velocidad, reinicio } = useEscena()
  return (
    <Lienzo sinMarca>
      <div className="flex h-full flex-col items-center justify-center gap-10 pb-16">
        {activa && <IsotipoAnimado key={`${activa}:${reinicio}`} lado={300} duracion={1.6 / velocidad} />}
        <Aparecer demora={1.6} y={20}>
          <Logotipo version="principal" className="h-[64px]" />
        </Aparecer>
        <Aparecer demora={2.1} y={10}>
          <p className="font-sans text-[30px] text-acero">{BAJADA}</p>
        </Aparecer>
        <Aparecer demora={2.6} y={10}>
          <p className={etiqueta}>Presentación para inversores · 2026</p>
        </Aparecer>
      </div>
    </Lienzo>
  )
}

function Problema() {
  return (
    <Lienzo numero="02" etiqueta="El problema">
      <Aparecer>
        <Titulo className="max-w-[1500px] text-[72px]">{MERCADO.titular}</Titulo>
      </Aparecer>
      <div className="mt-14 grid grid-cols-4 gap-px overflow-hidden rounded-[6px] border border-gris-3 bg-gris-3">
        {MERCADO.tamanos.map((t, i) => (
          <Aparecer key={t.id} demora={0.5 + i * 0.15} className="flex flex-col gap-6 bg-negro p-8">
            <p className="font-sans text-[22px] font-medium uppercase tracking-[0.18em] text-blanco">{t.nombre}</p>
            <p className="font-sans text-[22px] leading-snug text-blanco">
              <TextoConfig texto={t.dato} />
            </p>
            <ul className="mt-auto space-y-3">
              {t.dolores.map((d) => (
                <li key={d} className="flex items-start gap-3 font-sans text-[22px] leading-snug text-acero">
                  <span className="mt-[12px] size-[8px] shrink-0 bg-acero" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          </Aparecer>
        ))}
      </div>
    </Lienzo>
  )
}

function Terreno() {
  return (
    <Lienzo numero="03" etiqueta="Lo que vimos en el terreno">
      <Aparecer>
        <p className="font-sans text-[22px] font-medium uppercase tracking-[0.2em] text-alerta">Caso real · anonimizado</p>
        <Titulo className="mt-4">{TERRENO.caso}</Titulo>
        <Bajada className="mt-4">{TERRENO.alcance}.</Bajada>
      </Aparecer>
      <ul className="mt-14 grid grid-cols-2 gap-x-10 gap-y-6">
        {TERRENO.hallazgos.map((h, i) => (
          <Aparecer key={h.area} demora={0.5 + i * 0.15} x={-20} y={0} className="flex gap-6 border-l-2 border-blanco pl-6">
            <div>
              <p className="font-sans text-[20px] font-medium uppercase tracking-[0.18em] text-acero">{h.area}</p>
              <p className="mt-1 font-sans text-[28px] text-blanco">
                <TextoConfig texto={h.hallazgo} />
              </p>
            </div>
          </Aparecer>
        ))}
      </ul>
      <Aparecer demora={1.5} className="mt-12 font-sans text-[30px] text-blanco">
        <TextoConfig texto={TERRENO.conclusion} />
      </Aparecer>
    </Lienzo>
  )
}

const TAMANO_DE = { kiosco: "Kiosco", ferreteria: "Comercio", distribuidora: "Distribuidora", grupo: "Empresa" } as const

function Solucion() {
  const disponibles = FEATURES.filter((f) => f.estado === "disponible").length
  const enDemo = FEATURES.filter((f) => f.estado === "demo").length
  return (
    <Lienzo numero="04" etiqueta="La solución">
      <Aparecer>
        <Titulo className="max-w-[1500px] text-[76px]">Quvant: un solo sistema, del kiosco a la empresa. Cada negocio enciende lo que necesita.</Titulo>
      </Aparecer>
      <div className="mt-14 grid grid-cols-4 gap-px overflow-hidden rounded-[6px] border border-gris-3 bg-gris-3">
        {EMPRESAS_ORDEN.map((id, i) => {
          const e = EMPRESAS[id]
          const encendidos = MODULOS_DEMO.filter((m) => e.modulos[m]).length
          return (
            <Aparecer key={id} demora={0.5 + i * 0.14} y={30} className="flex flex-col gap-4 bg-negro p-8">
              <p className="font-sans text-[22px] font-medium uppercase tracking-[0.18em] text-acero">{TAMANO_DE[id]}</p>
              <p className="font-sans text-[34px] font-bold leading-tight text-blanco">{e.escalaTexto}</p>
              <p className="font-sans text-[22px] leading-snug text-acero">{e.rubro}</p>
              <p className="mt-auto font-sans text-[22px] text-blanco">{encendidos} módulos encendidos</p>
            </Aparecer>
          )
        })}
      </div>
      <Aparecer demora={1.3} className="mt-8 flex items-center gap-6 font-sans text-[22px] text-acero">
        <EstadoFeatureBadge estado="disponible" className="h-9 px-3 text-[15px]" /> {disponibles} funciones disponibles en la app
        <EstadoFeatureBadge estado="demo" className="ml-6 h-9 px-3 text-[15px]" /> {enDemo} se ven en la demo, con partes sin terminar
      </Aparecer>
    </Lienzo>
  )
}

/** La escena estrella: la demo que cambia de empresa, en vivo (la misma escala del sitio, más grande). */
function CambioDeEmpresa() {
  const { activa } = useEscena()
  return (
    <Lienzo numero="05" etiqueta="La demo · en vivo">
      <div className="grid h-full grid-cols-[440px_1fr] gap-14">
        <div className="flex flex-col">
          <Aparecer>
            <Titulo className="text-[64px]">El mismo Quvant, en cuatro negocios.</Titulo>
          </Aparecer>
          <Aparecer demora={0.4}>
            <Bajada className="mt-8 text-[26px]">Cada paso es un salto del punto: cambian el logo, los módulos, los números y la densidad del tablero. No es una recarga: es la misma app transformándose.</Bajada>
          </Aparecer>
          <Aparecer demora={0.7} className="mt-auto space-y-4">
            <Sello titulo="Empresas ficticias con datos simulados" className="h-9 px-3 text-[16px]" />
            <p className="font-sans text-[22px] text-acero">Empresas ficticias, datos simulados. Probala en {SITIO.url.replace(/^https?:\/\//, "")}/demo</p>
          </Aparecer>
        </div>
        <Aparecer demora={0.2} escala={0.98}>
          <Escala quieta={<EscalaQuieta />} variante="escenario" pausada={!activa} />
        </Aparecer>
      </div>
    </Lienzo>
  )
}

/** Hasta la tanda 10 (video nuevo de Forja), la escena queda oculta. */
const MOSTRAR_FORJA = false

/** Forja: la extensión visual, con la toma genérica (empresa de demostración, sin ningún prospecto). */
function ForjaEnVivo() {
  const { activa, reinicio } = useEscena()
  const forja = FEATURES.find((f) => f.id === "forja")
  return (
    <Lienzo numero="06" etiqueta="Forja · empresa demo">
      <div className="grid h-full grid-cols-[520px_1fr] items-center gap-14">
        <div>
          <Aparecer>
            <Titulo className="text-[76px]">Forja: el negocio, en vivo.</Titulo>
          </Aparecer>
          <Aparecer demora={0.4}>
            <Bajada className="mt-8 text-[28px]">Toda la red de sucursales en un mapa, cada sucursal por dentro y el día entero en 30 segundos. Lo que un sistema viejo no puede mostrar.</Bajada>
          </Aparecer>
          <Aparecer demora={0.7}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {forja && <EstadoFeatureBadge estado={forja.estado} />}
              <p className={etiqueta}>Extensión · {textoPrecioExtension("forja")}</p>
            </div>
          </Aparecer>
        </div>
        <Aparecer demora={0.2} escala={0.97}>
          <VideoForja activo={activa} reinicio={reinicio} etiqueta="Recorrido de Forja con la empresa de demostración" className="rounded-[6px]" />
          <p className="mt-3 font-sans text-[16px] text-acero">Empresa de demostración · datos simulados</p>
        </Aparecer>
      </div>
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
            <p className="mt-10 font-sans text-[20px] font-medium uppercase tracking-[0.2em] text-alerta">En vivo · mismo motor que la app</p>
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

/** Una barra del gráfico que crece desde abajo (GSAP). */
function Barra({ x, ancho, alto, demora }: { x: number; ancho: number; alto: number; demora: number }) {
  const { activa } = useEscena()
  const ref = useEntrada<SVGRectElement>({ scaleY: 0 }, { activo: activa, demora, duracion: 0.7 })
  return <rect ref={ref} x={x} y={400 - alto} width={ancho} height={alto} className="fill-blanco" style={{ transformBox: "fill-box", transformOrigin: "bottom", transform: "scaleY(0)" }} />
}

function Modelo() {
  const licencia = licenciaPromedioUSD()
  const tri = licencia === null ? [] : proyectar({ ...SUPUESTOS, licenciaMensualUSD: licencia })
  const mayor = Math.max(...tri.map((t) => t.mrrUSD), 1)
  // Escala con marcas redondas (1, 2, 2,5 o 5 × 10^n) para que el eje se lea fácil
  const base = 10 ** Math.floor(Math.log10(mayor / 4))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * base).find((v) => v * 4 >= mayor) ?? base * 10
  const max = paso * 4
  return (
    <Lienzo numero="07" etiqueta="Modelo de negocio">
      <div className="grid h-full grid-cols-[640px_1fr] gap-20">
        <div className="space-y-6">
          <Aparecer>
            <Titulo className="text-[60px]">Una licencia por plan, más la implementación.</Titulo>
          </Aparecer>
          <Aparecer demora={0.4} className="rounded-[6px] border border-gris-3 p-7">
            <p className={etiqueta}>Ingreso recurrente</p>
            <p className="mt-2 font-sans text-[28px] text-blanco">
              Σ por plan: negocios activos × <span className="font-bold">licencia del plan</span>
            </p>
          </Aparecer>
          <Aparecer demora={0.55} className="rounded-[6px] border border-gris-3 p-7">
            <p className={etiqueta}>Ingreso por implementación</p>
            <p className="mt-2 font-sans text-[28px] text-blanco">negocios nuevos × implementación (se cotiza por negocio)</p>
          </Aparecer>
        </div>
        <div className="flex min-h-0 flex-col">
          <Aparecer demora={0.3}>
            <p className={etiqueta}>Los planes</p>
          </Aparecer>
          <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-[6px] border border-gris-3 bg-gris-3">
            {PRECIOS.planes.map((p, i) => {
              const { precio, unidad } = textoPrecioPlan(p)
              return (
                <Aparecer key={p.id} demora={0.45 + i * 0.1} className="bg-negro p-6">
                  <p className="font-sans text-[26px] font-bold text-blanco">{p.nombre}</p>
                  <p className="mt-3 font-sans text-[30px] font-bold text-blanco">{precio}</p>
                  {unidad && <p className="font-sans text-[18px] text-acero">{unidad}</p>}
                </Aparecer>
              )
            })}
          </div>
          {licencia === null ? (
            <Aparecer demora={0.9} className="mt-8 flex flex-1 flex-col justify-center rounded-[6px] border border-dashed border-alerta/70 p-10">
              <p className="font-sans text-[20px] font-medium uppercase tracking-[0.2em] text-alerta">Sin números todavía</p>
              <p className="mt-4 font-sans text-[30px] leading-snug text-blanco">Los precios están por definirse, así que acá va solo la fórmula. El escenario numérico aparece cuando los precios estén cargados.</p>
              <p className="mt-4 font-sans text-[20px] text-acero">
                <TextoConfig texto="[COMPLETAR: precios de los planes en src/config/precios.ts]" />
              </p>
            </Aparecer>
          ) : (
            <>
              <Aparecer demora={0.8} className="mt-8">
                <p className="font-sans text-[20px] font-medium uppercase tracking-[0.2em] text-alerta">{SUPUESTOS.etiqueta}</p>
                <p className="mt-2 font-sans text-[20px] text-acero">Ingreso mensual recurrente al final de cada trimestre (USD) si se cumplieran estos supuestos. No es un pronóstico.</p>
              </Aparecer>
              <svg viewBox="0 0 1000 460" className="mt-4 min-h-0 w-full flex-1" role="img" aria-label="Proyección ilustrativa del ingreso mensual por trimestre">
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <g key={f}>
                    <line x1="70" x2="1000" y1={400 - f * 360} y2={400 - f * 360} className="stroke-gris-3" />
                    <text x="60" y={404 - f * 360} textAnchor="end" className="fill-acero font-sans text-[18px]">
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
                      <Barra x={x} ancho={ancho} alto={h} demora={1 + i * 0.08} />
                      <text x={x + ancho / 2} y="432" textAnchor="middle" className="fill-acero font-sans text-[18px]">
                        T{t.trimestre}
                      </text>
                    </g>
                  )
                })}
              </svg>
              <p className="mt-2 font-sans text-[18px] text-acero">
                Licencia promedio: USD {licencia} · Bajas: {(SUPUESTOS.churnMensual * 100).toLocaleString("es-AR")} % mensual · Negocios nuevos por trimestre: {SUPUESTOS.negociosNuevosPorTrimestre.join(", ")}
              </p>
            </>
          )}
        </div>
      </div>
    </Lienzo>
  )
}

function EstadoActual() {
  const columnas: EstadoFeature[] = ["disponible", "demo", "próximamente"]
  return (
    <Lienzo numero="08" etiqueta="Estado actual · con honestidad">
      <Aparecer>
        <Titulo className="text-[72px]">{ESTADO.titular}</Titulo>
      </Aparecer>
      <Aparecer demora={0.3}>
        <Bajada className="mt-3 text-[28px]">{ESTADO.bajada}</Bajada>
        <p className="mt-4 font-sans text-[24px] text-blanco">
          El piloto: <TextoConfig texto={ESTADO.piloto} />
        </p>
      </Aparecer>
      <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-[6px] border border-gris-3 bg-gris-3">
        {columnas.map((c, i) => {
          const lista = FEATURES.filter((f) => f.estado === c)
          return (
            <Aparecer key={c} demora={0.5 + i * 0.2} className="bg-negro p-7">
              <div className="flex items-center justify-between">
                <EstadoFeatureBadge estado={c} className="h-9 px-4 text-[16px]" />
                <span className="font-sans text-[40px] font-bold text-blanco">{lista.length}</span>
              </div>
              <ul className="mt-5 space-y-2">
                {lista.slice(0, 7).map((f) => (
                  <li key={f.id} className="font-sans text-[21px] leading-snug text-blanco">
                    {f.nombre}
                  </li>
                ))}
                {lista.length > 7 && <li className="font-sans text-[19px] text-acero">y {lista.length - 7} más</li>}
              </ul>
            </Aparecer>
          )
        })}
      </div>
    </Lienzo>
  )
}

/** El cuadrado de una etapa, que aparece en su turno (GSAP). */
function MarcaEtapa({ primera, demora }: { primera: boolean; demora: number }) {
  const { activa } = useEscena()
  const ref = useEntrada<HTMLSpanElement>({ scale: 0 }, { activo: activa, demora, duracion: 0.4 })
  return <span ref={ref} className={primera ? "block size-[36px] bg-blanco" : "block size-[36px] border-2 border-blanco bg-negro"} style={{ transform: "scale(0)" }} />
}

function HojaDeRuta() {
  return (
    <Lienzo numero="09" etiqueta="Hoja de ruta · de demo a producción">
      <Aparecer>
        <Titulo className="text-[80px]">Cinco etapas para llegar a producción.</Titulo>
      </Aparecer>
      <div className="relative mt-24">
        <svg viewBox="0 0 1640 40" className="absolute inset-x-0 top-[-2px] w-full" aria-hidden>
          <TrazoAnimado d="M18 20 H1620" stroke="var(--gris-6)" strokeWidth="2" fill="none" demora={0.4} duracion={1.6} />
        </svg>
        <ol className="relative grid grid-cols-5 gap-6">
          {ETAPAS.map((et, i) => (
            <li key={et.id}>
              <MarcaEtapa primera={i === 0} demora={0.6 + i * 0.3} />
              <Aparecer demora={0.8 + i * 0.3} y={16} className="mt-8 pr-4">
                <p className="font-sans text-[18px] font-medium uppercase tracking-[0.2em] text-acero">
                  Etapa {i + 1}
                  {i === 0 && " · siguiente"}
                </p>
                <p className="mt-2 font-sans text-[32px] font-bold leading-tight text-blanco">{et.nombre}</p>
                <p className="mt-3 font-sans text-[20px] leading-snug text-acero">{et.detalle}</p>
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
  const fracciones = datos.inversion.destino.map((d) => d.porcentaje / 100)
  const inicios = fracciones.map((_, i) => fracciones.slice(0, i).reduce((a, b) => a + b, 0))
  return (
    <Lienzo numero="10" etiqueta="Para qué es la inversión">
      <div className="grid h-full grid-cols-[1fr_640px] items-center gap-16">
        <div>
          <Aparecer>
            <p className="font-sans text-[30px] text-acero">Buscamos</p>
            <p className="mt-2 font-sans text-[92px] font-bold leading-none tracking-tight text-blanco">
              <TextoConfig texto={datos.inversion.montoTexto} />
            </p>
          </Aparecer>
          <ul className="mt-14 space-y-6">
            {datos.inversion.destino.map((d, i) => (
              <Aparecer key={d.id} demora={0.6 + i * 0.15} x={-16} y={0} className="flex items-start gap-5">
                <span className="mt-2 size-6 shrink-0" style={{ background: PARTES[i % PARTES.length] }} aria-hidden />
                <div>
                  <p className="font-sans text-[32px] font-bold text-blanco">
                    {d.nombre} <span className="text-acero">· {d.porcentaje} %</span>
                  </p>
                  <p className="font-sans text-[22px] text-acero">{d.detalle}</p>
                </div>
              </Aparecer>
            ))}
          </ul>
          <Aparecer demora={1.4} className="mt-10 font-sans text-[20px] text-acero">
            <TextoConfig texto={datos.inversion.nota} />
          </Aparecer>
        </div>
        <svg viewBox="0 0 520 520" className="w-full" role="img" aria-label="Destino de la inversión por porcentaje">
          {datos.inversion.destino.map((d, i) => (
            <TrazoAnimado key={d.id} d={arco(inicios[i], inicios[i] + fracciones[i])} fill="none" stroke={PARTES[i % PARTES.length]} strokeWidth="64" demora={0.5 + i * 0.3} duracion={0.6} />
          ))}
          <text x="260" y="250" textAnchor="middle" className="fill-blanco font-sans text-[44px] font-bold">
            100 %
          </text>
          <text x="260" y="292" textAnchor="middle" className="fill-acero font-sans text-[20px]">
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
      <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-gris-3 bg-gris-3">
        {datos.equipo.map((p, i) => (
          <Aparecer key={i} demora={0.4 + i * 0.2} className="flex gap-8 bg-negro p-10">
            {p.foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto cargada en la configuración
              <img src={p.foto} alt={p.nombre} className="size-40 object-cover" />
            ) : (
              <div className="flex size-40 shrink-0 items-center justify-center border-2 border-dashed border-alerta/60 text-center font-sans text-[16px] text-alerta">
                [COMPLETAR
                <br />
                foto]
              </div>
            )}
            <div className="space-y-3">
              <p className="font-sans text-[40px] font-bold text-blanco">
                <TextoConfig texto={p.nombre} />
              </p>
              <p className="font-sans text-[26px] text-acero">
                <TextoConfig texto={p.rol} />
              </p>
              <p className="font-sans text-[22px] text-acero">
                <TextoConfig texto={p.bio} />
              </p>
            </div>
          </Aparecer>
        ))}
      </div>
    </Lienzo>
  )
}

/** El cierre del manual: «Quvant.», una pausa breve y la bajada. */
function Cierre() {
  const { datos } = useDatosInversores()
  const { activa, velocidad, reinicio } = useEscena()
  return (
    <Lienzo sinMarca>
      <div className="flex h-full flex-col items-center justify-center gap-10 pb-16 text-center">
        {activa && <IsotipoAnimado key={`${activa}:${reinicio}`} lado={220} duracion={1.6 / velocidad} />}
        <Aparecer demora={1.5}>
          <p className="font-sans text-[96px] font-bold tracking-[-0.03em] text-blanco">Quvant.</p>
        </Aparecer>
        <Aparecer demora={2.6}>
          <p className="font-sans text-[48px] text-blanco">{SITIO.tagline}</p>
        </Aparecer>
        <Aparecer demora={3.3} className="space-y-2 font-sans text-[26px] text-acero">
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
  { id: "problema", titulo: "El problema", largo: 120, duracion: 12, Componente: Problema },
  { id: "terreno", titulo: "Lo que vimos en el terreno", largo: 120, duracion: 11, Componente: Terreno },
  { id: "solucion", titulo: "La solución", largo: 120, duracion: 11, Componente: Solucion },
  { id: "cambio-de-empresa", titulo: "La demo que cambia de empresa", largo: 150, duracion: 22, Componente: CambioDeEmpresa },
  // La escena de Forja vuelve con la marca nueva en la tanda 10 (el video viejo muestra el yunque).
  ...(MOSTRAR_FORJA ? [{ id: "forja", titulo: "Forja: el negocio, en vivo", largo: 130, duracion: 46, Componente: ForjaEnVivo }] : []),
  { id: "diferencial", titulo: "El diferencial", largo: 140, duracion: 15, Componente: Diferencial },
  { id: "modelo", titulo: "Modelo de negocio", largo: 120, duracion: 13, Componente: Modelo },
  { id: "estado", titulo: "Estado actual", largo: 120, duracion: 12, Componente: EstadoActual },
  { id: "hoja-de-ruta", titulo: "Hoja de ruta", largo: 120, duracion: 12, Componente: HojaDeRuta },
  { id: "inversion", titulo: "Para qué es la inversión", largo: 120, duracion: 12, Componente: Inversion },
  { id: "equipo", titulo: "Equipo", largo: 110, duracion: 9, Componente: Equipo },
  { id: "cierre", titulo: "Cierre", largo: 100, duracion: 10, Componente: Cierre },
]
