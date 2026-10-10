import { FERREMIX } from "./ferremix"
import type { ClienteDemo } from "./tipos"

export type { ClienteDemo } from "./tipos"

/** Prospectos con demo comercial. La clave es el slug de la URL. */
export const CLIENTES: Record<string, ClienteDemo> = {
  [FERREMIX.slug]: FERREMIX,
}

export function clienteDemo(slug: string): ClienteDemo | null {
  return Object.hasOwn(CLIENTES, slug) ? CLIENTES[slug] : null
}
