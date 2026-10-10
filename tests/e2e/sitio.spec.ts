import { expect, test } from "@playwright/test"

test.describe("sitio del producto", () => {
  test("héroe, secciones y datos estructurados", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Firme, aunque todo se mueva.")
    await expect(page.getByRole("heading", { name: /Desde USD 290 por mes por negocio/ })).toBeVisible()
    const ld = await page.locator('script[type="application/ld+json"]').innerText()
    expect(JSON.parse(ld)["@graph"].map((x: { "@type": string }) => x["@type"])).toEqual(["Organization", "SoftwareApplication"])
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/)
  })

  test("Nunca se cae: vende sin conexión y sincroniza al volver", async ({ page }) => {
    await page.goto("/#nunca-se-cae")
    const demo = page.getByTestId("demo-conexion")
    await expect(demo).toBeVisible({ timeout: 20_000 })
    await demo.getByRole("button").first().click()
    await expect(demo.getByText("sincronizada").first()).toBeVisible({ timeout: 10_000 })
    await demo.getByTestId("demo-interruptor").click()
    await demo.getByRole("button").nth(1).click()
    await demo.getByRole("button").nth(2).click()
    await expect(demo.getByTestId("demo-estado")).toContainText("2 ventas en cola")
    await demo.getByTestId("demo-interruptor").click()
    await expect(page.getByTestId("momento-chispa").first()).toBeVisible({ timeout: 10_000 })
    await expect(demo.getByTestId("demo-estado")).toHaveText("Sincronizado", { timeout: 10_000 })
  })

  test("pedir una demo valida y confirma", async ({ page }) => {
    await page.goto("/#pedir-demo")
    const form = page.locator("#pedir-demo")
    await form.getByTestId("enviar-sitio").click()
    await expect(form.getByText("Contanos tu nombre")).toBeVisible()
    await form.getByLabel("Tu nombre").fill("Ana Prueba")
    await form.getByLabel("Nombre del negocio").fill("Ferretería de Prueba")
    await form.getByLabel("Rubro").selectOption("Ferretería industrial")
    await form.getByLabel("Cantidad de sucursales").fill("2")
    await form.getByLabel("WhatsApp").fill("+54 9 11 0000-0000")
    await form.getByTestId("enviar-sitio").click()
    await expect(form.getByTestId("solicitud-ok")).toBeVisible()
  })
})
