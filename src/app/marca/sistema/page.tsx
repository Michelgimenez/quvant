import type { Metadata } from "next"
import { Lamina } from "./lamina"

export const metadata: Metadata = {
  title: "Sistema aplicado",
  description: "La lámina de verificación del manual de Quvant aplicado a la web y a la app.",
  robots: { index: false },
}

export default function PaginaLamina() {
  return (
    <main className="min-h-dvh bg-negro">
      <Lamina />
    </main>
  )
}
