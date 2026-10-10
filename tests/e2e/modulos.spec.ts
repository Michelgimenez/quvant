import { expect, test } from "@playwright/test"
import { ingresar } from "./utiles"

const MODULOS: [string, RegExp][] = [
  ["/app", /Buen|Buenas/],
  ["/app/mostrador", /Nueva venta/],
  ["/app/presupuestos", /Presupuestos/],
  ["/app/servicio", /Servicio técnico/],
  ["/app/entregas", /Hoja de ruta/],
  ["/app/inventario", /Inventario/],
  ["/app/inventario/conteos", /Conteos/],
  ["/app/precios", /Precios al día/],
  ["/app/compras", /Compras y proveedores/],
  ["/app/clientes", /Clientes y cuentas corrientes/],
  ["/app/reportes", /Los números del negocio/],
  ["/app/usuarios", /Usuarios y permisos/],
  ["/app/configuracion", /Configuración/],
  ["/app/importar", /Traé tu catálogo/],
  ["/app/auditoria", /Registro de auditoría/],
]

test.describe("módulos", () => {
  test("la dueña recorre todos los módulos sin errores", async ({ page }) => {
    // Recorre todos los módulos: con la máquina cargada pasa del minuto
    test.setTimeout(150_000)
    const errores: string[] = []
    page.on("pageerror", (e) => errores.push(e.message))
    await ingresar(page, "dueno@demo.yunque.app")
    for (const [ruta, titulo] of MODULOS) {
      await page.goto(ruta)
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(titulo, { timeout: 15_000 })
      await expect(page.getByText("Algo falló en esta pantalla")).toHaveCount(0)
    }
    expect(errores).toEqual([])
  })

  test("el técnico no ve ventas ni configuración", async ({ page }) => {
    await ingresar(page, "tecnico@demo.yunque.app")
    await expect(page.getByRole("navigation", { name: "Módulos" }).getByRole("link", { name: "Mostrador" })).toHaveCount(0)
    await page.goto("/app/configuracion")
    await expect(page.getByRole("heading", { name: "Sin acceso" })).toBeVisible()
  })

  test("co-branding: el color de la organización se aplica al encabezado", async ({ page }) => {
    await ingresar(page, "dueno@demo.yunque.app", "/app/configuracion")
    await page.getByLabel("Usar #FF5A1F").click()
    await page.getByRole("button", { name: "Guardar" }).first().click()
    await expect(page.getByText("Marca actualizada en todo el sistema")).toBeVisible()
    const color = await page.locator("header [aria-hidden]").first().evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(color).toBe("rgb(255, 90, 31)")
  })

  test("taller: el equipo pasa a listo y queda el aviso por WhatsApp (emulado)", async ({ page }) => {
    // La demo se genera según la fecha: con reloj fijo siempre hay equipos en reparación
    await page.clock.install({ time: new Date("2026-10-07T15:30:00-03:00") })
    await ingresar(page, "tecnico@demo.yunque.app", "/app/servicio")
    await page.getByLabel("Solo mis órdenes").uncheck()
    const tarjeta = page.getByRole("region", { name: "En reparación" }).getByRole("button").first()
    await tarjeta.click()
    const detalle = page.getByTestId("detalle-orden")
    await detalle.getByTestId("servicio-listo").click()
    await page.getByRole("button", { name: "Confirmar" }).click()
    await expect(detalle.getByText("WhatsApp · envío emulado").first()).toBeVisible()
    await expect(detalle.getByText(/está listo para retirar/).first()).toBeVisible()
  })
})
