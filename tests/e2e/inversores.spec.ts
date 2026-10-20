import { expect, test, type Page } from "@playwright/test"

async function entrar(page: Page, ruta = "/inversores") {
  await page.goto(ruta)
  await page.getByLabel("Clave").fill("quvant-demo")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByTestId("presentacion-play")).toBeVisible({ timeout: 30_000 })
}

const contador = (page: Page) => page.getByTestId("presentacion-escena")

test.describe("presentación para inversores", () => {
  test("sin clave no se entrega nada sensible", async ({ request, page }) => {
    const html = await (await request.get("/inversores")).text()
    expect(html).not.toContain("Implementación de pilotos")
    expect(html).not.toContain("Desarrolladores senior")
    await page.goto("/inversores")
    await page.getByLabel("Clave").fill("otra-clave")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByText("Clave incorrecta.")).toBeVisible()
    await expect(page.getByTestId("presentacion-play")).toHaveCount(0)
  })

  test("teclado: navegar, velocidad, ocultar, reproducir y reiniciar", async ({ page }) => {
    await entrar(page)
    await expect(contador(page)).toContainText("01 / 12")
    await page.keyboard.press("ArrowRight")
    await expect(contador(page)).toContainText("02 / 12")
    await expect(page).toHaveURL(/#2$/)
    await page.keyboard.press("End")
    await expect(contador(page)).toContainText("12 / 12")
    await page.keyboard.press("Home")
    await expect(contador(page)).toContainText("01 / 12")

    await page.keyboard.press("3")
    await expect(page.getByRole("button", { name: "1,25×" })).toHaveAttribute("aria-pressed", "true")

    await page.keyboard.press("h")
    await expect(page.getByTestId("presentacion-play")).toHaveCount(0)
    await page.keyboard.press("h")
    await expect(page.getByTestId("presentacion-play")).toBeVisible()

    // Autoplay: la apertura dura 6 s a 1× (4,8 s a 1,25×) y pasa sola a la escena 2
    await page.keyboard.press("p")
    await expect(page.getByTestId("presentacion-play")).toHaveAttribute("aria-label", "Pausar (P)")
    await expect(contador(page)).toContainText("02 / 12", { timeout: 12_000 })
    await page.keyboard.press("p")
    await page.keyboard.press("r")
    await expect(contador(page)).toContainText("01 / 12")
  })

  // Oculta hasta la tanda 10 de Quvant: el video viejo de Forja muestra el yunque.
  test.skip("escena de Forja: el negocio en vivo, con la toma genérica", async ({ page }) => {
    await entrar(page)
    await page.evaluate(() => (window.location.hash = "6"))
    await expect(contador(page)).toContainText("06 / 12")
    const escena = page.locator("[data-escena=forja]")
    await expect(escena).toContainText("Forja: el negocio, en vivo.")
    await expect(escena.getByTestId("video-forja")).toHaveAttribute("src", "/demo/forja.mp4")
  })

  test("escena estrella: la demo que cambia de empresa, en vivo", async ({ page }) => {
    await entrar(page)
    await page.evaluate(() => (window.location.hash = "5"))
    await expect(contador(page)).toContainText("05 / 12")
    const escena = page.locator("[data-escena=cambio-de-empresa]")
    await expect(escena.getByTestId("escala-control")).toBeVisible({ timeout: 20_000 })
    // Avanza sola: en unos segundos ya no está en el kiosco
    await expect(escena.getByTestId("escala-control")).not.toHaveAttribute("aria-valuenow", "1", { timeout: 15_000 })
  })

  test("enlace directo a una escena y demo real en vivo", async ({ page }) => {
    await entrar(page)
    await page.evaluate(() => (window.location.hash = "6"))
    await expect(contador(page)).toContainText("06 / 12")
    // El diferencial corre el motor real: corta la red, vende en cola y sincroniza
    const demo = page.locator("[data-escena=diferencial]").getByTestId("demo-conexion")
    await expect(demo.getByTestId("demo-estado")).toContainText("en cola", { timeout: 15_000 })
    await expect(demo.getByTestId("demo-estado")).toHaveText("Sincronizado", { timeout: 20_000 })
  })
})
