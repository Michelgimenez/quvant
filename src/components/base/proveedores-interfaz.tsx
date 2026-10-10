"use client"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CapaChispas } from "@/components/marca/momento-chispa"

/** Avisos (toasts), tooltips y capa de chispas para la app y las presentaciones. */
export function ProveedoresInterfaz({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      {children}
      <Toaster position="bottom-right" />
      <CapaChispas />
    </TooltipProvider>
  )
}
