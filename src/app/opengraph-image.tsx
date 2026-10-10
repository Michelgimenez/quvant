import { ImageResponse } from "next/og"
import { TRAZO_CHISPA, TRAZO_WORDMARK, TRAZO_YUNQUE } from "@/components/marca/trazos"

export const alt = "Yunque · Firme, aunque todo se mueva."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** Imagen para redes (Open Graph), generada con la marca. */
export default function ImagenOG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0E1116",
          backgroundImage: "linear-gradient(rgba(238,241,244,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(238,241,244,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          color: "#EEF1F4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="190" height="167" viewBox="0 0 100 88">
            <path d={TRAZO_YUNQUE} fill="#EEF1F4" />
            <path d={TRAZO_CHISPA} fill="#FFB224" />
          </svg>
          <svg width="480" height="105" viewBox="0 0 651 141.86">
            <path d={TRAZO_WORDMARK} fill="#EEF1F4" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: -2 }}>Firme, aunque todo se mueva.</div>
          <div style={{ fontSize: 30, color: "#9AA3AE" }}>Gestión para ferreterías industriales y distribuidores. Sigue vendiendo sin internet.</div>
        </div>
      </div>
    ),
    size,
  )
}
