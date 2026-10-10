"use client"

/**
 * Estado de la red para el motor: navigator.onLine + "corte simulado".
 * El corte simulado sirve para mostrar el modo sin conexión en una demo sin
 * desenchufar nada; se recuerda durante la pestaña (sessionStorage).
 */
const CLAVE = "yunque:corte-simulado"
const oyentes = new Set<() => void>()

let corte = leer()

function leer() {
  try {
    return typeof window !== "undefined" && sessionStorage.getItem(CLAVE) === "1"
  } catch {
    return false
  }
}

export function corteSimulado() {
  return corte
}

export function setCorteSimulado(valor: boolean) {
  corte = valor
  try {
    if (valor) sessionStorage.setItem(CLAVE, "1")
    else sessionStorage.removeItem(CLAVE)
  } catch {
    /* sin almacenamiento: queda en memoria */
  }
  oyentes.forEach((f) => f())
}

export function hayRed() {
  if (corte) return false
  return typeof navigator === "undefined" ? true : navigator.onLine
}

/** Escucha cambios de red reales (online/offline) y del corte simulado. */
export function escucharRed(fn: () => void) {
  oyentes.add(fn)
  window.addEventListener("online", fn)
  window.addEventListener("offline", fn)
  return () => {
    oyentes.delete(fn)
    window.removeEventListener("online", fn)
    window.removeEventListener("offline", fn)
  }
}
