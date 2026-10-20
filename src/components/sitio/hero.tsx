import { ArrowRight, PlayCircle } from "lucide-react"
import { TRAZO_CHISPA, TRAZO_YUNQUE } from "@/components/marca/trazos"
import { SITIO } from "@/config/sitio"

/**
 * Héroe del sitio. Todo en CSS (sin JavaScript): el yunque se arma en tres
 * piezas, cruza un golpe de luz, salta la chispa y aparece el titular.
 * Con prefers-reduced-motion se muestra armado desde el primer cuadro.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-36" aria-labelledby="titulo-hero">
      <div className="pointer-events-none absolute inset-0 grilla-tecnica opacity-80" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_30%,rgb(59_110_245/0.14),transparent_70%),radial-gradient(ellipse_80%_70%_at_50%_40%,transparent_40%,var(--hierro)_85%)]" aria-hidden />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center">
        <svg viewBox="-8 -14 116 104" className="h-28 w-auto overflow-visible sm:h-36" role="img" aria-label="Yunque">
          <defs>
            <clipPath id="hero-cara">
              <rect x="0" y="20" width="100" height="31.5" />
            </clipPath>
            <clipPath id="hero-cintura">
              <rect x="0" y="51" width="100" height="18.5" />
            </clipPath>
            <clipPath id="hero-base">
              <rect x="0" y="69" width="100" height="20" />
            </clipPath>
            <clipPath id="hero-silueta">
              <path d={TRAZO_YUNQUE} />
            </clipPath>
            <linearGradient id="hero-luz" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="pieza-yunque pieza-base" clipPath="url(#hero-base)">
            <path d={TRAZO_YUNQUE} fill="var(--niebla)" />
          </g>
          <g className="pieza-yunque pieza-cintura" clipPath="url(#hero-cintura)">
            <path d={TRAZO_YUNQUE} fill="var(--niebla)" />
          </g>
          <g className="pieza-yunque pieza-cara" clipPath="url(#hero-cara)">
            <path d={TRAZO_YUNQUE} fill="var(--niebla)" />
          </g>
          <g clipPath="url(#hero-silueta)">
            <rect className="golpe-luz" x="-30" y="20" width="30" height="70" fill="url(#hero-luz)" />
          </g>
          {[
            [72, -3, 72, -9],
            [84, 11, 91, 11],
            [60, 11, 53, 11],
            [80, 3, 85, -2],
            [64, 3, 59, -2],
            [80, 19, 85, 24],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="rayo-hero" stroke="var(--chispa)" strokeWidth="1.6" strokeLinecap="round" pathLength={1} />
          ))}
          <path d={TRAZO_CHISPA} fill="var(--chispa)" className="chispa-hero" />
        </svg>

        <h1 id="titulo-hero" className="aparecer mt-8 text-balance text-5xl font-extrabold tracking-tight text-niebla sm:text-7xl" style={{ animationDelay: "1.15s" }}>
          {SITIO.tagline}
        </h1>
        <p className="aparecer mt-5 max-w-2xl text-balance text-lg text-acero sm:text-xl" style={{ animationDelay: "1.3s" }}>
          {SITIO.descripcion}
        </p>
        <div className="aparecer mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "1.45s" }}>
          <a href="#pedir-demo" className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            Pedir una demo <ArrowRight className="size-4" />
          </a>
          <a href="#nunca-se-cae" className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/15 px-5 text-base text-niebla transition-colors hover:border-white/30">
            <PlayCircle className="size-4" /> Probarlo acá mismo
          </a>
        </div>
        <p className="aparecer mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-superficie/70 px-3 py-1 text-xs text-acero" style={{ animationDelay: "1.6s" }}>
          <span className="size-1.5 rounded-full bg-chispa" aria-hidden />
          {SITIO.estado}
        </p>
      </div>
    </section>
  )
}
