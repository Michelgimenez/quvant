"use client"

import { motion } from "motion/react"
import { Logo } from "@/components/marca/marca"
import { cn } from "@/lib/utils"
import { useEscena } from "./motor"

const CURVA = [0.2, 0.8, 0.2, 1] as const

/** Fondo y marco de una escena de 1920×1080. */
export function Lienzo({ numero, etiqueta, children, className, sinMarca = false }: { numero?: string; etiqueta?: string; children: React.ReactNode; className?: string; sinMarca?: boolean }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-hierro", className)}>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "linear-gradient(to right, rgb(238 241 244 / 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgb(238 241 244 / 0.035) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden
      />
      {(numero || etiqueta) && (
        <div className="absolute left-[140px] top-[80px] font-mono text-[22px] uppercase tracking-[0.2em] text-acero">
          {numero && <span className="text-niebla">{numero}</span>}
          {numero && etiqueta && " · "}
          {etiqueta}
        </div>
      )}
      {!sinMarca && (
        <div className="absolute right-[140px] top-[78px] text-niebla/70">
          <Logo className="h-[34px]" tono="negativo" />
        </div>
      )}
      <div className="absolute inset-0 px-[140px] pb-[110px] pt-[170px]">{children}</div>
    </div>
  )
}

/** Entra con opacidad y desplazamiento cuando la escena se activa. */
export function Aparecer({
  demora = 0,
  y = 28,
  x = 0,
  escala,
  className,
  children,
  duracion = 0.7,
}: {
  demora?: number
  y?: number
  x?: number
  escala?: number
  className?: string
  children: React.ReactNode
  duracion?: number
}) {
  const { activa, velocidad, reducir } = useEscena()
  const oculto = { opacity: 0, x, y, scale: escala ?? 1 }
  return (
    <motion.div
      className={className}
      initial={oculto}
      animate={activa ? { opacity: 1, x: 0, y: 0, scale: 1 } : oculto}
      transition={{ duration: reducir ? 0 : duracion / velocidad, delay: activa && !reducir ? demora / velocidad : 0, ease: CURVA }}
    >
      {children}
    </motion.div>
  )
}

/** Trazo SVG que se dibuja (pathLength) al activarse la escena. */
export function TrazoAnimado({ d, demora = 0, duracion = 1.2, className, ...resto }: { d: string; demora?: number; duracion?: number; className?: string } & React.SVGProps<SVGPathElement>) {
  const { activa, velocidad, reducir } = useEscena()
  return (
    <motion.path
      d={d}
      className={className}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={activa ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
      transition={{ duration: reducir ? 0 : duracion / velocidad, delay: activa && !reducir ? demora / velocidad : 0, ease: "easeInOut" }}
      {...(resto as object)}
    />
  )
}

export function Titulo({ children, className }: { children: React.ReactNode; className?: string }) {
  // El interlineado va al final: un tamaño de texto en className no lo pisa.
  return <h2 className={cn("text-balance text-[88px] font-extrabold tracking-[-0.035em] text-niebla", className, "leading-[1.04]")}>{children}</h2>
}

export function Bajada({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("max-w-[1200px] text-[34px] leading-snug text-acero", className)}>{children}</p>
}

/** Marco de navegador para mostrar pantallas de la app dentro del escenario. */
export function Pantalla({ children, className, url = "app.yunque" }: { children: React.ReactNode; className?: string; url?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[18px] border border-white/10 bg-forja shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)]", className)}>
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3" aria-hidden>
        <span className="size-3 rounded-full bg-white/15" />
        <span className="size-3 rounded-full bg-white/15" />
        <span className="size-3 rounded-full bg-white/15" />
        <span className="ml-4 flex h-6 flex-1 items-center rounded-md bg-white/5 px-3 font-mono text-[12px] text-acero">{url}</span>
      </div>
      <div className="sin-scrollbar relative overflow-hidden">{children}</div>
    </div>
  )
}
