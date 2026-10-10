/**
 * Une clases condicionales sin fusionar utilidades de Tailwind.
 * Para componentes del sitio público: evita cargar la librería de `cn` (~40 KB).
 */
export function unir(...clases: (string | false | null | undefined)[]) {
  return clases.filter(Boolean).join(" ")
}
