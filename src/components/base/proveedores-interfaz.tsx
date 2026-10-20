"use client"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CapaSaltos } from "@/components/marca/salto"

/** Avisos (toasts), tooltips y capa de saltos (la recompensa) para la app y las presentaciones. */
export function ProveedoresInterfaz({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      {children}
      <Toaster position="bottom-right" />
      <CapaSaltos />
    </TooltipProvider>
  )
}
