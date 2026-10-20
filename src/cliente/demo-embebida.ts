"use client"

import { generarEmpresaDemo, type OpcionesDemo } from "@/datos/demo/generar"
import type { EstadoEmpresa } from "@/dominio/estado"
import { AlmacenMemoria, AlmacenServidorMemoria } from "@/sync/almacen"
import { MotorSync } from "@/sync/motor"
import { ServidorDemo } from "@/sync/servidor-demo"
import type { Sesion } from "@/lib/auth/tipos"
import type { UsuarioContexto } from "@/sync/tipos"

/**
 * Demo embebida para el sitio, la presentación y la demo comercial: el MISMO
 * motor de sincronización y el mismo reductor que la app, pero todo en memoria
 * (no toca IndexedDB) y con una "red" que se corta con un interruptor.
 */
export type DemoEmbebida = {
  motor: MotorSync
  servidor: ServidorDemo
  setRed: (hay: boolean) => void
  hayRed: () => boolean
  semilla: EstadoEmpresa
  usuario: UsuarioContexto
}

export async function crearDemoEmbebida(opciones: OpcionesDemo & { email?: string; latenciaMs?: number } = {}): Promise<DemoEmbebida> {
  const semilla = generarEmpresaDemo({ dias: 14, ...opciones })
  let red = true
  const hayRed = () => red
  const servidor = new ServidorDemo({
    semilla: () => structuredClone(semilla),
    almacen: new AlmacenServidorMemoria(),
    latenciaMs: opciones.latenciaMs ?? 220,
    disponible: hayRed,
  })
  const u = semilla.usuarios.find((x) => x.email === (opciones.email ?? "mostrador@demo.quvant.app")) ?? semilla.usuarios[0]
  const usuario: UsuarioContexto = { id: u.id, rol: u.rol, sucursalIds: u.sucursalIds }
  const motor = await new MotorSync({
    almacen: new AlmacenMemoria(),
    servidor,
    semilla: () => structuredClone(semilla),
    usuario,
    hayRed,
    demoraSyncMs: 120,
  }).iniciar()
  return {
    motor,
    servidor,
    semilla,
    usuario,
    hayRed,
    setRed: (hay) => {
      red = hay
      motor.redCambio()
    },
  }
}

/** Sesión ficticia para montar pantallas reales de la app sobre una demo embebida. */
export function sesionDemo(demo: DemoEmbebida): Sesion {
  const u = demo.semilla.usuarios.find((x) => x.id === demo.usuario.id)!
  return { sub: u.id, org: u.orgId, rol: u.rol, nombre: u.nombre, email: u.email, sucursales: u.sucursalIds, aal: "aal2", modo: "demo", exp: 2_000_000_000 }
}
