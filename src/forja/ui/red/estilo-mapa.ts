import type { Map as MapaLibre } from "maplibre-gl"

/** Estilo oscuro gratuito de CARTO (dark-matter), con su atribución visible. */
export const ESTILO_CARTO = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"

/**
 * Tiñe el estilo al negro y blanco de Quvant: el fondo es el negro de la marca y todo lo demás, su escala de
 * grises, sin colores. Las calles quedan como líneas finas; los nombres, apagados; los puntos de interés,
 * ocultos (ruido).
 */
export function teñirMapa(mapa: MapaLibre) {
  const estilo = mapa.getStyle()
  for (const capa of estilo.layers ?? []) {
    const id = capa.id
    try {
      if (capa.type === "background") mapa.setPaintProperty(id, "background-color", "#0d0d0f")
      else if (capa.type === "fill") {
        if (/water/.test(id)) mapa.setPaintProperty(id, "fill-color", "#08080a")
        else if (/building/.test(id)) {
          mapa.setPaintProperty(id, "fill-color", "#141416")
          mapa.setPaintProperty(id, "fill-opacity", 0.55)
        } else {
          mapa.setPaintProperty(id, "fill-color", "#111113")
          mapa.setPaintProperty(id, "fill-opacity", 0.5)
        }
      } else if (capa.type === "line") {
        if (/water/.test(id)) mapa.setPaintProperty(id, "line-color", "#0a0a0c")
        else if (/boundary/.test(id)) {
          mapa.setPaintProperty(id, "line-color", "#2e2e33")
          mapa.setPaintProperty(id, "line-opacity", 0.5)
        } else if (/case/.test(id)) mapa.setPaintProperty(id, "line-color", "#0d0d0f")
        else if (/(mot|trunk|pri)/.test(id)) mapa.setPaintProperty(id, "line-color", "#2e2e33")
        else if (/rail/.test(id)) mapa.setPaintProperty(id, "line-color", "#1c1c1f")
        else mapa.setPaintProperty(id, "line-color", "#1c1c1f")
      } else if (capa.type === "symbol") {
        if (/poi|housenumber|aeroway/.test(id)) mapa.setLayoutProperty(id, "visibility", "none")
        else {
          mapa.setPaintProperty(id, "text-color", /place_(city|capital|state|country)/.test(id) ? "#6e6e75" : "#3a3a40")
          mapa.setPaintProperty(id, "text-halo-color", "#0d0d0f")
          mapa.setPaintProperty(id, "text-opacity", 0.85)
        }
      }
    } catch {
      /* propiedad que esa capa no tiene: se deja como está */
    }
  }
}
