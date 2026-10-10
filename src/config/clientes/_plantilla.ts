import type { ClienteDemo } from "./tipos"

/**
 * Plantilla para un prospecto nuevo. Copiar como `<slug>.ts`, completar y
 * sumarlo a `CLIENTES` en `index.ts`. La demo queda en `/demo/<slug>`.
 * Mientras no tenga datos reales, dejar los [COMPLETAR]: se ven resaltados.
 */
export const PLANTILLA: ClienteDemo = {
  slug: "nuevo-prospecto",
  nombre: "[COMPLETAR: nombre del negocio]",
  rubro: "[COMPLETAR: rubro]",
  color: "#3B6EF5",
  logo: "/clientes/nuevo-prospecto/logo.svg",
  logoNegativo: "/clientes/nuevo-prospecto/logo-negativo.svg",
  categorias: ["[COMPLETAR: categorías]"],
  fuenteCategorias: "[COMPLETAR: de dónde salen]",
  problemas: [{ area: "[COMPLETAR: área]", detalle: "[COMPLETAR: problema detectado]" }],
  sucursales: ["[COMPLETAR: sucursales]"],
  plazo: "[COMPLETAR: plazo estimado]",
  contacto: { nombre: "[COMPLETAR]", email: "[COMPLETAR]", telefono: "[COMPLETAR]" },
}
