import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Proveedores } from "@/components/base/proveedores"
import { SITIO } from "@/config/sitio"
import "./globals.css"

// Inter con eje óptico: opsz 32 = Inter Display (titulares), opsz 14 = texto.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  preload: false,
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
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
    { media: "(prefers-color-scheme: light)", color: "#eef1f4" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${inter.variable} ${jetbrains.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  )
}
