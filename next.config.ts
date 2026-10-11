import type { NextConfig } from "next"
import { CLIENTES } from "./src/config/clientes"

const esDev = process.env.NODE_ENV === "development"
// HSTS y upgrade-insecure-requests solo si el sitio se publica por https: servidos por
// http (p. ej. `npm start` en una PC) hacen que el navegador pida a https://localhost y falle.
const conHttps = (process.env.NEXT_PUBLIC_SITIO_URL ?? "").startsWith("https://")
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseWs = supabase.replace(/^http/, "ws")
// Mapa base de Forja: estilo oscuro gratuito de CARTO (tiles, fuentes y sprites)
const mapas = "https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com"

/**
 * CSP sin nonces: 'unsafe-inline' en scripts es necesario para el payload
 * inline de Next y el script de tema. Deuda conocida (docs/SEGURIDAD.md):
 * migrar a nonces vía proxy o a SRI cuando el sitio lo justifique.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${mapas}`,
  "font-src 'self' data:",
  `connect-src 'self' ${mapas}${supabase ? ` ${supabase} ${supabaseWs}` : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(conHttps ? ["upgrade-insecure-requests"] : []),
].join("; ")

const encabezadosSeguridad = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La cámara se usa para escanear códigos en inventario y mostrador.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(conHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
]

/**
 * Demos de Forja embebibles (`/demo/<prospecto>/forja`): solo esa ruta se puede
 * mostrar en un iframe, y solo desde los orígenes de su configuración. Sin
 * X-Frame-Options, y la regla general no la pisa (la excluye).
 */
const embebibles = Object.values(CLIENTES).flatMap((c) => (c.forja ? [{ slug: c.slug, origenes: c.forja.embebibleEn }] : []))
const rutaGeneral = embebibles.length ? `/((?!demo/(?:${embebibles.map((e) => e.slug).join("|")})/forja/?$).*)` : "/(.*)"
const encabezadosEmbebible = (origenes: string[]) => [
  { key: "Content-Security-Policy", value: csp.replace("frame-ancestors 'none'", `frame-ancestors 'self' ${origenes.join(" ")}`) },
  ...encabezadosSeguridad.filter((h) => h.key !== "Content-Security-Policy" && h.key !== "X-Frame-Options"),
]

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // PGlite (base local del modo demo) carga WASM y archivos de datos: no se empaqueta
  serverExternalPackages: ["@electric-sql/pglite"],
  // La base local aplica las migraciones al abrirse: el SQL tiene que viajar con el servidor
  outputFileTracingIncludes: {
    "/": ["./supabase/**/*.sql"],
    "/panel": ["./supabase/**/*.sql"],
  },
  experimental: {
    // Navegaciones y Server Actions quedan pendientes (no fallan) sin conexión.
    useOffline: true,
    // CSS incrustado en el HTML: sin pedidos que bloqueen el primer pintado
    // (Tailwind genera poco CSS). También deja el HTML de la app autosuficiente sin conexión.
    inlineCss: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: rutaGeneral, headers: encabezadosSeguridad },
      ...embebibles.map((e) => ({ source: `/demo/${e.slug}/forja`, headers: encabezadosEmbebible(e.origenes) })),
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ]
  },
}

export default nextConfig
