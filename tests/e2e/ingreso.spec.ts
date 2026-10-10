import { expect, test } from "@playwright/test"
import { alerta, ingresar } from "./utiles"

test.describe("ingreso", () => {
  test("sin sesión, /app redirige al ingreso", async ({ page }) => {
    await page.goto("/app/inventario")
    await expect(page).toHaveURL(/\/ingresar\?siguiente=%2Fapp%2Finventario/)
  })

  test("contraseña incorrecta muestra un error genérico", async ({ page }) => {
    await page.goto("/ingresar")
    await page.getByLabel("Email").fill("mostrador@demo.yunque.app")
    await page.getByLabel("Contraseña").fill("incorrecta")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await expect(alerta(page)).toHaveText("Email o contraseña incorrectos.")
  })

  test("mostrador entra directo; dueño pasa por el doble factor", async ({ page, context }) => {
    await ingresar(page, "mostrador@demo.yunque.app")
    await expect(page).toHaveURL(/\/app$/)
    await context.clearCookies()
    await page.goto("/ingresar")
    await page.getByLabel("Email").fill("dueno@demo.yunque.app")
    await page.getByLabel("Contraseña").fill("demo1234")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await expect(page).toHaveURL(/\/ingresar\/verificar/)
    // Un código equivocado no entra
    await page.getByLabel("Código de 6 dígitos").fill("000000")
    await page.getByRole("button", { name: "Verificar" }).click()
    await expect(alerta(page)).toContainText("Código incorrecto")
    const codigo = (await page.getByTestId("codigo-demo").innerText()).replace(/\D/g, "")
    await page.getByLabel("Código de 6 dígitos").fill(codigo)
    await page.getByRole("button", { name: "Verificar" }).click()
    await expect(page).toHaveURL(/\/app$/)
  })

  test("bloquea tras 5 intentos fallidos", async ({ page }) => {
    await page.goto("/ingresar")
    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Email").fill("compras@demo.yunque.app")
      await page.getByLabel("Contraseña").fill(`mal-${i}`)
      await page.getByRole("button", { name: "Ingresar" }).click()
      await expect(alerta(page)).toBeVisible()
    }
    await page.getByLabel("Contraseña").fill("demo1234")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await expect(alerta(page)).toContainText("Demasiados intentos")
  })
})
