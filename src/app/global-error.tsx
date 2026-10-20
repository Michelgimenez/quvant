"use client"

import { useEffect } from "react"
import { reportarError } from "@/lib/monitoreo"

/** Último recurso: reemplaza el layout raíz, por eso trae su propio <html>. */
export default function ErrorGlobal({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportarError(error, { digest: error.digest })
  }, [error])
  return (
    <html lang="es-AR">
      <body style={{ background: "#0d0d0f", color: "#ececee", fontFamily: "ui-monospace, monospace", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>Quvant tuvo un problema</h1>
          <p style={{ color: "#9c9ca3" }}>Tus datos quedaron guardados en este equipo. Probá recargar.</p>
          <button onClick={() => retry()} style={{ marginTop: 16, padding: "10px 16px", borderRadius: 4, border: 0, background: "#ececee", color: "#0d0d0f", cursor: "pointer" }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
