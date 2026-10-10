"use client"

import { PantallaError } from "@/components/base/pantalla-error"

export default function ErrorApp(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <PantallaError {...props} />
}
