import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quvant",
    short_name: "Quvant",
    description: "El sistema de gestión que se adapta a cada negocio. Sigue vendiendo sin internet.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0d0d0f",
    theme_color: "#0d0d0f",
    lang: "es-AR",
    icons: [
      { src: "/marca/quvant-icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/marca/quvant-icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/marca/quvant-icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mostrador", url: "/app/mostrador" },
      { name: "Inventario", url: "/app/inventario" },
    ],
  }
}
