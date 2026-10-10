import { expect, test, type Page } from "@playwright/test"
import { ingresar } from "./utiles"

async function activarForja(page: Page) {
  await page.goto("/app/extensiones")
  await page.getByTestId("activar-forja").click()
  await page.waitForURL(/\/app\/forja/)
  await expect(page.getByTestId("forja")).toBeVisible({ timeout: 30_000 })
  // La activación tiene que llegar al servidor antes de cambiar de persona
  await expect(page.getByTestId("estado-conexion")).toHaveText("Sincronizado", { timeout: 15_000 })
}

async function totalVentas(page: Page) {
  const textos = await page.getByTestId("ventas-hoy-nodo").allInnerTexts()
  return textos.reduce((a, t) => a + Number(t.split("·")[0].trim()), 0)
}

test.describe("Forja · base", () => {
  test("la dueña activa Forja: ve toda la red y la simulación genera ventas", async ({ page }) => {
    await ingresar(page, "dueno@demo.yunque.app")
    await page.goto("/app/forja")
    await expect(page.getByText("Forja no está activada")).toBeVisible()
    await activarForja(page)
    await expect(page.getByTestId("nodo-forja")).toHaveCount(3)
    await expect(page.getByText("SIMULACIÓN")).toBeVisible()
    const antes = await totalVentas(page)
    await expect.poll(() => totalVentas(page), { timeout: 40_000 }).toBeGreaterThan(antes)
    // Queda en la navegación y sobrevive a una recarga
    await page.reload()
    await expect(page.getByTestId("nodo-forja")).toHaveCount(3, { timeout: 30_000 })
    await expect(page.getByRole("link", { name: "Forja" }).first()).toBeVisible()
  })

  test("con permiso extra, una persona de mostrador ve solo su sucursal; sin permiso, nada", async ({ page, context }) => {
    await ingresar(page, "dueno@demo.yunque.app")
    await activarForja(page)
    await context.clearCookies()

    await ingresar(page, "mostrador.norte@demo.yunque.app")
    await page.goto("/app/forja?simulacion=0")
    await expect(page.getByTestId("nodo-forja")).toHaveCount(1, { timeout: 30_000 })
    await expect(page.getByTestId("nodo-forja")).toContainText("Sucursal Norte")
    await context.clearCookies()

    await ingresar(page, "mostrador@demo.yunque.app")
    await page.goto("/app/forja")
    await expect(page.getByRole("heading", { name: "Sin acceso" })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("link", { name: "Forja" })).toHaveCount(0)
  })
})
