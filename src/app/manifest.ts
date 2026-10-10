import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yunque",
    short_name: "Yunque",
    description: "Gestión para ferreterías industriales y distribuidores. Sigue funcionando sin internet.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0e1116",
    theme_color: "#0e1116",
    lang: "es-AR",
    icons: [
      { src: "/marca/favicon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/marca/yunque-app-icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/marca/yunque-app-icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Mostrador", url: "/app/mostrador" },
      { name: "Inventario", url: "/app/inventario" },
    ],
  }
}
