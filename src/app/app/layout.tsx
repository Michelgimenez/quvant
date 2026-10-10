import type { Metadata } from "next"
import { ShellApp } from "@/components/app/shell"
import { ProveedoresInterfaz } from "@/components/base/proveedores-interfaz"

export const metadata: Metadata = {
  title: { default: "App", template: "%s · Yunque" },
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
}

export default function LayoutApp({ children }: LayoutProps<"/app">) {
  return (
    <ProveedoresInterfaz>
      <ShellApp>{children}</ShellApp>
    </ProveedoresInterfaz>
  )
}
