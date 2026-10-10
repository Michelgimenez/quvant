import type { Page } from "@playwright/test"

export type Pantalla = {
  id: string
  ruta: string
  /** Inicia sesión con este usuario demo antes de capturar. */
  usuario?: string
  /** Espera a este selector antes de capturar. */
  esperar?: string
  /** Acciones previas a la captura (abrir un diálogo, etc.). */
  antes?: (p: Page) => Promise<void>
  paginaCompleta?: boolean
  /** Se copia a public/capturas para usarla en el sitio. */
  publica?: boolean
  soloEscritorio?: boolean
  tema?: "claro" | "oscuro"
}

/** Pantallas a capturar. Se completa a medida que se construye cada fase. */
export const PANTALLAS: Pantalla[] = [
  { id: "marca", ruta: "/marca", paginaCompleta: true },
  { id: "ingresar", ruta: "/ingresar" },
  {
    id: "ingresar-2fa",
    ruta: "/ingresar",
    antes: async (p) => {
      await p.getByLabel("Email").fill("dueno@demo.yunque.app")
      await p.getByLabel("Contraseña").fill("demo1234")
      await p.getByRole("button", { name: "Ingresar" }).click()
      await p.waitForURL(/verificar/)
      await p.getByTestId("codigo-demo").waitFor()
    },
  },
]
