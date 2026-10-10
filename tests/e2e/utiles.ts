import { expect, type Page } from "@playwright/test"

/** Ingresa con un usuario demo. Resuelve el doble factor con el autenticador emulado. */
export async function ingresar(page: Page, email: string, destino = "/app") {
  await page.goto(`/ingresar?siguiente=${encodeURIComponent(destino)}`)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Contraseña").fill("demo1234")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/(app|ingresar\/verificar)/)
  if (page.url().includes("/ingresar/verificar")) {
    const codigo = page.getByTestId("codigo-demo")
    await expect(codigo).toBeVisible()
    await page.getByLabel("Código de 6 dígitos").fill((await codigo.innerText()).replace(/\D/g, ""))
    await page.getByRole("button", { name: "Verificar" }).click()
  }
  await page.waitForURL(new RegExp(destino.replace(/\//g, "\/")))
}

/** Mensajes de error/aviso de la página (excluye el anunciador de rutas de Next). */
export function alerta(page: Page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)')
}
