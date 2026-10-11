/**
 * Flechas, Inicio y Fin para moverse entre los botones de un grupo (los nodos
 * de la red, la barra de zonas del taller). Tab sigue funcionando igual.
 */
export function moverConFlechas(e: React.KeyboardEvent<HTMLElement>) {
  const paso: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  if (!(e.key in paso) && e.key !== "Home" && e.key !== "End") return
  const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")]
  const i = botones.indexOf(document.activeElement as HTMLButtonElement)
  if (i < 0 || !botones.length) return
  e.preventDefault()
  const siguiente = e.key === "Home" ? 0 : e.key === "End" ? botones.length - 1 : (i + paso[e.key] + botones.length) % botones.length
  botones[siguiente].focus()
}
