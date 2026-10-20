import gsap from "gsap"
import { EVENTO_ARRANCAR_ACTIVACION } from "./activacion/activacion"

/**
 * El guion de los videos de Forja (punto 8.2 de PROMPT-QUVANT.md): una línea de tiempo maestra de GSAP que hace,
 * en su segundo exacto, lo mismo que haría una persona: arranca la activación, se acerca a la Casa Central, entra,
 * vende en dos cajas, mira el depósito, un rack pasa a crítico, vuelve a la red y repite el día a 1200×.
 *
 * Con ?film=1, la página expone window.__duration y window.__arrancar(). Quien filma (scripts/videos/filmar-forja.mts)
 * maneja el reloj de la página cuadro por cuadro: MapLibre y three.js tienen su propio bucle de animación, así que
 * el reloj que avanza es el de la página entera (requestAnimationFrame, performance y los temporizadores), y la
 * línea de tiempo lo sigue.
 */
export const DURACION_VIDEO_FORJA = 42

type Guion = { vender: (codigo: string, puesto?: number) => boolean; quiebre: (codigo: string, puesto?: number) => boolean }

const nodo = (codigo: string) => document.querySelector<HTMLButtonElement>(`[data-nodo="${codigo}"] button`)
const porTestid = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const tecla = (key: string) => (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))

export function guionVideoForja(guion: Guion) {
  const tl = gsap.timeline({ paused: true })
  const en = (s: number, hacer: () => unknown) => tl.add(() => void hacer(), s)
  en(0, () => window.dispatchEvent(new Event(EVENTO_ARRANCAR_ACTIVACION)))
  // La red: la tarjeta de la Casa Central al pasar, y se entra.
  en(6.2, () => nodo("CC")?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })))
  en(8.8, () => nodo("CC")?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })))
  en(9.4, () => nodo("CC")?.click())
  // El taller: dos ventas, el depósito y un rack que pasa a crítico.
  en(16.5, () => guion.vender("CC", 2))
  en(18.6, () => guion.vender("CC", 1))
  en(20.4, () => porTestid("zona-deposito")?.click())
  en(21.8, () => guion.quiebre("CC", 3))
  // De vuelta a la red y la repetición del día.
  en(25.4, () => tecla("Escape"))
  en(26.2, () => tecla("Escape"))
  en(29.6, () => porTestid("velocidad-1200")?.click())
  en(30.0, () => porTestid("repetir")?.click())
  tl.set({}, {}, DURACION_VIDEO_FORJA)
  return tl
}
