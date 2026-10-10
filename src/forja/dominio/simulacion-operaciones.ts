import { listaDefault } from "@/dominio/estado"
import type { EstadoEmpresa } from "@/dominio/estado"
import { tienePermiso, type Permiso } from "@/dominio/permisos"
import type { Id, MedioPago, Usuario } from "@/dominio/tipos"
import { itemDesdeProducto, totalItems } from "@/dominio/ventas"
import { PREFIJO_DISPOSITIVO_SIMULADO, type Operacion, type UsuarioContexto } from "@/sync/tipos"
import type { IntencionSimulada } from "./simulador"

/**
 * Convierte una intención del simulador en una operación real de Yunque, con
 * un autor verosímil (quien la haría en esa sucursal). Pasa por el mismo motor
 * y las mismas reglas que una operación hecha a mano: si una regla la rechaza,
 * se descarta.
 */
export const DISPOSITIVO_SIMULADOR = `${PREFIJO_DISPOSITIVO_SIMULADO}-forja`

function autorPara(e: EstadoEmpresa, permiso: Permiso, sucursalId: Id | null, roles: Usuario["rol"][]): Usuario | null {
  const puede = (u: Usuario) => u.activo && tienePermiso(u.rol, permiso, u.permisosExtra) && (sucursalId === null || u.sucursalIds === null || u.sucursalIds.includes(sucursalId))
  for (const rol of roles) {
    const u = e.usuarios.find((x) => x.rol === rol && puede(x))
    if (u) return u
  }
  return e.usuarios.find(puede) ?? null
}

const contexto = (u: Usuario): UsuarioContexto => ({ id: u.id, rol: u.rol, sucursalIds: u.sucursalIds, permisosExtra: u.permisosExtra })

const MEDIOS: MedioPago[] = ["efectivo", "debito", "mercadopago", "transferencia"]

export function operacionSimulada(e: EstadoEmpresa, intencion: IntencionSimulada, ahora: Date, uuid: () => Id, n: number): { op: Operacion; autor: UsuarioContexto } | null {
  const base = (usuario: Usuario, sucursalId: Id | null) => ({ id: uuid(), orgId: e.org.id, usuarioId: usuario.id, sucursalId, creadaEn: ahora.toISOString(), dispositivo: DISPOSITIVO_SIMULADOR, sinConexion: false })

  switch (intencion.tipo) {
    case "venta": {
      const s = e.sucursales.find((x) => x.id === intencion.sucursalId)
      const u = autorPara(e, "mostrador.vender", intencion.sucursalId, ["mostrador", "administracion", "dueno"])
      if (!s || !u) return null
      const lista = listaDefault(e)
      const items = intencion.items.flatMap((i) => (e.productos[i.productoId] ? [itemDesdeProducto(e, e.productos[i.productoId], lista.id, i.cantidad)] : []))
      if (!items.length) return null
      const op = {
        ...base(u, s.id),
        tipo: "venta.crear" as const,
        datos: {
          venta: {
            id: uuid(),
            sucursalId: s.id,
            puesto: intencion.puesto,
            numeroLocal: `${s.codigo}${intencion.puesto}-S${String(n).padStart(4, "0")}`,
            fecha: ahora.toISOString(),
            clienteId: null,
            listaId: lista.id,
            items,
            pagos: [{ medio: MEDIOS[n % MEDIOS.length], importe: totalItems(items) }],
            entrega: null,
          },
        },
      }
      return { op: op as Operacion, autor: contexto(u) }
    }
    case "despacho": {
      const u = autorPara(e, "stock.transferir", intencion.desdeId, ["deposito", "administracion", "dueno"])
      if (!u) return null
      const op = {
        ...base(u, intencion.desdeId),
        tipo: "transferencia.despachar" as const,
        datos: { transferenciaId: uuid(), desdeId: intencion.desdeId, haciaId: intencion.haciaId, items: intencion.items, motivo: "Reposición de stock crítico", llegadaEstimada: new Date(ahora.getTime() + intencion.minutos * 60_000).toISOString() },
      }
      return { op: op as Operacion, autor: contexto(u) }
    }
    case "recepcion": {
      const t = e.transferencias[intencion.transferenciaId]
      if (!t) return null
      const u = autorPara(e, "stock.transferir", t.haciaId, ["deposito", "administracion", "dueno"])
      if (!u) return null
      const op = { ...base(u, t.haciaId), tipo: "transferencia.recibir" as const, datos: { transferenciaId: t.id } }
      return { op: op as Operacion, autor: contexto(u) }
    }
    case "servicio": {
      const o = e.servicio[intencion.ordenId]
      if (!o) return null
      const u = autorPara(e, "servicio.editar", o.sucursalId, ["tecnico", "mostrador", "administracion", "dueno"])
      if (!u) return null
      // Para pedir aprobación hace falta el presupuesto de reparación (regla de Yunque)
      const presupuesto = intencion.estado === "esperando_aprobacion" && !o.presupuestoReparacion ? { presupuestoReparacion: 4_500_000 + (n % 7) * 850_000, diagnostico: "Diagnóstico simulado" } : {}
      const op = { ...base(u, o.sucursalId), tipo: "servicio.estado" as const, datos: { ordenId: o.id, estado: intencion.estado, nota: "Actualización simulada", avisar: false, ...presupuesto } }
      return { op: op as Operacion, autor: contexto(u) }
    }
  }
}
