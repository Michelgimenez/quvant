import { PGlite, type Transaction } from "@electric-sql/pglite"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

/**
 * Postgres real (PGlite, PostgreSQL 18 en WASM) con el shim de Supabase y
 * todas las migraciones de supabase/migrations aplicadas en orden.
 */
export async function crearBase() {
  const db = new PGlite()
  await db.exec(readFileSync(path.join(__dirname, "shim-supabase.sql"), "utf8"))
  const dir = path.join(process.cwd(), "supabase", "migrations")
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(path.join(dir, archivo), "utf8"))
    } catch (e) {
      throw new Error(`Falló la migración ${archivo}: ${(e as Error).message}`)
    }
  }
  return db
}

export type Sesion = { sub: string; aal?: "aal1" | "aal2" } | "anon" | "service_role"

/**
 * Ejecuta `fn` como lo haría PostgREST para ese usuario: rol de base de datos
 * + claims del JWT en request.jwt.claims. Todo dentro de una transacción que
 * se revierte al final (los tests no se contaminan entre sí).
 */
export async function como<T>(
  db: PGlite,
  sesion: Sesion,
  fn: (tx: Transaction) => Promise<T>,
  /** SQL a ejecutar como superusuario antes de cambiar de rol (se revierte al final). */
  preparar?: string,
  /** true: confirma la transacción en vez de revertirla (para pruebas en varios pasos). */
  confirmar = false,
): Promise<T> {
  let resultado: T
  let error: unknown
  await db
    .transaction(async (tx) => {
      if (preparar) await tx.exec(preparar)
      if (sesion === "anon") {
        await tx.exec("set local role anon")
        await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "anon" })])
      } else if (sesion === "service_role") {
        await tx.exec("set local role service_role")
        await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "service_role" })])
      } else {
        await tx.exec("set local role authenticated")
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: sesion.sub, role: "authenticated", aal: sesion.aal ?? "aal1" }),
        ])
      }
      try {
        resultado = await fn(tx)
      } catch (e) {
        error = e
      }
      if (!confirmar || error) await tx.rollback()
    })
    .catch(() => {})
  if (error) throw error
  return resultado!
}

/**
 * Ejecuta una consulta dentro de un savepoint y devuelve el mensaje de error
 * (o null si no falló). Así una consulta rechazada no aborta la transacción.
 */
export async function intentar(tx: Transaction, sql: string, params: unknown[] = []): Promise<string | null> {
  await tx.exec("savepoint intento")
  try {
    await tx.query(sql, params)
    await tx.exec("release savepoint intento")
    return null
  } catch (e) {
    await tx.exec("rollback to savepoint intento")
    return (e as Error).message
  }
}

export async function tablasPublicas(db: PGlite) {
  const r = await db.query<{ tablename: string }>(`select tablename from pg_tables where schemaname = 'public' order by 1`)
  return r.rows.map((x) => x.tablename)
}

export async function tablasConOrg(db: PGlite) {
  const r = await db.query<{ table_name: string }>(
    `select table_name from information_schema.columns
     where table_schema = 'public' and column_name = 'org_id' order by 1`,
  )
  return r.rows.map((x) => x.table_name)
}
