import { expect, test } from "@playwright/test"

test.describe("demo comercial por cliente", () => {
  test("Ferremix: su marca, sello PROPUESTA y escenas", async ({ page }) => {
    await page.goto("/demo/ferremix")
    await expect(page.getByTestId("presentacion-play")).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveTitle(/Así se vería Quvant en Ferremix/)
    const portada = page.locator("[data-escena=portada]")
    await expect(portada.getByText("Así se vería Quvant en Ferremix")).toBeVisible()
    await expect(portada.getByText("PROPUESTA")).toBeVisible()
    await expect(page.getByTestId("presentacion-escena")).toContainText("01 / 07")

    // Quvant con su marca: la app real con su logo y "datos de ejemplo" a la vista
    await page.evaluate(() => (window.location.hash = "3"))
    const marca = page.locator("[data-escena=su-marca]")
    await expect(page.getByTestId("presentacion-escena")).toContainText("03 / 07")
    // En tema oscuro se ve el logo negativo; el claro queda oculto
    await expect(marca.getByAltText("Ferremix").filter({ visible: true }).first()).toBeVisible()
    await expect(marca.getByText("DATOS DE EJEMPLO")).toBeVisible()
    await expect(marca.getByText("PROPUESTA")).toBeVisible()
    await expect(marca.getByText("con Quvant").first()).toBeVisible()
  })

  test("un prospecto que no está configurado da 404", async ({ request }) => {
    const r = await request.get("/demo/otro-negocio")
    expect(r.status()).toBe(404)
  })

  test("los archivos de public/demo (logos de la empresa demo) no pasan por el filtro de prospectos", async ({ request }) => {
    for (const logo of ["ferreteria-industrial-demo-claro.svg", "ferreteria-industrial-demo-oscuro.svg"]) {
      const r = await request.get(`/demo/${logo}`)
      expect(r.status(), logo).toBe(200)
      expect(r.headers()["content-type"]).toContain("image/svg+xml")
    }
  })
})
