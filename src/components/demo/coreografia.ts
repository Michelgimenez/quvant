"use client"

import gsap from "gsap"
import { Flip } from "gsap/Flip"
import { arcoDeSalto, fasesDelSalto, largoRecorrido, puntoEnArco, trazoDeArco } from "@/components/marca/salto-geometria"
import { formatear } from "@/components/negocio/piezas"
import type { IdEmpresa } from "@/demo/empresas"

gsap.registerPlugin(Flip)

/**
 * El cambio de empresa (el momento estrella): una sola línea de tiempo de GSAP de ~1,4 s.
 *  1. El salto: el punto sale de la tarjeta de la empresa actual, traza el arco punteado y cae en la nueva.
 *     Si el selector está cerrado, primero se abre y el salto ocurre ahí.
 *  2. Los logos: el de la empresa actual vuelve a su tarjeta; el de la nueva sale de la suya y se instala.
 *  3. El barrido: un círculo (clip-path) que nace donde cayó el punto revela el estado nuevo sobre una foto del
 *     viejo. Lo que sale queda montado en la foto (y se apaga) hasta que el barrido termina.
 *  4. La barra lateral se reorganiza con Flip: lo que queda se reacomoda y lo nuevo entra.
 *  5. Los números ruedan de los valores viejos a los nuevos.
 *  6. Las tarjetas del tablero cambian de lugar (solo transform y opacity).
 * Solo transform, opacity y clip-path. Se arma todo dentro de la línea de tiempo, así la filmación
 * (que mueve el reloj global de GSAP) lo reproduce cuadro por cuadro.
 */

export type OpcionesCambio = {
  /** El contenedor de la app de la demo (barra + selector + escena). */
  raiz: HTMLElement
  /** La escena de la empresa (barra lateral + contenido): la que se barre. */
  escena: HTMLElement
  desde: IdEmpresa
  hacia: IdEmpresa
  selectorAbierto: boolean
  abrirSelector: () => void
  cerrarSelector: () => void
  /** Cambia la empresa en React de forma síncrona (flushSync). */
  aplicarCambio: () => void
}

const centro = (el: Element | null) => {
  const r = el?.getBoundingClientRect()
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: 80 }
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  return el
}

/** Capa fija con el salto: el aro hueco donde estaba el punto, el arco punteado y el cuadrado. */
function capaDelSalto(desde: { x: number; y: number }, hasta: { x: number; y: number }) {
  const capa = svg("svg", { width: innerWidth, height: innerHeight, viewBox: `0 0 ${innerWidth} ${innerHeight}` })
  Object.assign(capa.style, { position: "fixed", inset: "0", zIndex: "80", pointerEvents: "none", overflow: "visible" })
  // Entre tarjetas lejanas el arco no sube más de ~70 px: es un salto, no un vuelo.
  const distancia = Math.hypot(hasta.x - desde.x, hasta.y - desde.y) || 1
  const arco = arcoDeSalto(desde, hasta, Math.min(0.42, 70 / distancia))
  const d = trazoDeArco(arco)
  const id = `mascara-salto-${Date.now()}`
  const mascara = svg("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: innerWidth, height: innerHeight })
  const trazoMascara = svg("path", { d, fill: "none", stroke: "white", "stroke-width": 8, pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 })
  mascara.append(trazoMascara)
  const punteado = svg("path", { d, fill: "none", stroke: "#ececee", "stroke-opacity": 0.85, "stroke-width": 1.8, "stroke-linecap": "round", "stroke-dasharray": "0 6", mask: `url(#${id})` })
  const aro = svg("circle", { cx: desde.x, cy: desde.y, r: 5.5, fill: "none", stroke: "#9c9ca3", "stroke-width": 1.5, opacity: 0 })
  const lado = 10
  const cuadrado = svg("rect", { x: -lado / 2, y: -lado / 2, width: lado, height: lado, fill: "#ececee", opacity: 0 })
  capa.append(mascara, aro, punteado, cuadrado)
  document.body.append(capa)
  const dibujar = (p: number) => {
    const { despegue, vuelo } = fasesDelSalto(p)
    aro.setAttribute("opacity", String(despegue))
    trazoMascara.setAttribute("stroke-dashoffset", String(1 - largoRecorrido(arco, vuelo)))
    const c = puntoEnArco(arco, vuelo)
    cuadrado.setAttribute("transform", `translate(${c.x} ${c.y})`)
    cuadrado.setAttribute("opacity", p > 0.12 ? "1" : "0")
  }
  dibujar(0)
  return { capa, dibujar }
}

/** Un clon fijo de un elemento, en su lugar de la pantalla (para que vuele con Flip.fit). */
function clonFijo(el: Element) {
  const r = el.getBoundingClientRect()
  const c = el.cloneNode(true) as HTMLElement
  Object.assign(c.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: "0", zIndex: "85", pointerEvents: "none" })
  document.body.append(c)
  return c
}

export function cambiarEmpresa(o: OpcionesCambio): Promise<void> {
  return new Promise((listo) => {
    const tl = gsap.timeline({ onComplete: () => listo(), defaults: { ease: "power3.inOut" } })
    let capa: ReturnType<typeof capaDelSalto> | null = null
    let foto: HTMLElement | null = null
    const limpiar: (() => void)[] = []
    const estadoSalto = { p: 0 }

    // 0 · Si el selector está cerrado, se abre (el salto ocurre ahí).
    if (!o.selectorAbierto) {
      tl.add(() => o.abrirSelector())
      tl.to({}, { duration: 0.27 })
    }

    // 1 · El salto entre las tarjetas.
    tl.add(() => {
      const a = centro(o.raiz.querySelector(`[data-punto-empresa="${o.desde}"]`))
      const b = centro(o.raiz.querySelector(`[data-punto-empresa="${o.hacia}"]`))
      capa = capaDelSalto(a, b)
      limpiar.push(() => capa?.capa.remove())
    })
    tl.to(estadoSalto, { p: 1, duration: 0.48, ease: "none", onUpdate: () => capa?.dibujar(estadoSalto.p) })

    // 2 a 6 · En el momento en que el punto cae: foto del estado viejo, cambio en React y todo lo que se mueve.
    tl.add(() => {
      const t0 = tl.time()
      const escena = o.escena
      const marco = escena.parentElement!
      const rEscena = escena.getBoundingClientRect()
      const caida = centro(o.raiz.querySelector(`[data-punto-empresa="${o.hacia}"]`))

      // La foto del estado viejo, debajo de la escena viva.
      foto = escena.cloneNode(true) as HTMLElement
      foto.removeAttribute("data-escena-empresa")
      Object.assign(foto.style, { position: "absolute", left: "0", top: "0", width: `${rEscena.width}px`, height: `${rEscena.height}px`, zIndex: "0", pointerEvents: "none" })
      foto.querySelectorAll("main").forEach((m, i) => (m.scrollTop = escena.querySelectorAll("main")[i]?.scrollTop ?? 0))
      marco.prepend(foto)
      limpiar.push(() => foto?.remove())

      // Lo que hay antes del cambio: la barra lateral (Flip), las tarjetas y los números.
      const navViejo = Flip.getState(escena.querySelectorAll("[data-lateral] [data-flip-id^='nav-']"))
      const idsNavViejo = new Set([...escena.querySelectorAll("[data-lateral] [data-flip-id^='nav-']")].map((e) => e.getAttribute("data-flip-id")))
      const tarjetasViejas = new Map([...escena.querySelectorAll("[data-flip-id^='t-']")].map((e) => [e.getAttribute("data-flip-id"), e.getBoundingClientRect()]))
      const numerosViejos = new Map([...escena.querySelectorAll("[data-numero][data-flip-id]")].map((e) => [e.getAttribute("data-flip-id"), Number(e.getAttribute("data-numero"))]))
      const logoViejo = o.raiz.querySelector("[data-hueco-logo-lateral] svg")
      const vueloViejo = logoViejo ? clonFijo(logoViejo) : null
      if (vueloViejo) limpiar.push(() => vueloViejo.remove())

      // El cambio, síncrono.
      o.aplicarCambio()
      Object.assign(escena.style, { position: "relative", zIndex: "1" })

      // 3 · El barrido circular desde la caída.
      const cx = caida.x - rEscena.left
      const cy = caida.y - rEscena.top
      const radio = Math.hypot(Math.max(cx, rEscena.width - cx), Math.max(cy, rEscena.height - cy)) + 40
      tl.fromTo(escena, { clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${radio}px at ${cx}px ${cy}px)`, duration: 0.7, ease: "power2.inOut", clearProps: "clipPath" }, t0)
      // En la foto, lo que no sigue en la empresa nueva se apaga mientras pasa el barrido.
      const idsNavNuevo = new Set([...escena.querySelectorAll("[data-lateral] [data-flip-id^='nav-']")].map((e) => e.getAttribute("data-flip-id")))
      const salientes = [...(foto?.querySelectorAll("[data-lateral] [data-flip-id^='nav-']") ?? [])].filter((e) => !idsNavNuevo.has(e.getAttribute("data-flip-id")))
      tl.to(salientes, { opacity: 0, x: -8, duration: 0.3, ease: "power2.in", stagger: 0.02 }, t0)

      // 4 · La barra lateral con Flip: lo que queda se reacomoda, lo nuevo entra.
      const navNuevo = escena.querySelectorAll("[data-lateral] [data-flip-id^='nav-']")
      tl.add(
        Flip.from(navViejo, {
          targets: navNuevo,
          duration: 0.6,
          ease: "power3.inOut",
          scale: true,
          onEnter: (entrantes) => gsap.fromTo(entrantes, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.42, delay: 0.22, stagger: 0.03, ease: "power2.out" }),
        }),
        t0,
      )
      void idsNavViejo

      // 2 · Los logos: el nuevo sale de su tarjeta y se instala; el viejo vuelve a la suya.
      const logoNuevo = o.raiz.querySelector("[data-hueco-logo-lateral] svg")
      const tarjetaNueva = o.raiz.querySelector(`[data-hueco-logo="${o.hacia}"] svg`)
      const tarjetaVieja = o.raiz.querySelector(`[data-hueco-logo="${o.desde}"] svg`)
      if (logoNuevo && tarjetaNueva) {
        const vuelo = clonFijo(tarjetaNueva)
        limpiar.push(() => vuelo.remove())
        gsap.set(logoNuevo, { opacity: 0 })
        tl.add(Flip.fit(vuelo, logoNuevo, { duration: 0.62, ease: "power3.inOut", scale: true }) as gsap.core.Tween, t0 + 0.04)
        tl.set(logoNuevo, { opacity: 1 }, t0 + 0.66)
        tl.set(vuelo, { opacity: 0 }, t0 + 0.66)
      }
      if (vueloViejo && tarjetaVieja) tl.add(Flip.fit(vueloViejo, tarjetaVieja, { duration: 0.55, ease: "power3.inOut", scale: true }) as gsap.core.Tween, t0)
      if (vueloViejo) tl.to(vueloViejo, { opacity: 0, duration: 0.12 }, t0 + 0.55)

      // 6 · Las tarjetas: las que existen en las dos empresas viajan de su lugar viejo al nuevo; las demás entran.
      escena.querySelectorAll<HTMLElement>("[data-flip-id^='t-']").forEach((el, i) => {
        const vieja = tarjetasViejas.get(el.getAttribute("data-flip-id"))
        const nueva = el.getBoundingClientRect()
        if (vieja) tl.fromTo(el, { x: vieja.left - nueva.left, y: vieja.top - nueva.top, opacity: 0.4 }, { x: 0, y: 0, opacity: 1, duration: 0.72, ease: "power3.inOut", clearProps: "transform,opacity" }, t0)
        else tl.fromTo(el, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", clearProps: "transform,opacity" }, t0 + 0.12 + Math.min(i, 10) * 0.025)
      })

      // 5 · Los números ruedan de los valores viejos a los nuevos (los que no existían, desde cero).
      escena.querySelectorAll<HTMLElement>("[data-numero]").forEach((el) => {
        const destino = Number(el.getAttribute("data-numero"))
        const formato = (el.getAttribute("data-formato") ?? "pesos") as Parameters<typeof formatear>[1]
        const origen = numerosViejos.get(el.getAttribute("data-flip-id")) ?? 0
        const contador = { v: origen }
        tl.to(contador, { v: destino, duration: 0.9, ease: "power3.out", onUpdate: () => void (el.textContent = formatear(contador.v, formato)), onComplete: () => void (el.textContent = formatear(destino, formato)) }, t0 + 0.05)
      })

      // Se cierra el selector cuando el barrido ya avanzó, y al final se limpia.
      tl.add(() => o.cerrarSelector(), t0 + 0.42)
      tl.add(() => {
        limpiar.forEach((f) => f())
        Object.assign(o.escena.style, { position: "", zIndex: "" })
      }, t0 + 0.9)
    })
  })
}
