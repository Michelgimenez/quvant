import { expect, test, type Page } from "@playwright/test"
import { ingresar } from "./utiles"

// Miércoles 15:30 en Argentina: horario comercial, con transferencias en tránsito en la demo
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-07T15:30:00-03:00") })
})

async function activarForja(page: Page) {
  await page.goto("/app/extensiones")
  await page.getByTestId("activar-forja").click()
  await page.waitForURL(/\/app\/forja/)
  await expect(page.getByTestId("forja")).toBeVisible({ timeout: 30_000 })
  // La activación tiene que llegar al servidor antes de cambiar de persona
  await expect(page.getByTestId("estado-conexion")).toHaveText("Sincronizado", { timeout: 15_000 })
}

const ventasHoy = async (page: Page) => Number(await page.getByTestId("ventas-hoy-total").innerText())

/** Textos de los scripts que cargó la página (para verificar la carga diferida). */
function registrarScripts(page: Page) {
  const urls: string[] = []
  page.on("response", (r) => {
    if (r.request().resourceType() === "script") urls.push(r.url())
  })
  return async () => (await Promise.all(urls.map((u) => page.request.get(u).then((r) => r.text()).catch(() => "")))).join("\n")
}

test.describe("Forja · red", () => {
  test("la dueña activa Forja: mapa con toda la red, simulación viva y constelación", async ({ page }) => {
    // WebGL por software en el navegador de prueba + espera de eventos simulados
    test.setTimeout(150_000)
    await ingresar(page, "dueno@demo.yunque.app")
    await page.goto("/app/forja")
    await expect(page.getByText("Forja no está activada")).toBeVisible()
    await activarForja(page)
    const red = page.getByTestId("forja-red")
    await expect(red).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await expect(page.getByTestId("nodo-forja")).toHaveCount(3)
    await expect(page.getByText("SIMULACIÓN")).toBeVisible()

    // Tarjeta al pasar por un nodo
    await page.locator("[data-nodo=CC] button").hover({ force: true })
    await expect(page.getByTestId("tarjeta-nodo")).toContainText("Ventas de hoy")
    await page.mouse.move(5, 5)

    // Transferencia en tránsito: detalle con productos y llegada estimada
    await page.getByTestId("transferencia-en-transito").first().click()
    await expect(page.getByTestId("detalle-transferencia")).toContainText("En camino")

    // Mapa ⇄ Constelación
    await page.getByTestId("vista-constelacion").click()
    await expect(red).toHaveAttribute("data-vista", "constelacion")
    await page.getByTestId("vista-mapa").click()
    await expect(red).toHaveAttribute("data-vista", "mapa")

    // La simulación suma ventas
    const antes = await ventasHoy(page)
    await expect.poll(() => ventasHoy(page), { timeout: 45_000 }).toBeGreaterThan(antes)
    await expect(page.getByRole("link", { name: "Forja" }).first()).toBeVisible()
  })

  test("con permiso extra, una persona de mostrador ve solo su sucursal; sin permiso, nada", async ({ page, context }) => {
    await ingresar(page, "dueno@demo.yunque.app")
    await activarForja(page)
    await context.clearCookies()

    await ingresar(page, "mostrador.norte@demo.yunque.app")
    await page.goto("/app/forja?simulacion=0")
    await expect(page.getByTestId("nodo-forja")).toHaveCount(1, { timeout: 30_000 })
    await expect(page.locator("[data-nodo=NO]")).toHaveCount(1)
    await context.clearCookies()

    await ingresar(page, "mostrador@demo.yunque.app")
    await page.goto("/app/forja")
    await expect(page.getByRole("heading", { name: "Sin acceso" })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("link", { name: "Forja" })).toHaveCount(0)
  })

  test("MapLibre y deck.gl se cargan solo en Forja", async ({ page }) => {
    await ingresar(page, "dueno@demo.yunque.app")
    const otros = registrarScripts(page)
    await page.goto("/app/inventario")
    await page.waitForSelector("#contenido h1")
    await page.waitForTimeout(1500)
    const textoOtros = await otros()
    expect(textoOtros).not.toContain("maplibregl-canvas")
    expect(textoOtros).not.toContain("luma.gl")

    const forja = registrarScripts(page)
    await activarForja(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    const textoForja = await forja()
    expect(textoForja).toContain("maplibregl-canvas")
  })
})
