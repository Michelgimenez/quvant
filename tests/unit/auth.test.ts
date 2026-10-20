import { describe, expect, it } from "vitest"
import { LimitadorMemoria, MAX_FALLOS_EMAIL, VENTANA_MS } from "@/lib/auth/limitador"
import { firmar, verificar } from "@/lib/auth/firma"

describe("límite de intentos de ingreso", () => {
  it("bloquea al quinto fallo por email y libera al pasar la ventana", async () => {
    let t = 1_000_000
    const lim = new LimitadorMemoria(() => t)
    for (let i = 0; i < MAX_FALLOS_EMAIL; i++) {
      expect((await lim.verificar("e", "1.1.1.1")).permitido).toBe(true)
      await lim.registrar("e", "1.1.1.1", false)
      t += 1000
    }
    const bloqueado = await lim.verificar("e", "1.1.1.1")
    expect(bloqueado.permitido).toBe(false)
    t += VENTANA_MS
    expect((await lim.verificar("e", "1.1.1.1")).permitido).toBe(true)
  })

  it("un ingreso exitoso reinicia el contador del email", async () => {
    const lim = new LimitadorMemoria()
    for (let i = 0; i < 4; i++) await lim.registrar("e", "ip", false)
    await lim.registrar("e", "ip", true)
    await lim.registrar("e", "ip", false)
    const v = await lim.verificar("e", "ip")
    expect(v).toEqual({ permitido: true, restantes: 4 })
  })

  it("bloquea por IP aunque se roten emails", async () => {
    const lim = new LimitadorMemoria()
    for (let i = 0; i < 20; i++) await lim.registrar(`e${i}`, "9.9.9.9", false)
    expect((await lim.verificar("nuevo", "9.9.9.9")).permitido).toBe(false)
    expect((await lim.verificar("nuevo", "8.8.8.8")).permitido).toBe(true)
  })
})

describe("firma de sesión", () => {
  it("verifica un token propio y rechaza uno alterado o de otra audiencia", async () => {
    const token = await firmar({ sub: "u1", rol: "dueno" }, 60, "quvant-app")
    expect(await verificar<{ sub: string }>(token, "quvant-app")).toMatchObject({ sub: "u1" })
    expect(await verificar(token, "quvant-2fa")).toBeNull()
    const [h, p, f] = token.split(".")
    const alterado = [h, Buffer.from(JSON.stringify({ sub: "u1", rol: "dueno", aal: "aal2" })).toString("base64url"), f].join(".")
    expect(await verificar(alterado, "quvant-app")).toBeNull()
    expect(p).toBeTruthy()
  })

  it("rechaza tokens vencidos", async () => {
    const token = await firmar({ sub: "u1" }, -10, "quvant-app")
    expect(await verificar(token, "quvant-app")).toBeNull()
  })
})
