import type { PGlite } from "@electric-sql/pglite"

/**
 * Solicitudes de "Pedir una demo" sobre PostgreSQL (tabla public.solicitudes_demo).
 * Sin dependencias de Next: lo usan la base local de desarrollo y los tests.
 * Se respetan los mismos roles que en Supabase: el sitio inserta como `anon`,
 * el panel lee y marca como `service_role`.
 */
export type NuevaSolicitud = {
  nombre: string
  negocio: string
  rubro: string
  sucursales: number
  sistema_actual: string
  whatsapp: string
  socio_fundador: boolean
  origen: "sitio" | "socios" | "demo"
}

export type Solicitud = NuevaSolicitud & { id: string; creada_en: string; contactada_en: string | null }

type Base = Pick<PGlite, "transaction">

export async function insertarSolicitud(db: Base, s: NuevaSolicitud) {
  await db.transaction(async (tx) => {
    await tx.exec("set local role anon")
    await tx.query(
      `insert into public.solicitudes_demo (nombre, negocio, rubro, sucursales, sistema_actual, whatsapp, socio_fundador, origen)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [s.nombre, s.negocio, s.rubro, s.sucursales, s.sistema_actual, s.whatsapp, s.socio_fundador, s.origen],
    )
  })
}

export async function listarSolicitudes(db: Base, limite = 200): Promise<Solicitud[]> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role service_role")
    const { rows } = await tx.query<Solicitud>(
      `select id, nombre, negocio, rubro, sucursales, sistema_actual, whatsapp, socio_fundador, origen,
              to_json(creada_en) #>> '{}' as creada_en, to_json(contactada_en) #>> '{}' as contactada_en
         from public.solicitudes_demo
        order by (contactada_en is null) desc, creada_en desc
        limit $1`,
      [limite],
    )
    return rows
  })
}

export async function marcarSolicitud(db: Base, id: string, contactada: boolean) {
  await db.transaction(async (tx) => {
    await tx.exec("set local role service_role")
    await tx.query(`update public.solicitudes_demo set contactada_en = case when $2 then now() else null end where id = $1`, [id, contactada])
  })
}
