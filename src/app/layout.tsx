import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Michroma } from "next/font/google"
import { Proveedores } from "@/components/base/proveedores"
import { SITIO } from "@/config/sitio"
import "./globals.css"

// Las dos familias del manual de Quvant, autohospedadas por next/font.
// Michroma: un solo peso, solo para títulos muy cortos en mayúsculas (.t-marca).
const michroma = Michroma({
  variable: "--marca-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
})

// IBM Plex Mono: todo lo demás. No es variable: los pesos van explícitos (500 y 600 son extensión del prompt).
const plexMono = IBM_Plex_Mono({
  variable: "--marca-texto",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITIO.url),
  title: {
    default: `Yunque · ${SITIO.tagline}`,
    template: "%s · Yunque",
  },
  description: SITIO.descripcion,
  applicationName: "Yunque",
  authors: [{ name: "Yunque" }],
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0f" },
    { media: "(prefers-color-scheme: light)", color: "#ececee" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${michroma.variable} ${plexMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  )
}
