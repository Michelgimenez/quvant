import type { ClienteDemo } from "./tipos"

/**
 * Ferremix · demo comercial (PROPUESTA). No es cliente activo: es el piloto
 * en negociación. Se muestra siempre como "Así se vería Yunque en Ferremix".
 *
 * Logos y colores: archivos de su nueva identidad en public/clientes/ferremix/.
 * Categorías, problemas y sucursales: van a salir del relevamiento y de su
 * sistema/sitio actual (todavía sin acceso). Hasta entonces, [COMPLETAR].
 */
export const FERREMIX: ClienteDemo = {
  slug: "ferremix",
  nombre: "Ferremix",
  rubro: "Ferretería industrial",
  color: "#FF5A1F",
  logo: "/clientes/ferremix/ferremix-logo.svg",
  logoNegativo: "/clientes/ferremix/ferremix-logo-negativo.svg",
  isotipo: "/clientes/ferremix/ferremix-isotipo.svg",
  categorias: ["[COMPLETAR: categorías reales de Ferremix, desde su sitio o su sistema]"],
  fuenteCategorias: "[COMPLETAR: confirmar con el relevamiento]",
  problemas: [
    { area: "Sistema de gestión", detalle: "[COMPLETAR: hallazgo del relevamiento del sistema]" },
    { area: "Precios y listas", detalle: "[COMPLETAR: cómo actualizan precios hoy y cuánto tardan]" },
    { area: "Stock y sucursales", detalle: "[COMPLETAR: cómo controlan el stock entre sucursales]" },
    { area: "Presupuestos y clientes", detalle: "[COMPLETAR: cómo arman y siguen presupuestos]" },
  ],
  sucursales: ["[COMPLETAR: sucursales]"],
  contacto: {
    nombre: "[COMPLETAR: nombre y apellido]",
    email: "[COMPLETAR: email]",
    telefono: "[COMPLETAR: teléfono]",
  },
}
