import { describe, expect, it } from "vitest"
import { EMPRESAS, EMPRESAS_ORDEN } from "@/demo/empresas"
import { ESPERA_CAMBIO, PASOS_RECORRIDO, duracionRecorrido, inicioDePasos } from "@/demo/recorrido"

describe("el recorrido guiado", () => {
  it("pasa por las cuatro empresas y cada paso abre un módulo que esa empresa tiene", () => {
    const empresas = new Set(PASOS_RECORRIDO.flatMap((p) => (p.empresa ? [p.empresa] : [])))
    expect([...empresas].sort()).toEqual([...EMPRESAS_ORDEN].sort())
    for (const p of PASOS_RECORRIDO) if (p.empresa && p.modulo) expect(EMPRESAS[p.empresa].modulos[p.modulo]).toBe(true)
  })

  it("dura alrededor de un minuto (la base del video de 60 segundos)", () => {
    const d = duracionRecorrido(PASOS_RECORRIDO, "kiosco")
    expect(d).toBeGreaterThan(50)
    expect(d).toBeLessThanOrEqual(62)
  })

  it("deja tiempo al cambio de empresa antes de mostrar el módulo, y las acciones caen dentro de su paso", () => {
    const t = inicioDePasos(PASOS_RECORRIDO, "kiosco")
    expect(t[0].cambia).toBe(false)
    PASOS_RECORRIDO.forEach((p, i) => {
      expect(t[i].contenido - t[i].inicio).toBeCloseTo(t[i].cambia ? ESPERA_CAMBIO : 0)
      for (const a of p.acciones ?? []) expect(a.en).toBeLessThan(p.duracion)
    })
    // Si arranca desde otra empresa, el primer paso cambia a la del kiosco.
    expect(inicioDePasos(PASOS_RECORRIDO, "grupo")[0].cambia).toBe(true)
  })

  it("cada subtítulo se lee en su tiempo (no más de ~3 palabras por segundo)", () => {
    for (const p of PASOS_RECORRIDO) expect(p.texto.split(/\s+/).length / p.duracion).toBeLessThanOrEqual(3.1)
  })
})
