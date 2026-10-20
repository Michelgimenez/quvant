/** Identificadores para lo que crea el visitante en la demo (estables dentro de la sesión, sin depender del render). */
let contador = 0
const sesion = Math.random().toString(36).slice(2, 7)

export function nuevoId(prefijo: string) {
  contador += 1
  return `${prefijo}-${sesion}-${contador}`
}
