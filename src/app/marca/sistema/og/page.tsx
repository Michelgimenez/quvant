import type { Metadata } from "next"
import { Firma } from "@/components/marca/quvant"
import { Grilla } from "@/components/marca/grilla"

export const metadata: Metadata = {
  title: "Imagen para redes",
  robots: { index: false },
}

/**
 * La imagen para redes (1200×630): la firma con la bajada sobre la grilla y, como en la portada del manual,
 * la Q grande en gris profundo cortada por el borde. Se captura a public/marca/quvant-og.png.
 */
export default function PaginaImagenRedes() {
  return (
    <main className="min-h-dvh bg-negro">
      <div className="dark relative h-[630px] w-[1200px] overflow-hidden bg-negro" data-lamina>
        <Grilla paso={30} />
        <div
          aria-hidden
          className="absolute bg-profundo"
          style={{
            width: 470,
            height: 470,
            right: -40,
            top: 96,
            maskImage: "url(/marca/quvant-q-blanca-1024.png)",
            maskSize: "contain",
            WebkitMaskImage: "url(/marca/quvant-q-blanca-1024.png)",
            WebkitMaskSize: "contain",
          }}
        />
        <div className="relative flex h-full flex-col justify-center px-[84px]">
          <Firma alto={56} version="principal" bajada />
        </div>
      </div>
    </main>
  )
}
