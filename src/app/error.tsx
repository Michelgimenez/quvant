"use client"

import { PantallaError } from "@/components/base/pantalla-error"

export default function ErrorRaiz(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <PantallaError {...props} />
}
