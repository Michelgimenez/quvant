import type { Permiso } from "@/dominio/permisos"
import type { IdExtension } from "@/dominio/tipos"
import type { EstadoFeature } from "@/showcase/features"

/**
 * Registro de extensiones de Quvant. Una extensión suma pantallas sobre los
 * mismos datos (y las mismas reglas de acceso) sin tocar el núcleo:
 *
 *  1. su id en EXTENSIONES (src/dominio/tipos.ts) y en el check de
 *     `extensiones_org.extension` (migración SQL);
 *  2. su definición acá;
 *  3. sus permisos en src/dominio/permisos.ts y en `permisos_rol`;
 *  4. su código en src/<extension>/ y sus rutas bajo /app/<extension>.
 *
 * Ver docs/FORJA.md, "Cómo se agrega otra extensión".
 */
export type DefinicionExtension = {
  id: IdExtension
  nombre: string
  descripcion: string
  puntos: string[]
  ruta: string
  permisoVer: Permiso
  estado: EstadoFeature
}

export const REGISTRO_EXTENSIONES: DefinicionExtension[] = [
  {
    id: "forja",
    nombre: "Forja",
    descripcion: "Las sucursales conectadas como un taller vivo: ventas, stock, transferencias y reparaciones en tiempo real, sobre los mismos datos de Quvant.",
    puntos: ["Ver toda la red en el mapa", "Entrar a cada sucursal", "Reproducir el día"],
    ruta: "/app/forja",
    permisoVer: "forja.ver",
    estado: "demo",
  },
]

export function extension(id: IdExtension) {
  return REGISTRO_EXTENSIONES.find((x) => x.id === id)!
}
