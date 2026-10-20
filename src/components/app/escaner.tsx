"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, ScanBarcode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type ConDetector = typeof globalThis & { BarcodeDetector?: new (o: { formats: string[] }) => Detector }

/**
 * Escaneo de códigos de barras con la cámara del celular o la notebook.
 * Usa BarcodeDetector (nativo) y, si no está, ZXing. Siempre se puede
 * tipear el código a mano. En la demo se puede simular una lectura.
 */
export function EscanerCodigo({
  abierto,
  onAbierto,
  onDetectar,
  ejemplos = [],
  titulo = "Escanear código",
}: {
  abierto: boolean
  onAbierto: (v: boolean) => void
  onDetectar: (codigo: string) => void
  ejemplos?: { codigo: string; nombre: string }[]
  titulo?: string
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<"iniciando" | "leyendo" | "sin_camara">("iniciando")
  const [manual, setManual] = useState("")

  useEffect(() => {
    if (!abierto) return
    let flujo: MediaStream | null = null
    let activo = true
    let detenerZxing: (() => void) | null = null
    let cuadro = 0

    const detectado = (codigo: string) => {
      if (!activo) return
      activo = false
      navigator.vibrate?.(60)
      onDetectar(codigo)
      onAbierto(false)
    }

    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("sin cámara")
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
        if (!activo || !video.current) return
        video.current.srcObject = flujo
        await video.current.play()
        setEstado("leyendo")
        const Nativo = (globalThis as ConDetector).BarcodeDetector
        if (Nativo) {
          const det = new Nativo({ formats: ["ean_13", "ean_8", "code_128", "upc_a", "code_39"] })
          const leer = async () => {
            if (!activo || !video.current) return
            try {
              const r = await det.detect(video.current)
              if (r[0]?.rawValue) return detectado(r[0].rawValue)
            } catch {
              /* cuadro sin código */
            }
            cuadro = requestAnimationFrame(leer)
          }
          leer()
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser")
          const lector = new BrowserMultiFormatReader()
          const controles = await lector.decodeFromVideoElement(video.current, (r) => {
            if (r) detectado(r.getText())
          })
          detenerZxing = () => controles.stop()
        }
      } catch {
        if (activo) setEstado("sin_camara")
      }
    })()

    return () => {
      activo = false
      cancelAnimationFrame(cuadro)
      detenerZxing?.()
      flujo?.getTracks().forEach((t) => t.stop())
      setEstado("iniciando")
    }
  }, [abierto, onDetectar, onAbierto])

  return (
    <Dialog open={abierto} onOpenChange={onAbierto}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="size-5" /> {titulo}
          </DialogTitle>
          <DialogDescription>Apuntá la cámara al código de barras.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-negro">
          <video ref={video} className="size-full object-cover" playsInline muted />
          {estado === "leyendo" && (
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-error/80 shadow-[0_0_12px_2px_rgba(229,72,77,0.6)]" aria-hidden />
          )}
          {estado !== "leyendo" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center t-texto-sm text-blanco/80">
              {estado === "sin_camara" ? <CameraOff className="size-6" /> : <Camera className="size-6 animate-pulse" />}
              {estado === "sin_camara" ? "No hay cámara disponible o no se dio permiso. Cargá el código a mano." : "Abriendo la cámara…"}
            </div>
          )}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (manual.trim()) {
              onDetectar(manual.trim())
              setManual("")
              onAbierto(false)
            }
          }}
        >
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Código o SKU" inputMode="numeric" aria-label="Código a mano" className="num" />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        {ejemplos.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-dashed border-alerta/50 p-2.5">
            <p className="ficha">Demo · simular lectura</p>
            <div className="flex flex-wrap gap-1.5">
              {ejemplos.map((x) => (
                <button
                  key={x.codigo}
                  type="button"
                  className="rounded border border-linea bg-superficie-2 px-2 py-1 text-left t-texto-sm hover:border-acero/50"
                  onClick={() => {
                    onDetectar(x.codigo)
                    onAbierto(false)
                  }}
                >
                  <span className="num block">{x.codigo}</span>
                  <span className="block max-w-40 truncate text-muted-foreground">{x.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
