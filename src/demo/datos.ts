/**
 * La implementación "de la demo" del modelo de lectura: los datos de cada empresa ficticia.
 * - La ferretería sale del seed de la app, exportado con el mismo adaptador que usa la app
 *   (scripts/generar-snapshot-ferreteria.ts → src/demo/ferreteria-snapshot.json).
 * - El kiosco, la distribuidora y el grupo se generan con su semilla (el grupo, con 25.000 productos).
 * No hay ninguna lectura de la base: todo vive en el navegador.
 */
import type { DatosNegocio } from "@/dominio/negocio"
import type { IdEmpresa } from "./empresas"
import { generarEmpresa } from "./generar"
import ferreteria from "./ferreteria-snapshot.json"

export function datosEmpresa(id: IdEmpresa): DatosNegocio {
  if (id === "ferreteria") return ferreteria as DatosNegocio
  return generarEmpresa(id)
}
