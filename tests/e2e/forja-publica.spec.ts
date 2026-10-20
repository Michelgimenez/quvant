import { expect, test, type Page } from "@playwright/test"

// Las demos públicas viven en la hora de su snapshot; el reloj de la página solo tiene que andar
async function saltarActivacion(page: Page) {
  const saltar = page.getByTestId("saltar-activacion")
  await saltar.waitFor({ timeout: 30_000 })
  await saltar.click()
  await expect(page.getByTestId("activacion")).toHaveCount(0, { timeout: 10_000 })
}

test.describe("Forja · demos públicas", () => {
  test("/forja: la empresa de demostración, sin sesión, con DEMO y SIMULACIÓN, y no embebible", async ({ page }) => {
    test.setTimeout(150_000)
    const resp = await page.goto("/forja")
    expect(resp!.headers()["x-frame-options"]).toBe("DENY")
    await saltarActivacion(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await expect(page.getByTestId("nodo-forja")).toHaveCount(3)
    await expect(page.getByText("SIMULACIÓN")).toBeVisible()
    await expect(page.locator("header").getByText("DEMO").first()).toBeVisible()
    expect(await page.content()).not.toMatch(/ferremix/i)
  })

  test("propuesta para un prospecto: embebible solo ahí, con su marca, PROPUESTA y lo que falta a la vista", async ({ page }) => {
    test.setTimeout(150_000)
    const resp = await page.goto("/demo/ferremix/forja")
    const h = resp!.headers()
    expect(h["x-frame-options"]).toBeUndefined()
    expect(h["content-security-policy"]).toContain("frame-ancestors 'self' https://ferremix-propuesta.vercel.app http://localhost:*")
    await expect(page.getByTestId("activacion")).toBeVisible({ timeout: 30_000 })
    await saltarActivacion(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await expect(page.getByText("PROPUESTA")).toBeVisible()
    await expect(page.getByTestId("marca-cliente")).toHaveAttribute("src", "/clientes/ferremix/ferremix-logo-negativo.svg")
    await expect(page.getByTestId("nodo-forja")).toHaveCount(4)
    // Moreno es real (sin DEMO); las demás, ficticias y marcadas
    const moreno = page.locator("[data-nodo=CC]")
    await expect(moreno).toContainText("Ferremix Moreno")
    await expect(moreno).not.toContainText("DEMO")
    for (const codigo of ["NO", "D2", "DM"]) await expect(page.locator(`[data-nodo=${codigo}]`)).toContainText("DEMO")
    await expect(page.getByTestId("aviso-demo")).toContainText("[COMPLETAR")
    // Las otras rutas siguen sin poder embeberse
    expect((await page.request.get("/demo/ferremix")).headers()["x-frame-options"]).toBe("DENY")
  })

  test("la propuesta carga dentro de un iframe del mismo origen; un prospecto sin Forja da 404", async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto("/estado")
    await page.evaluate(() => {
      const f = document.createElement("iframe")
      f.src = "/demo/ferremix/forja"
      f.style.cssText = "position:fixed;inset:0;width:1280px;height:720px;border:0;z-index:99"
      f.dataset.testid = "marco"
      document.body.appendChild(f)
    })
    const marco = page.frameLocator("iframe[data-testid=marco]")
    await expect(marco.getByTestId("activacion")).toBeVisible({ timeout: 60_000 })
    expect((await page.request.get("/demo/otro/forja")).status()).toBe(404)
  })

  test("lo importante se anuncia a los lectores de pantalla (un rack que pasa a crítico)", async ({ page }) => {
    test.setTimeout(150_000)
    // Con ?grabar el simulador se detiene y los eventos se piden a mano
    await page.goto("/forja?grabar=1")
    await expect(page.getByTestId("activacion")).toBeVisible({ timeout: 30_000 })
    await page.waitForFunction(() => Boolean(window.__forjaGuion))
    await page.evaluate(() => window.__forjaGuion!.arrancar())
    await saltarActivacion(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    const anuncios = page.getByTestId("anuncios-vivos")
    await expect(anuncios).toHaveAttribute("aria-live", "polite")
    expect(await page.evaluate(() => window.__forjaGuion!.quiebre("CC"))).toBe(true)
    await expect(anuncios).toContainText(/quedan|se quedó sin/, { timeout: 10_000 })
  })

  // Oculta hasta la tanda 10 de Quvant: la sección vuelve con el video nuevo de Forja.
  test.skip("el sitio presenta Quvant + Forja con la toma genérica y el botón a la demo", async ({ page }) => {
    await page.goto("/")
    const seccion = page.locator("#forja")
    await seccion.scrollIntoViewIfNeeded()
    await expect(seccion.getByRole("heading", { name: "Todo el negocio, en vivo." })).toBeVisible()
    await expect(seccion.getByTestId("video-forja")).toHaveAttribute("src", "/demo/forja.mp4")
    await expect(seccion.getByTestId("ver-demo-forja")).toHaveAttribute("href", "/forja")
    await expect(seccion).toContainText("Consultá")
    expect(await seccion.innerText()).not.toMatch(/ferremix/i)
  })
})
