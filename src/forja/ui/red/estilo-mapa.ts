import type { Map as MapaLibre } from "maplibre-gl"

/** Estilo oscuro gratuito de CARTO (dark-matter), con su atribución visible. */
export const ESTILO_CARTO = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"

/**
 * Tiñe el estilo a la paleta de Yunque: hormigón y grafito, sin colores
 * saturados en superficies. Las calles quedan como líneas finas; los nombres,
 * apagados; los puntos de interés, ocultos (ruido).
 */
export function teñirMapa(mapa: MapaLibre) {
  const estilo = mapa.getStyle()
  for (const capa of estilo.layers ?? []) {
    const id = capa.id
    try {
      if (capa.type === "background") mapa.setPaintProperty(id, "background-color", "#0b0e12")
      else if (capa.type === "fill") {
        if (/water/.test(id)) mapa.setPaintProperty(id, "fill-color", "#07090c")
        else if (/building/.test(id)) {
          mapa.setPaintProperty(id, "fill-color", "#151a21")
          mapa.setPaintProperty(id, "fill-opacity", 0.55)
        } else {
          mapa.setPaintProperty(id, "fill-color", "#10141a")
          mapa.setPaintProperty(id, "fill-opacity", 0.5)
        }
      } else if (capa.type === "line") {
        if (/water/.test(id)) mapa.setPaintProperty(id, "line-color", "#0a0d11")
        else if (/boundary/.test(id)) {
          mapa.setPaintProperty(id, "line-color", "#2a323c")
          mapa.setPaintProperty(id, "line-opacity", 0.5)
        } else if (/case/.test(id)) mapa.setPaintProperty(id, "line-color", "#0d1015")
        else if (/(mot|trunk|pri)/.test(id)) mapa.setPaintProperty(id, "line-color", "#2c343f")
        else if (/rail/.test(id)) mapa.setPaintProperty(id, "line-color", "#1d232b")
        else mapa.setPaintProperty(id, "line-color", "#1b2129")
      } else if (capa.type === "symbol") {
        if (/poi|housenumber|aeroway/.test(id)) mapa.setLayoutProperty(id, "visibility", "none")
        else {
          mapa.setPaintProperty(id, "text-color", /place_(city|capital|state|country)/.test(id) ? "#58616d" : "#3a424d")
          mapa.setPaintProperty(id, "text-halo-color", "#0b0e12")
          mapa.setPaintProperty(id, "text-opacity", 0.85)
        }
      }
    } catch {
      /* propiedad que esa capa no tiene: se deja como está */
    }
  }
}
