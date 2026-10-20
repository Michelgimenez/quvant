import { expect, test } from "@playwright/test"
import { agregarProducto, cobrarEnEfectivo, ingresar, leerBaseLocal, stockEnBuscador, type OpResumen } from "./utiles"

const contar = (ops: OpResumen[], id: string) => ops.filter((o) => o.id === id).length

test.describe("mostrador sin conexión", () => {
  test("corta la red, vende, reconecta: cada venta llega una sola vez y el stock baja una sola vez", async ({ page, context }) => {
    await ingresar(page, "mostrador@demo.quvant.app", "/app/mostrador")
    const estado = page.getByTestId("estado-conexion")
    await expect(estado).toHaveText("Sincronizado", { timeout: 15_000 })
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })

    // Stock antes del corte (Casa Central)
    const cinta = await stockEnBuscador(page, "cinta aisladora")
    const lubricante = await stockEnBuscador(page, "lubricante")
    expect(cinta.stock).toBeGreaterThanOrEqual(2)
    expect(lubricante.stock).toBeGreaterThanOrEqual(1)
    const antes = await leerBaseLocal(page)
    expect(antes.pendientes).toHaveLength(0)

    // Sin red: tres ventas (dos de cinta, una de lubricante)
    await context.setOffline(true)
    for (const producto of ["cinta aisladora", "cinta aisladora", "lubricante"]) {
      await agregarProducto(page, producto)
      await cobrarEnEfectivo(page)
      await expect(page.getByTestId("venta-en-cola")).toBeVisible()
      await page.getByRole("button", { name: "Nueva venta" }).click()
    }
    await expect(estado).toContainText("3 ventas en cola")

    // Intentar sincronizar a mano sin red no envía nada ni pierde nada
    await estado.click()
    await page.getByRole("button", { name: "Sincronizar ahora" }).click()
    await page.keyboard.press("Escape")

    // Recargar sin red: la cola sobrevive
    await page.reload()
    await expect(estado).toContainText("3 ventas en cola", { timeout: 20_000 })
    const enCola = (await leerBaseLocal(page)).pendientes.filter((o) => o.tipo === "venta.crear")
    expect(enCola).toHaveLength(3)
    expect(new Set(enCola.map((o) => o.venta)).size).toBe(3)
    expect((await leerBaseLocal(page)).servidor.length).toBe(antes.servidor.length) // nada llegó al servidor

    // Vuelve la red: sincroniza sola
    await context.setOffline(false)
    await expect(estado).toHaveText("Sincronizado", { timeout: 30_000 })

    // Recargar y forzar otra sincronización: no se reenvía ni se duplica nada
    await page.reload()
    await expect(estado).toHaveText("Sincronizado", { timeout: 20_000 })
    await estado.click()
    await page.getByRole("button", { name: "Sincronizar ahora" }).click()
    await page.keyboard.press("Escape")
    await expect(estado).toHaveText("Sincronizado", { timeout: 20_000 })

    const despues = await leerBaseLocal(page)
    for (const op of enCola) {
      expect(contar(despues.servidor, op.id), `servidor: ${op.id}`).toBe(1)
      expect(contar(despues.confirmadas, op.id), `dispositivo: ${op.id}`).toBe(1)
    }
    expect(despues.pendientes).toHaveLength(0)
    // Cada venta, una sola vez y con su número definitivo, sin repetir números
    const ventasServidor = despues.servidor.filter((o) => o.tipo === "venta.crear" || o.tipo === "presupuesto.convertir")
    const nuestras = ventasServidor.filter((o) => enCola.some((c) => c.id === o.id))
    expect(nuestras).toHaveLength(3)
    expect(nuestras.every((o) => o.ok && typeof o.numero === "number")).toBe(true)
    const numeros = ventasServidor.map((o) => o.numero).filter((n) => n !== null)
    expect(new Set(numeros).size).toBe(numeros.length)
    expect(despues.servidor.filter((o) => o.tipo === "venta.crear").length - antes.servidor.filter((o) => o.tipo === "venta.crear").length).toBe(3)

    // El stock bajó exactamente lo vendido
    expect((await stockEnBuscador(page, "cinta aisladora")).stock).toBe(cinta.stock - 2)
    expect((await stockEnBuscador(page, "lubricante")).stock).toBe(lubricante.stock - 1)
  })
})
