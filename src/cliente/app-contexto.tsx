"use client"

import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import type { EstadoEmpresa } from "@/dominio/estado"
import { tienePermiso, type Permiso } from "@/dominio/permisos"
import type { Id, Modulo, Usuario } from "@/dominio/tipos"
import type { Sesion } from "@/lib/auth/tipos"
import type { MotorSync } from "@/sync/motor"
import type { ServidorDemo } from "@/sync/servidor-demo"
import type { DatosOp, Resultado, TipoOp } from "@/sync/tipos"
import { crearMotorDemo } from "./motor-demo"
import { escucharRed } from "./red"
import { obtenerSesion } from "./sesion"

type ValorApp = {
  motor: MotorSync
  servidor: ServidorDemo | null
  sesion: Sesion
  usuario: Usuario
  version: number
  sucursalId: Id
  setSucursalId: (id: Id) => void
  sucursalesPermitidas: EstadoEmpresa["sucursales"]
  puede: (p: Permiso) => boolean
  moduloActivo: (m: Modulo) => boolean
  /** Ejecuta una operación con la sucursal activa por defecto. */
  ejecutar: <T extends TipoOp>(tipo: T, datos: DatosOp[T], sucursalId?: Id | null) => Promise<Resultado & { opId: Id }>
}

const Contexto = createContext<ValorApp | null>(null)

type Carga =
  | { fase: "cargando" }
  | { fase: "error"; mensaje: string }
  | { fase: "lista"; motor: MotorSync; servidor: ServidorDemo | null; sesion: Sesion; renovada: boolean }

export function useCargaApp() {
  const [carga, setCarga] = useState<Carga>({ fase: "cargando" })
  const router = useRouter()
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const r = await obtenerSesion()
      if (!r.sesion) {
        if (r.motivo === "sin_sesion") {
          router.replace(`/ingresar?siguiente=${encodeURIComponent(window.location.pathname)}`)
          return
        }
        setCarga({ fase: "error", mensaje: "Para el primer ingreso en este equipo hace falta conexión." })
        return
      }
      try {
        const { motor, servidor, renovada } = await crearMotorDemo(r.sesion)
        if (vivo) setCarga({ fase: "lista", motor, servidor, sesion: r.sesion, renovada })
      } catch (e) {
        console.error(e)
        if (vivo) setCarga({ fase: "error", mensaje: "No se pudo abrir la base local del navegador." })
      }
    })()
    return () => {
      vivo = false
    }
  }, [router])
  return carga
}

export function ProveedorApp({ motor, servidor, sesion, children }: { motor: MotorSync; servidor: ServidorDemo | null; sesion: Sesion; children: React.ReactNode }) {
  const version = useSyncExternalStore(
    useCallback((cb) => motor.suscribir(cb), [motor]),
    () => motor.version,
    () => motor.version,
  )

  // La red cambió (real o simulada) → intentar sincronizar
  useEffect(() => {
    const quitar = escucharRed(() => motor.redCambio())
    const intervalo = window.setInterval(() => void motor.sincronizar(), 20_000)
    const visible = () => document.visibilityState === "visible" && void motor.sincronizar()
    document.addEventListener("visibilitychange", visible)
    void motor.sincronizar()
    return () => {
      quitar()
      window.clearInterval(intervalo)
      document.removeEventListener("visibilitychange", visible)
    }
  }, [motor])

  const e = motor.estado
  const usuario = e.usuarios.find((u) => u.id === sesion.sub) ?? {
    id: sesion.sub,
    orgId: sesion.org,
    nombre: sesion.nombre,
    email: sesion.email,
    rol: sesion.rol,
    sucursalIds: sesion.sucursales,
    activo: true,
    dosFactor: sesion.aal === "aal2",
    ultimoIngreso: null,
  }
  const sucursalesPermitidas = useMemo(
    () => e.sucursales.filter((s) => usuario.sucursalIds === null || usuario.sucursalIds.includes(s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, usuario.sucursalIds],
  )

  const [sucursalId, setSucursalIdEstado] = useState<Id>(() => {
    try {
      const guardada = localStorage.getItem(`yunque:sucursal:${sesion.sub}`)
      if (guardada && sucursalesPermitidas.some((s) => s.id === guardada)) return guardada
    } catch {
      /* nada */
    }
    return sucursalesPermitidas[0]?.id ?? e.sucursales[0].id
  })
  const setSucursalId = useCallback(
    (id: Id) => {
      setSucursalIdEstado(id)
      try {
        localStorage.setItem(`yunque:sucursal:${sesion.sub}`, id)
      } catch {
        /* nada */
      }
    },
    [sesion.sub],
  )

  const valor = useMemo<ValorApp>(
    () => ({
      motor,
      servidor,
      sesion,
      usuario,
      version,
      sucursalId,
      setSucursalId,
      sucursalesPermitidas,
      puede: (p) => tienePermiso(usuario.rol, p),
      moduloActivo: (m) => motor.estado.org.modulos[m] !== false,
      ejecutar: (tipo, datos, suc) => motor.ejecutar(tipo, datos, { sucursalId: suc === undefined ? sucursalId : suc }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [motor, servidor, sesion, version, sucursalId, setSucursalId, sucursalesPermitidas, usuario.rol],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useApp() {
  const v = useContext(Contexto)
  if (!v) throw new Error("useApp fuera de ProveedorApp")
  return v
}

/** Estado de la empresa + versión (para usar en dependencias de useMemo). */
export function useDatos() {
  const { motor, version } = useApp()
  return { e: motor.estado, v: version }
}

/** Estado de conexión y cola, actualizado en vivo. */
export function useConexion() {
  const { motor } = useApp()
  const [, forzar] = useState(0)
  useEffect(() => motor.suscribir(() => forzar((n) => n + 1)), [motor])
  return {
    estado: motor.conexion,
    pendientes: motor.pendientes.length,
    ultimaSincronizacion: motor.ultimaSincronizacion,
    sincronizar: () => motor.sincronizar(),
  }
}
