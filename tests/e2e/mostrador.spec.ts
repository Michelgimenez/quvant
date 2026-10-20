import { expect, test } from "@playwright/test"
import { agregarProducto, cobrarEnEfectivo, ingresar } from "./utiles"

test.describe("mostrador", () => {
  test("venta de mostrador de punta a punta", async ({ page }) => {
    await ingresar(page, "mostrador@demo.quvant.app", "/app/mostrador")
    await agregarProducto(page, "disco de corte")
    await agregarProducto(page, "guantes")
    const total = await page.getByTestId("total-venta").innerText()
    expect(total).toMatch(/\$\s[\d.]+,\d{2}/)
    await cobrarEnEfectivo(page)
    await page.getByRole("button", { name: "Nueva venta" }).click()
    await expect(page.getByTestId("estado-conexion")).toHaveText("Sincronizado", { timeout: 15_000 })
    // La venta aparece en la actividad del tablero
    await page.goto("/app")
    await expect(page.getByText(/Venta #\d+/).first()).toBeVisible()
  })

  test("presupuesto que pasa a venta (con el salto)", async ({ page }) => {
    await ingresar(page, "mostrador@demo.quvant.app", "/app/presupuestos/nuevo")
    await page.getByLabel("Nombre del cliente").fill("Obra Calle Falsa")
    const buscador = page.getByTestId("buscador-productos")
    await buscador.fill("taladro")
    await expect(page.getByRole("option").first()).toBeVisible()
    await buscador.press("Enter")
    await page.getByTestId("guardar-presupuesto").click()
    const detalle = page.getByTestId("detalle-presupuesto")
    await expect(detalle).toBeVisible()
    await expect(detalle.getByText("Obra Calle Falsa")).toBeVisible()
    await detalle.getByTestId("convertir-venta").click()
    await page.getByTestId("confirmar-venta").click()
    await expect(page.getByTestId("momento-salto").first()).toBeVisible()
    await expect(detalle.getByText("Convertido en venta").first()).toBeVisible()
  })

  test("sin conexión: vende, recarga sin internet, y sincroniza al volver", async ({ page, context }) => {
    await ingresar(page, "mostrador@demo.quvant.app", "/app/mostrador")
    await expect(page.getByTestId("estado-conexion")).toHaveText("Sincronizado", { timeout: 15_000 })
    // Esperar a que el service worker esté activo (precarga de la app)
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })

    await context.setOffline(true)
    await agregarProducto(page, "cinta aisladora")
    await cobrarEnEfectivo(page)
    await expect(page.getByTestId("venta-en-cola")).toBeVisible()
    await page.getByRole("button", { name: "Nueva venta" }).click()
    await expect(page.getByTestId("estado-conexion")).toContainText("1 venta en cola")

    // Recargar SIN internet: la app abre desde el service worker y la cola sigue ahí
    await page.reload()
    await expect(page.getByTestId("estado-conexion")).toContainText("en cola", { timeout: 20_000 })
    await agregarProducto(page, "lubricante")
    await cobrarEnEfectivo(page)
    await page.getByRole("button", { name: "Nueva venta" }).click()
    await expect(page.getByTestId("estado-conexion")).toContainText("2 ventas en cola")

    // Vuelve internet: se sincroniza sola y salta el punto
    await context.setOffline(false)
    await expect(page.getByTestId("momento-salto").first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("estado-conexion")).toHaveText("Sincronizado", { timeout: 30_000 })
  })
})
