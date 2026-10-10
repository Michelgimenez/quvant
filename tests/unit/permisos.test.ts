import { describe, expect, it } from "vitest"
import { PERMISOS, PERMISOS_POR_ROL, exige2FA, puedeAsignarRol, tienePermiso } from "@/dominio/permisos"
import { ROLES } from "@/dominio/tipos"

describe("roles y permisos", () => {
  it("dueño y administración tienen todo y exigen 2FA", () => {
    for (const p of PERMISOS) {
      expect(tienePermiso("dueno", p)).toBe(true)
      expect(tienePermiso("administracion", p)).toBe(true)
    }
    expect(exige2FA("dueno")).toBe(true)
    expect(exige2FA("administracion")).toBe(true)
    expect(exige2FA("mostrador")).toBe(false)
  })

  it("los permisos de cada rol existen en la lista", () => {
    for (const r of ROLES) for (const p of PERMISOS_POR_ROL[r]) expect(PERMISOS).toContain(p)
  })

  it("el mostrador no ve costos ni cambia precios; el técnico no vende", () => {
    expect(tienePermiso("mostrador", "costos.ver")).toBe(false)
    expect(tienePermiso("mostrador", "precios.editar")).toBe(false)
    expect(tienePermiso("tecnico", "mostrador.vender")).toBe(false)
    expect(tienePermiso("deposito", "ventas.ver")).toBe(false)
  })

  it("solo el dueño puede asignar el rol de dueño", () => {
    expect(puedeAsignarRol("dueno", "dueno")).toBe(true)
    expect(puedeAsignarRol("administracion", "dueno")).toBe(false)
    expect(puedeAsignarRol("administracion", "mostrador")).toBe(true)
    expect(puedeAsignarRol("mostrador", "mostrador")).toBe(false)
  })
})
