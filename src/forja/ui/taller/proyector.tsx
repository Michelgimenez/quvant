"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Ancla } from "./etiquetas"

const v = new THREE.Vector3()

/** Ubica cada etiqueta del DOM sobre su punto 3D, cuadro a cuadro (solo transform). */
export function ProyectorEtiquetas({ anclas, elementos }: { anclas: Ancla[]; elementos: React.RefObject<Map<string, HTMLElement>> }) {
  const ultimas = useRef(new WeakMap<HTMLElement, string>())
  useFrame(({ camera, size }) => {
    for (const a of anclas) {
      const el = elementos.current.get(a.id)
      if (!el) continue
      v.set(a.pos[0], a.pos[1], a.pos[2]).project(camera)
      const t = `translate3d(${(((v.x + 1) / 2) * size.width).toFixed(1)}px, ${(((1 - v.y) / 2) * size.height).toFixed(1)}px, 0)`
      if (ultimas.current.get(el) === t) continue
      ultimas.current.set(el, t)
      el.style.transform = t
    }
  })
  return null
}
