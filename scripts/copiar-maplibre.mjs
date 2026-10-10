// Copia el worker de MapLibre (módulo ES) a public/vendor/maplibre/ antes de dev y build.
// Turbopack no resuelve la URL del worker que arma MapLibre internamente; se sirve
// como archivo estático de la misma versión instalada (y queda dentro de la CSP: 'self').
import { copyFileSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"

const origen = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist")
const destino = path.join(process.cwd(), "public", "vendor", "maplibre")
mkdirSync(destino, { recursive: true })
for (const archivo of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(path.join(origen, archivo), path.join(destino, archivo))
const version = JSON.parse(readFileSync(path.join(process.cwd(), "node_modules", "maplibre-gl", "package.json"), "utf8")).version
console.log(`maplibre-gl ${version}: worker copiado a public/vendor/maplibre/`)
