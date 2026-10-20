import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { VideoQuvant } from "@/components/demo/video-quvant"
import { esIdVideo, IDS_VIDEOS } from "@/demo/peliculas"

export const metadata: Metadata = {
  title: "Video",
  robots: { index: false, follow: false },
}

export function generateStaticParams() {
  return IDS_VIDEOS.map((video) => ({ video }))
}

/**
 * /videos/<id>: la página de la que se filma cada video (scripts/videos/filmar.mts). Sin ?film=1 se reproduce
 * sola (para mirarla); con ?film=1 queda quieta y la mueve quien filma, cuadro por cuadro.
 */
export default function PaginaVideo({ params, searchParams }: PageProps<"/videos/[video]">) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-negro" aria-busy />}>
      <Contenido params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Contenido({ params, searchParams }: { params: PageProps<"/videos/[video]">["params"]; searchParams: PageProps<"/videos/[video]">["searchParams"] }) {
  const { video } = await params
  if (!esIdVideo(video)) notFound()
  const film = (await searchParams).film === "1"
  return <VideoQuvant video={video} filmando={film} />
}
