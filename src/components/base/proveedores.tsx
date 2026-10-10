"use client"

import { ThemeProvider } from "next-themes"

/** Proveedor global mínimo: solo el tema. Toasts, tooltips y chispas viven en cada superficie que los usa. */
export function Proveedores({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
}
