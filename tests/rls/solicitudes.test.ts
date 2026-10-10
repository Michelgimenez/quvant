import type { PGlite } from "@electric-sql/pglite"
import { beforeAll, describe, expect, it } from "vitest"
import { insertarSolicitud, listarSolicitudes, marcarSolicitud, type NuevaSolicitud } from "@/lib/solicitudes/postgres"
import { crearBase } from "./base"

/** Lo que usan el formulario del sitio y el panel, sobre el esquema real. */
let db: PGlite
beforeAll(async () => {
  db = await crearBase()
}, 60_000)

const nueva = (nombre: string): NuevaSolicitud => ({
  nombre,
  negocio: "Ferretería de Prueba",
  rubro: "Ferretería industrial",
  sucursales: 2,
  sistema_actual: "Planillas",
  whatsapp: "+54 9 11 0000-0000",
  socio_fundador: false,
  origen: "sitio",
})

describe("solicitudes de demo", () => {
  it("el sitio guarda como anon y el panel la lista como nueva", async () => {
    await insertarSolicitud(db, nueva("Ana Prueba"))
    const lista = await listarSolicitudes(db)
    const ana = lista.find((s) => s.nombre === "Ana Prueba")!
    expect(ana).toBeDefined()
    expect(ana.contactada_en).toBeNull()
    expect(new Date(ana.creada_en).getTime()).toBeGreaterThan(Date.now() - 60_000)
  })

  it("marcar como contactada y volver a nueva; las nuevas van primero", async () => {
    await insertarSolicitud(db, nueva("Beto Prueba"))
    const beto = (await listarSolicitudes(db)).find((s) => s.nombre === "Beto Prueba")!
    await marcarSolicitud(db, beto.id, true)
    let lista = await listarSolicitudes(db)
    expect(lista.find((s) => s.id === beto.id)!.contactada_en).not.toBeNull()
    expect(lista.at(-1)!.id).toBe(beto.id) // las contactadas quedan al final
    await marcarSolicitud(db, beto.id, false)
    lista = await listarSolicitudes(db)
    expect(lista.find((s) => s.id === beto.id)!.contactada_en).toBeNull()
  })

  it("datos inválidos se rechazan en la base", async () => {
    await expect(insertarSolicitud(db, { ...nueva("A"), whatsapp: "abc" })).rejects.toThrow()
  })
})
