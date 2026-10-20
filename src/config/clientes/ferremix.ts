import type { ClienteDemo } from "./tipos"

/**
 * Ferremix · demo comercial (PROPUESTA). No es cliente activo: es el piloto
 * en negociación. Se muestra siempre como "Así se vería Quvant en Ferremix".
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
  plazo: "[COMPLETAR: según sucursales y migración]",
  contacto: {
    nombre: "[COMPLETAR: nombre y apellido]",
    email: "[COMPLETAR: email]",
    telefono: "[COMPLETAR: teléfono]",
  },
  // Forja (PROPUESTA): Moreno es real; las otras tres son ubicaciones ilustrativas del oeste del conurbano, marcadas DEMO.
  forja: {
    sucursales: [
      // Geocodificada una vez (OpenStreetMap / Nominatim)
      { codigo: "CC", nombre: "Ferremix Moreno", direccion: "Av. Bartolomé Mitre 2322, Moreno, Buenos Aires", lat: -34.6508814, lng: -58.7834695, tipo: "sucursal", demo: false },
      { codigo: "NO", nombre: "Sucursal Merlo", direccion: "[COMPLETAR: dirección real]", lat: -34.6649, lng: -58.7286, tipo: "sucursal", demo: true },
      { codigo: "D2", nombre: "Sucursal General Rodríguez", direccion: "[COMPLETAR: dirección real]", lat: -34.6086, lng: -58.9512, tipo: "sucursal", demo: true, puestos: 2, ventasDia: 7 },
      { codigo: "DM", nombre: "Depósito Paso del Rey", direccion: "[COMPLETAR: dirección real]", lat: -34.6391, lng: -58.7563, tipo: "deposito", demo: true },
    ],
    pendiente: "[COMPLETAR con los negocios y sucursales reales del dueño]",
    embebibleEn: ["https://ferremix-propuesta.vercel.app", "http://localhost:*"],
    snapshot: () => import("@/demo/ferremix-snapshot.json").then((m) => m.default),
  },
}
