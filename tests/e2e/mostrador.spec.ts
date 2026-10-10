import { expect, test, type Page } from "@playwright/test"
import { ingresar } from "./utiles"

async function agregarProducto(page: Page, busqueda: string) {
  const buscador = page.getByTestId("buscador-productos")
  await buscador.fill(busqueda)
  await expect(page.getByRole("option").first()).toBeVisible()
  await buscador.press("Enter")
  await expect(page.getByTestId("carrito")).toBeVisible()
}

/** Si la caja del puesto está cerrada (p. ej. antes de las 8), la abre. */
async function asegurarCaja(page: Page) {
  const abrir = page.getByRole("button", { name: "Abrir caja para cobrar" })
  if (await abrir.isVisible()) {
    await abrir.click()
    await page.getByRole("dialog").getByRole("button", { name: "Abrir caja" }).click()
    await expect(page.getByTestId("cobrar")).toBeVisible()
  }
}

async function cobrarEnEfectivo(page: Page) {
  await asegurarCaja(page)
  await page.getByTestId("cobrar").click()
  await expect(page.getByTestId("total-cobro")).toBeVisible()
  await page.getByTestId("confirmar-venta").click()
  await expect(page.getByRole("heading", { name: "Venta registrada" })).toBeVisible()
}

test.describe("mostrador", () => {
  test("venta de mostrador de punta a punta", async ({ page }) => {
    await ingresar(page, "mostrador@demo.yunque.app", "/app/mostrador")
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

  test("presupuesto que pasa a venta (con chispa)", async ({ page }) => {
    await ingresar(page, "mostrador@demo.yunque.app", "/app/presupuestos/nuevo")
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
    await expect(page.getByTestId("momento-chispa").first()).toBeVisible()
    await expect(detalle.getByText("Convertido en venta").first()).toBeVisible()
  })

  test("sin conexión: vende, recarga sin internet, y sincroniza al volver", async ({ page, context }) => {
    await ingresar(page, "mostrador@demo.yunque.app", "/app/mostrador")
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

    // Vuelve internet: se sincroniza sola y salta la chispa
    await context.setOffline(false)
    await expect(page.getByTestId("momento-chispa").first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("estado-conexion")).toHaveText("Sincronizado", { timeout: 30_000 })
  })
})
