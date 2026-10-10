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
      <body style={{ background: "#0e1116", color: "#eef1f4", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>Yunque tuvo un problema</h1>
          <p style={{ color: "#9aa3ae" }}>Tus datos quedaron guardados en este equipo. Probá recargar.</p>
          <button onClick={() => retry()} style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, border: 0, background: "#3466f0", color: "#fff", cursor: "pointer" }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
