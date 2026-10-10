"use client"

import { generarEmpresaDemo } from "@/datos/demo/generar"
import { claveDia, diaART } from "@/datos/demo/tiempo"
import type { Sesion } from "@/lib/auth/tipos"
import { AlmacenIndexedDB, AlmacenServidorIndexedDB, baseLocal } from "@/sync/almacen-indexeddb"
import { MotorSync } from "@/sync/motor"
import { ServidorDemo } from "@/sync/servidor-demo"
import { hayRed } from "./red"

/**
 * Arma el motor en MODO DEMO: la empresa demo se genera en el navegador
 * (determinística por día) y el "servidor" es emulado y persiste en IndexedDB.
 * Si cambió el día, la demo se renueva con datos de hoy.
 */
export async function crearMotorDemo(sesion: Sesion) {
  const db = baseLocal(sesion.org)
  const almacen = new AlmacenIndexedDB(db)
  const almacenServidor = new AlmacenServidorIndexedDB(db)

  let semillaISO = await almacen.leerMeta<string>("semillaAhora")
  let renovada = false
  const hoy = claveDia(diaART(new Date()))
  if (!semillaISO || claveDia(diaART(new Date(semillaISO))) !== hoy) {
    if (semillaISO) {
      await almacen.vaciar()
      await almacenServidor.vaciar()
      renovada = true
    }
    semillaISO = new Date().toISOString()
    await almacen.escribirMeta("semillaAhora", semillaISO)
  }

  const base = generarEmpresaDemo({ ahora: new Date(semillaISO) })
  // El servidor necesita su propia copia intacta (el motor modifica la suya).
  let copiaServidor: ReturnType<typeof generarEmpresaDemo> | null = structuredClone(base)
  let copiaMotor: ReturnType<typeof generarEmpresaDemo> | null = base
  const servidor = new ServidorDemo({
    semilla: () => {
      const s = copiaServidor ?? generarEmpresaDemo({ ahora: new Date(semillaISO!) })
      copiaServidor = null
      return s
    },
    almacen: almacenServidor,
    latenciaMs: 150,
    disponible: hayRed,
  })
  const motor = await new MotorSync({
    almacen,
    servidor,
    semilla: () => {
      const s = copiaMotor ?? generarEmpresaDemo({ ahora: new Date(semillaISO!) })
      copiaMotor = null
      return s
    },
    usuario: { id: sesion.sub, rol: sesion.rol, sucursalIds: sesion.sucursales },
    hayRed,
  }).iniciar()

  return { motor, servidor, renovada }
}

/** Borra todos los datos locales de la demo (réplica, cola y servidor emulado). */
export async function reiniciarDemo(orgId: string) {
  const db = baseLocal(orgId)
  await new AlmacenIndexedDB(db).vaciar()
  await new AlmacenServidorIndexedDB(db).vaciar()
}
