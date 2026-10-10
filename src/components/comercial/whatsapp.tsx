"use client"

import { Copy, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { integraciones } from "@/integraciones"

/**
 * Aviso por WhatsApp. En la demo el envío está EMULADO: se muestra el mensaje
 * tal como saldría y se registra, pero no se manda nada ni se abre wa.me.
 * En producción va detrás de la interfaz de integraciones (WhatsApp Business API).
 */
export function DialogoWhatsApp({ destinatario, telefono, mensaje, onEnviado, onCerrar }: { destinatario: string; telefono: string; mensaje: string; onEnviado?: () => void; onCerrar: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="size-5" /> Enviar por WhatsApp
          </DialogTitle>
          <DialogDescription>
            {destinatario} · <span className="num">{telefono || "sin teléfono"}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-[#0b141a] p-3">
          <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 text-sm text-[#e9edef] shadow">{mensaje}</div>
        </div>
        <p className="rounded-md border border-dashed border-chispa/60 px-3 py-2 text-xs text-muted-foreground">
          <span className="ficha mr-1">Demo</span> Envío emulado: no sale ningún mensaje real. En producción se envía por la API de WhatsApp Business.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(mensaje)
                toast.success("Mensaje copiado")
              } catch {
                toast.error("No se pudo copiar")
              }
            }}
          >
            <Copy /> Copiar
          </Button>
          <Button
            onClick={async () => {
              const r = await integraciones().mensajeria.enviar(telefono, mensaje)
              onEnviado?.()
              toast.success(r.emulado ? "Aviso registrado (envío emulado)" : "Mensaje enviado")
              onCerrar()
            }}
          >
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
