import "server-only"
import { mkdirSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"

/**
 * Base PostgreSQL local para el modo demo (sin Supabase): PGlite guardado en
 * `.data/base-local/` con el shim de Supabase y las mismas migraciones de
 * `supabase/migrations/`, aplicadas una sola vez cada una. Así las tablas, los
 * roles y las reglas de acceso son idénticos a producción.
 *
 * Una sola instancia por proceso (en globalThis): dos instancias sobre la misma
 * carpeta la corromperían. No sirve en plataformas sin disco persistente: en
 * producción se usa Supabase.
 */
const CARPETA = path.join(process.cwd(), ".data", "base-local")

type ConBase = typeof globalThis & { __yunqueBaseLocal?: Promise<PGlite> }

export function baseLocal(): Promise<PGlite> {
  const g = globalThis as ConBase
  g.__yunqueBaseLocal ??= abrir().catch((e) => {
    g.__yunqueBaseLocal = undefined
    throw e
  })
  return g.__yunqueBaseLocal
}

async function abrir() {
  mkdirSync(CARPETA, { recursive: true })
  const db = await PGlite.create(CARPETA)
  await db.exec(`create schema if not exists local;
    create table if not exists local.migraciones (archivo text primary key, aplicada_en timestamptz not null default now());`)
  const { rows } = await db.query<{ archivo: string }>("select archivo from local.migraciones")
  const hechas = new Set(rows.map((r) => r.archivo))
  const raiz = path.join(process.cwd(), "supabase")
  const pendientes = [
    { archivo: "local/shim-supabase.sql", ruta: path.join(raiz, "local", "shim-supabase.sql") },
    ...readdirSync(path.join(raiz, "migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => ({ archivo: `migrations/${f}`, ruta: path.join(raiz, "migrations", f) })),
  ].filter((m) => !hechas.has(m.archivo))
  for (const m of pendientes) {
    await db.transaction(async (tx) => {
      await tx.exec(readFileSync(m.ruta, "utf8"))
      await tx.query("insert into local.migraciones (archivo) values ($1)", [m.archivo])
    })
  }
  return db
}
