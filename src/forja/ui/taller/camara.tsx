"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import gsap from "gsap"
import * as THREE from "three"
import { ALTO_PARED, ANCHO, FONDO } from "@/forja/dominio/plano"

/**
 * Cámara ortográfica del taller. Encuadra la losa en el lienzo (y deja lugar
 * al panel lateral cuando está abierto). Al entrar baja desde arriba, casi
 * cenital como venía el mapa, hasta el corte isométrico; al salir, sube.
 */
export type ModoCamara = "arriba" | "quieta" | "saliendo"

const grados = THREE.MathUtils.degToRad
const FINAL = { el: grados(33), az: grados(40), zoomK: 1 }
const ARRIBA = { el: grados(80), az: grados(68), zoomK: 0.42 }
const DISTANCIA = 80
const ARRIBA_Y = new THREE.Vector3(0, 1, 0)
const ESQUINAS = [-1, 1].flatMap((sx) => [0, 1].flatMap((sy) => [-1, 1].map((sz) => new THREE.Vector3((sx * (ANCHO + 0.8)) / 2, sy * (ALTO_PARED + 0.1), (sz * (FONDO + 0.8)) / 2))))

const dir = new THREE.Vector3()
const derecha = new THREE.Vector3()
const arriba = new THREE.Vector3()
const objetivo = new THREE.Vector3()

/** Zoom que hace entrar la losa en `ancho`×`alto` px y centro de la vista (en el mundo). */
function encuadre(ancho: number, alto: number, az: number, el: number) {
  dir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az))
  derecha.copy(dir).negate().cross(ARRIBA_Y).normalize()
  arriba.copy(derecha).cross(dir.clone().negate()).normalize()
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of ESQUINAS) {
    const x = p.dot(derecha)
    const y = p.dot(arriba)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const zoom = Math.min(Math.max(80, ancho) / ((maxX - minX) * 1.06), Math.max(80, alto) / ((maxY - minY) * 1.1))
  objetivo.set(0, 0, 0).addScaledVector(derecha, (minX + maxX) / 2).addScaledVector(arriba, (minY + maxY) / 2)
  return zoom
}

export function CamaraTaller({ modo, reducir, margenDerecho, margenAbajo }: { modo: ModoCamara; reducir: boolean; margenDerecho: number; margenAbajo: number }) {
  // "arriba": esperando detrás del brillo; "quieta": baja (o ya está) en el corte; "saliendo": sube
  const p = useRef({ ...(modo === "arriba" && !reducir ? ARRIBA : FINAL), margen: margenDerecho, abajo: margenAbajo })
  // El taller dibuja a demanda: mientras la cámara se mueve, pide un cuadro por paso
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    if (modo === "arriba") return
    const destino = modo === "saliendo" ? ARRIBA : FINAL
    if (reducir) {
      Object.assign(p.current, destino)
      invalidate()
      return
    }
    const t = gsap.to(p.current, { ...destino, duration: modo === "saliendo" ? 0.65 : 1.6, ease: modo === "saliendo" ? "power2.in" : "power3.out", overwrite: "auto", onUpdate: invalidate })
    return () => {
      t.kill()
    }
  }, [modo, reducir, invalidate])

  useEffect(() => {
    const t = gsap.to(p.current, { margen: margenDerecho, abajo: margenAbajo, duration: reducir ? 0 : 0.5, ease: "power2.out", overwrite: "auto", onUpdate: invalidate, onComplete: invalidate })
    return () => {
      t.kill()
    }
  }, [margenDerecho, margenAbajo, reducir, invalidate])

  useFrame(({ camera, size }) => {
    const { el, az, zoomK, margen, abajo } = p.current
    const zoom = encuadre(size.width - margen, size.height - abajo, az, el) * zoomK
    // Corre el centro para que la losa quede en el espacio libre (sin el panel ni la barra)
    objetivo.addScaledVector(derecha, margen / 2 / zoom).addScaledVector(arriba, -abajo / 2 / zoom)
    camera.position.copy(objetivo).addScaledVector(dir, DISTANCIA)
    camera.lookAt(objetivo)
    if (camera.zoom !== zoom) {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
    }
  })
  return null
}
