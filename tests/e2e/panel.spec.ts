import { expect, test } from "@playwright/test"

test.describe("pedir una demo → panel interno", () => {
  test("la solicitud se guarda en la base y aparece como nueva en el panel", async ({ page, request }) => {
    const nombre = `Prueba Panel ${Date.now()}`
    await page.goto("/#pedir-demo")
    const form = page.locator("#pedir-demo")
    await form.getByLabel("Tu nombre").fill(nombre)
    await form.getByLabel("Nombre del negocio").fill("Ferretería de Prueba")
    await form.getByLabel("Rubro").selectOption("Ferretería industrial")
    await form.getByLabel("Cantidad de sucursales").fill("3")
    await form.getByLabel("WhatsApp").fill("+54 9 11 0000-0000")
    await form.getByTestId("enviar-sitio").click()
    // La primera escritura en la base local puede tardar si el servidor recién arranca
    await expect(form.getByTestId("solicitud-ok")).toBeVisible({ timeout: 30_000 })

    // Sin clave, el panel no entrega ningún dato personal
    expect(await (await request.get("/panel")).text()).not.toContain(nombre)

    await page.goto("/panel")
    await page.getByLabel("Clave").fill("otra")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page.getByText("Clave incorrecta.")).toBeVisible()
    await page.getByLabel("Clave").fill("yunque-panel")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByTestId("aviso-solicitudes")).toContainText(/solicitud(es)? nueva/)
    const tarjeta = page.getByTestId("solicitud").filter({ hasText: nombre })
    await expect(tarjeta).toHaveCount(1)
    await expect(tarjeta.getByTestId("estado-solicitud")).toHaveText("Nueva")
    await expect(tarjeta.getByText("3 sucursales")).toBeVisible()

    await tarjeta.getByRole("button", { name: "Marcar como contactada" }).click()
    await expect(tarjeta.getByTestId("estado-solicitud")).toHaveText("Contactada")
  })
})
