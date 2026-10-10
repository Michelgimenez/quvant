"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { motion } from "motion/react"
import { CheckCircle2, Search } from "lucide-react"
import { ProveedorApp } from "@/cliente/app-contexto"
import { sesionDemo, type DemoEmbebida } from "@/cliente/demo-embebida"
import { NAVEGACION } from "@/cliente/navegacion"
import { Tablero } from "@/components/app/tablero"
import { LogoOrg } from "@/components/base/logo-org"
import { Sello, TextoConfig } from "@/components/base/sellos"
import { ConYunqueDiscreto } from "@/components/marca/con-yunque-discreto"
import { Wordmark } from "@/components/marca/marca"
import { DemoConexion } from "@/components/sitio/demo-conexion"
import type { ClienteDemo } from "@/config/clientes"
import { IMPLEMENTACION } from "@/config/hoja-de-ruta"
import { PRECIOS } from "@/config/precios"
import { textoSobre } from "@/lib/color"
import { cn } from "@/lib/utils"
import { Aparecer, Bajada, Lienzo, Titulo, TrazoAnimado } from "./kit"
import { useEscena, type DefinicionEscena } from "./motor"
import { PeliculaProducto, type TextosPelicula } from "./pelicula-producto"

/**
 * Demo comercial para un prospecto (`/demo/[cliente]`): versión corta de la
 * presentación (unos 6 minutos en reproducción automática) con su marca y el
 * sello PROPUESTA siempre visible. Todo sale de `src/config/clientes/<slug>.ts`.
 */

const Ctx = createContext<{ cliente: ClienteDemo; demo: DemoEmbebida | null } | null>(null)
export const ProveedorDemoCliente = Ctx.Provider
function useCliente() {
  const c = useContext(Ctx)
  if (!c) throw new Error("Falta el cliente de la demo")
  return c
}

function orgDe(c: ClienteDemo) {
  return { nombre: c.nombre, logo: c.logo, logoNegativo: c.logoNegativo, colorAcento: c.color }
}

/** Arriba a la derecha en cada escena: su marca, "con yunque" y el sello PROPUESTA. */
function MarcaCliente() {
  const { cliente } = useCliente()
  return (
    <div className="flex items-center gap-5">
      <LogoOrg org={orgDe(cliente)} alto="h-[30px]" />
      <Sello texto="PROPUESTA" className="h-8 px-3 text-[15px]" titulo="Propuesta comercial: no es un cliente activo" />
    </div>
  )
}

function LienzoCliente(props: { numero: string; etiqueta: string; children: React.ReactNode }) {
  return <Lienzo {...props} marca={<MarcaCliente />} />
}

/** Resalta con el color del cliente. */
function Acento({ children }: { children: React.ReactNode }) {
  const { cliente } = useCliente()
  return <span style={{ color: cliente.color }}>{children}</span>
}

function Portada() {
  const { cliente } = useCliente()
  return (
    <Lienzo sinMarca>
      <div className="flex h-full flex-col items-center justify-center gap-12 pb-10 text-center">
        <Aparecer escala={0.94}>
          <LogoOrg org={orgDe(cliente)} alto="h-[120px]" />
        </Aparecer>
        <Aparecer demora={0.5}>
          <p className="text-[88px] font-extrabold leading-[1.04] tracking-[-0.035em] text-niebla">
            Así se vería <span className="font-display">Yunque</span> en {cliente.nombre}
          </p>
        </Aparecer>
        <Aparecer demora={0.9} className="flex items-center gap-8">
          <Sello texto="PROPUESTA" className="h-12 px-5 text-[24px]" titulo="Propuesta comercial: no es un cliente activo" />
          <span className="text-[28px] text-acero">
            <TextoConfig texto={cliente.rubro} /> · demo con datos de ejemplo
          </span>
        </Aparecer>
        <Aparecer demora={1.3} className="mt-6 flex items-center gap-4 text-[22px] text-acero">
          funciona con <Wordmark className="h-[34px] text-niebla" />
        </Aparecer>
      </div>
    </Lienzo>
  )
}

function SuProblema() {
  const { cliente } = useCliente()
  return (
    <LienzoCliente numero="02" etiqueta="Lo que vimos">
      <Aparecer>
        <Titulo className="max-w-[1500px] text-[76px]">
          Lo que vimos en <Acento>{cliente.nombre}</Acento>.
        </Titulo>
        <Bajada className="mt-4 text-[28px]">Del relevamiento de su sistema y su forma de trabajar hoy.</Bajada>
      </Aparecer>
      <ul className="mt-14 grid grid-cols-2 gap-8">
        {cliente.problemas.map((p, i) => (
          <Aparecer key={p.area} demora={0.5 + i * 0.18} className="rounded-3xl border border-white/10 bg-forja/80 p-8" y={24}>
            <p className="font-mono text-[20px] uppercase tracking-widest text-acero">{p.area}</p>
            <p className="mt-3 text-[30px] leading-snug text-niebla">
              <TextoConfig texto={p.detalle} />
            </p>
          </Aparecer>
        ))}
      </ul>
    </LienzoCliente>
  )
}

/** La app real (tablero de la dueña) con la marca del cliente, en un marco de navegador. */
function AppConSuMarca({ demo }: { demo: DemoEmbebida }) {
  const { cliente } = useCliente()
  const { activa, reducir, velocidad } = useEscena()
  const sesion = useMemo(() => sesionDemo(demo), [demo])
  const org = demo.motor.estado.org
  return (
    <div className="light relative overflow-hidden rounded-[18px] border border-white/10 bg-background text-foreground shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)]" style={{ width: 1100, height: 690 }}>
      <Sello texto="DATOS DE EJEMPLO" className="absolute bottom-5 right-5 z-20 h-8 bg-background px-3 text-[14px]" titulo="Productos, ventas y personas ficticios de la empresa demo" />
      {/* Pantalla de 1440×900 reducida: la app tal cual, sin interacción */}
      <div inert className="pointer-events-none origin-top-left select-none" style={{ width: 1440, height: 903, transform: `scale(${1100 / 1440})`, "--marca": cliente.color, "--marca-contraste": textoSobre(cliente.color) } as React.CSSProperties}>
        <div className="h-[3px]" style={{ background: cliente.color }} />
        <div className="flex h-full">
          <aside className="relative w-60 shrink-0 border-r border-sidebar-border bg-sidebar px-3 py-4">
            <LogoOrg org={org} alto="h-8" className="px-2" />
            <nav className="mt-6 space-y-5" aria-hidden>
              {NAVEGACION.slice(0, 3).map((g) => (
                <div key={g.grupo}>
                  <p className="px-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{g.grupo}</p>
                  <ul className="mt-2 space-y-0.5">
                    {g.items.map((it, i) => (
                      <li key={it.href} className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm", g.grupo === NAVEGACION[0].grupo && i === 0 ? "bg-sidebar-accent font-medium" : "text-foreground/80")}>
                        <it.icono className="size-4" /> {it.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="absolute bottom-6 left-5">
              <ConYunqueDiscreto />
            </div>
          </aside>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="relative z-10 flex h-14 items-center gap-2 border-b border-linea bg-background px-5">
              <span className="flex h-9 w-72 items-center gap-2 rounded-lg border border-linea bg-superficie-2 px-3 text-sm text-muted-foreground">
                <Search className="size-4" /> Buscar productos, clientes…
              </span>
              <span className="ml-auto inline-flex h-8 items-center gap-2 rounded-full border border-linea px-3 text-[13px]">
                <span className="size-2 rounded-full bg-ok" /> Sincronizado
              </span>
            </div>
            <motion.div
              className="px-5 pt-6"
              initial={{ y: 0 }}
              animate={activa && !reducir ? { y: [0, 0, -420, -420, 0] } : { y: 0 }}
              transition={{ duration: 22 / velocidad, times: [0, 0.15, 0.5, 0.7, 1], ease: "easeInOut", repeat: Infinity }}
            >
              <ProveedorApp motor={demo.motor} servidor={demo.servidor} sesion={sesion}>
                <Tablero />
              </ProveedorApp>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Pantalla de ingreso en el celular: su marca adelante, Yunque discreto al pie. */
function IngresoCelular() {
  const { cliente } = useCliente()
  return (
    <div className="dark flex h-[470px] w-[250px] flex-col overflow-hidden rounded-[36px] border-[9px] border-[#22272f] bg-background px-5 pb-5 pt-10 text-foreground shadow-2xl">
      <LogoOrg org={orgDe(cliente)} alto="h-6" />
      <p className="mt-8 text-[17px] font-bold">Ingresá</p>
      <div className="mt-4 space-y-3" aria-hidden>
        <div className="h-9 rounded-md border border-linea bg-superficie-2" />
        <div className="h-9 rounded-md border border-linea bg-superficie-2" />
        <div className="flex h-9 items-center justify-center rounded-md text-[13px] font-semibold" style={{ background: cliente.color, color: textoSobre(cliente.color) }}>
          Ingresar
        </div>
      </div>
      <div className="mt-auto flex justify-center">
        <ConYunqueDiscreto />
      </div>
    </div>
  )
}

function SuMarca() {
  const { cliente, demo } = useCliente()
  return (
    <LienzoCliente numero="03" etiqueta="Yunque con su marca">
      <div className="grid h-full grid-cols-[1100px_1fr] gap-12">
        <div className="flex flex-col gap-6">
          <Aparecer>
            <Titulo className="text-[56px]">
              Su logo y su color. <Acento>Yunque</Acento> queda discreto.
            </Titulo>
          </Aparecer>
          <Aparecer demora={0.4} escala={0.98}>
            {demo && <AppConSuMarca demo={demo} />}
          </Aparecer>
        </div>
        <div className="flex flex-col gap-8 pt-2">
          <Aparecer demora={0.7} className="self-center">
            <IngresoCelular />
          </Aparecer>
          <Aparecer demora={1.0}>
            <p className="font-mono text-[18px] uppercase tracking-widest text-acero">Sus categorías</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {cliente.categorias.map((c) => (
                <li key={c} className="rounded-full border border-white/10 bg-forja px-4 py-2 text-[18px] text-niebla">
                  <TextoConfig texto={c} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[16px] text-acero">
              Fuente: <TextoConfig texto={cliente.fuenteCategorias} />. Los productos y números de la pantalla son de ejemplo.
            </p>
          </Aparecer>
        </div>
      </div>
    </LienzoCliente>
  )
}

function UnDia() {
  const { cliente, demo } = useCliente()
  const textos: TextosPelicula = [
    ["08:15 · Mostrador", "Abre la caja y vende con el lector. Si se corta internet, sigue vendiendo."],
    ["11:40 · Depósito", "Escanea una máquina y ve el stock de cada sucursal, en el celular."],
    ["17:20 · Presupuesto aceptado", "El cliente confirma por WhatsApp: un clic y es una venta."],
  ]
  return (
    <LienzoCliente numero="04" etiqueta={`Un día en ${cliente.nombre}`}>{demo && <PeliculaProducto demo={demo} textos={textos} bucle />}</LienzoCliente>
  )
}

function Corte() {
  const { activa, velocidad, reinicio } = useEscena()
  // Vuelve a correr el guion cada 22 s mientras la escena está activa
  const [ciclo, setCiclo] = useState(0)
  useEffect(() => {
    if (!activa) return
    const id = window.setInterval(() => setCiclo((c) => c + 1), 22_000 / velocidad)
    return () => window.clearInterval(id)
  }, [activa, velocidad])
  return (
    <LienzoCliente numero="05" etiqueta="El corte de conexión">
      <div className="grid h-full grid-cols-[500px_1fr] items-center gap-16">
        <div>
          <Aparecer>
            <Titulo className="text-[76px]">Se corta internet. El mostrador sigue.</Titulo>
          </Aparecer>
          <Aparecer demora={0.4}>
            <Bajada className="mt-8 text-[28px]">Cada puesto guarda lo que vende y lo sincroniza solo cuando vuelve la conexión. Sin papelitos, sin cargar dos veces.</Bajada>
          </Aparecer>
          <Aparecer demora={0.7}>
            <p className="mt-10 font-mono text-[20px] uppercase tracking-widest text-chispa">En vivo · mismo motor que la app</p>
          </Aparecer>
        </div>
        <Aparecer demora={0.3} escala={0.97}>
          <div style={{ zoom: 1.2 }}>
            <DemoConexion guion={{ activo: activa, velocidad, reinicio: reinicio * 1000 + ciclo }} />
          </div>
        </Aparecer>
      </div>
    </LienzoCliente>
  )
}

function ComoEmpezamos() {
  const { cliente } = useCliente()
  const { activa, velocidad, reducir } = useEscena()
  return (
    <LienzoCliente numero="06" etiqueta="Cómo empezamos">
      <Aparecer>
        <Titulo className="text-[76px]">
          Paso a paso, sin frenar a <Acento>{cliente.nombre}</Acento>.
        </Titulo>
      </Aparecer>
      <div className="relative mt-24">
        <svg viewBox="0 0 1640 40" className="absolute inset-x-0 top-[2px] w-full" aria-hidden>
          <TrazoAnimado d="M20 20 H1620" stroke={cliente.color} strokeWidth="4" strokeLinecap="round" fill="none" demora={0.4} duracion={1.6} />
        </svg>
        <ol className="relative grid grid-cols-4 gap-10">
          {IMPLEMENTACION.map((p, i) => (
            <li key={p.paso}>
              <motion.span
                className="flex size-[44px] items-center justify-center rounded-full border-4 bg-hierro font-mono text-[18px] font-bold text-niebla"
                style={{ borderColor: cliente.color }}
                initial={{ scale: 0 }}
                animate={{ scale: activa ? 1 : 0 }}
                transition={{ duration: reducir ? 0 : 0.4 / velocidad, delay: activa && !reducir ? (0.6 + i * 0.35) / velocidad : 0 }}
              >
                {i + 1}
              </motion.span>
              <Aparecer demora={0.8 + i * 0.35} y={16} className="mt-8 pr-6">
                <p className="text-[36px] font-bold leading-tight text-niebla">{p.paso}</p>
                <p className="mt-3 text-[24px] leading-snug text-acero">{p.detalle}</p>
              </Aparecer>
            </li>
          ))}
        </ol>
      </div>
      <Aparecer demora={2.4} className="mt-20 text-[26px] text-acero">
        Plazo estimado: <TextoConfig texto="[COMPLETAR: según sucursales y migración]" />. Sucursales: {cliente.sucursales.map((s, i) => (
          <span key={s}>
            {i > 0 && ", "}
            <TextoConfig texto={s} />
          </span>
        ))}
        .
      </Aparecer>
    </LienzoCliente>
  )
}

function SocioFundador() {
  const { cliente } = useCliente()
  const socios = PRECIOS.sociosFundadores
  const plan = PRECIOS.planes[0]
  return (
    <LienzoCliente numero="07" etiqueta="Socio fundador">
      <div className="grid h-full grid-cols-[1fr_560px] gap-16">
        <div>
          <Aparecer>
            <Titulo className="text-[76px]">
              <Acento>{cliente.nombre}</Acento> como socio fundador.
            </Titulo>
            <Bajada className="mt-5 text-[28px]">
              Programa para los primeros {socios.cupos} negocios que usen Yunque de verdad. {socios.estado}.
            </Bajada>
          </Aparecer>
          <ul className="mt-12 space-y-6">
            {socios.condiciones.map((c, i) => (
              <Aparecer key={c} demora={0.5 + i * 0.2} x={-16} y={0} className="flex items-start gap-4 text-[30px] text-niebla">
                <CheckCircle2 className="mt-1 size-8 shrink-0 text-ok" /> {c}
              </Aparecer>
            ))}
          </ul>
          <Aparecer demora={1.3} className="mt-10 max-w-[900px] text-[24px] leading-snug text-acero">
            A cambio: {socios.aCambio.charAt(0).toLowerCase() + socios.aCambio.slice(1)}
          </Aparecer>
        </div>
        <Aparecer demora={0.8} className="flex flex-col self-start rounded-3xl border border-white/10 bg-forja/80 p-10">
          <p className="font-mono text-[20px] uppercase tracking-widest text-acero">Plan {plan.nombre}</p>
          <p className="mt-4 text-[80px] font-extrabold leading-none tracking-tight text-niebla">USD {plan.precioMensual}</p>
          <p className="mt-2 text-[26px] text-acero">{plan.unidad}</p>
          <p className="mt-4 text-[22px] text-acero">{plan.para}. Implementación: {PRECIOS.implementacion.toLowerCase()}</p>
          <div className="mt-8 border-t border-white/10 pt-8 text-[22px] text-niebla">
            <p className="font-mono text-[16px] uppercase tracking-widest text-acero">Hablemos</p>
            <p className="mt-3">
              <TextoConfig texto={cliente.contacto.nombre} />
            </p>
            <p>
              <TextoConfig texto={cliente.contacto.email} />
            </p>
            <p>
              <TextoConfig texto={cliente.contacto.telefono} />
            </p>
          </div>
        </Aparecer>
      </div>
    </LienzoCliente>
  )
}

/** Unos 6 minutos en reproducción automática (5 a 7 según la velocidad). */
export const ESCENAS_CLIENTE: DefinicionEscena[] = [
  { id: "portada", titulo: "Así se vería Yunque", largo: 100, duracion: 12, Componente: Portada },
  { id: "su-problema", titulo: "Lo que vimos", largo: 120, duracion: 45, Componente: SuProblema },
  { id: "su-marca", titulo: "Yunque con su marca", largo: 140, duracion: 60, Componente: SuMarca },
  { id: "un-dia", titulo: "Un día en su negocio", largo: 150, duracion: 80, Componente: UnDia },
  { id: "corte", titulo: "El corte de conexión", largo: 140, duracion: 60, Componente: Corte },
  { id: "como-empezamos", titulo: "Cómo empezamos", largo: 120, duracion: 45, Componente: ComoEmpezamos },
  { id: "socio-fundador", titulo: "Socio fundador", largo: 120, duracion: 45, Componente: SocioFundador },
]
