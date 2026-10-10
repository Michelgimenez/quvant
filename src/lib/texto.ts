/** Normaliza para búsquedas: minúsculas y sin tildes ("Amoladora" ≈ "amolÁdora"). */
export function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

/** ¿Todas las palabras de la búsqueda aparecen en el texto? */
export function coincide(texto: string, busqueda: string) {
  const t = normalizar(texto)
  return normalizar(busqueda)
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => t.includes(p))
}

export function plural(n: number, singular: string, pluralTexto = `${singular}s`) {
  return `${n.toLocaleString("es-AR")} ${n === 1 ? singular : pluralTexto}`
}
