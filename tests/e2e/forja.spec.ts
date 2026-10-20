import { expect, test, type Page } from "@playwright/test"
import { FORJA } from "../../src/config/forja"
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
  // La animación de activación se ve la primera vez: acá se salta (tiene su propio test)
  await saltarActivacion(page)
  // La activación tiene que llegar al servidor antes de cambiar de persona
  await expect(page.getByTestId("estado-conexion")).toHaveText("Sincronizado", { timeout: 15_000 })
}

async function saltarActivacion(page: Page) {
  const saltar = page.getByTestId("saltar-activacion")
  await saltar.waitFor({ timeout: 15_000 }).catch(() => {})
  if (await saltar.isVisible().catch(() => false)) await saltar.click()
  await expect(page.getByTestId("activacion")).toHaveCount(0, { timeout: 10_000 })
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
    await ingresar(page, "dueno@demo.quvant.app")
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
    await ingresar(page, "dueno@demo.quvant.app")
    await activarForja(page)
    await context.clearCookies()

    await ingresar(page, "mostrador.norte@demo.quvant.app")
    await page.goto("/app/forja?simulacion=0")
    await expect(page.getByTestId("nodo-forja")).toHaveCount(1, { timeout: 30_000 })
    await expect(page.locator("[data-nodo=NO]")).toHaveCount(1)
    await context.clearCookies()

    await ingresar(page, "mostrador@demo.quvant.app")
    await page.goto("/app/forja")
    await expect(page.getByRole("heading", { name: "Sin acceso" })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("link", { name: "Forja" })).toHaveCount(0)
  })

  test("MapLibre y deck.gl se cargan solo en Forja", async ({ page }) => {
    // Vuelve a bajar todos los scripts para leerlos: con la máquina cargada pasa del minuto
    test.setTimeout(150_000)
    await ingresar(page, "dueno@demo.quvant.app")
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

test.describe("Forja · taller", () => {
  test("entrar a una sucursal: taller 3D, zonas, panel con enlaces y vuelta a la red", async ({ page }) => {
    test.setTimeout(180_000)
    await ingresar(page, "dueno@demo.quvant.app")
    await activarForja(page)
    // Segunda visita (sin la animación de activación, que también usa 3D): three.js baja recién al entrar a una sucursal
    const scripts = registrarScripts(page)
    await page.goto("/app/forja")
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await expect(page.getByTestId("activacion")).toHaveCount(0)
    expect(await scripts()).not.toContain("THREE.WebGLRenderer")

    await page.locator("[data-nodo=CC] button").click({ force: true })
    const taller = page.getByTestId("forja-taller")
    await expect(taller).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await expect(taller).toHaveAttribute("data-sucursal", "CC")
    await expect(page.locator("[data-nivel=taller]")).toBeVisible()
    expect(await scripts()).toContain("THREE.WebGLRenderer")

    // Depósito: faltantes, rack con sus productos y enlace al inventario filtrado
    await page.getByTestId("zona-deposito").click()
    const panel = page.getByTestId("panel-zona")
    await expect(panel).toHaveAttribute("data-zona", "deposito")
    await page.getByTestId("faltante").first().hover()
    await expect(page.getByTestId("tooltip-rack")).toBeVisible()
    await page.getByTestId("faltante").first().click()
    await expect(page.getByTestId("productos-rack")).toBeVisible()
    const enlaceRack = page.getByRole("link", { name: "Ver el rack en inventario" })
    await expect(enlaceRack).toHaveAttribute("href", /\/app\/inventario\?sucursal=[^&]+&ubicacion=[A-Z0-9]+-[A-Z]$/)
    const hrefRack = (await enlaceRack.getAttribute("href"))!

    // Servicio técnico: números de orden en los bancos y enlace directo a la orden
    await expect(page.getByTestId("banco-orden").first()).toBeVisible()
    await page.getByTestId("zona-servicio").click()
    await expect(panel).toHaveAttribute("data-zona", "servicio")
    await page.getByTestId("fila-orden").first().click()
    await expect(page.getByRole("link", { name: "Abrir la orden" })).toHaveAttribute("href", /\/app\/servicio\?id=/)

    // Mostrador y muelle
    await page.getByTestId("zona-mostrador").click()
    await expect(panel).toContainText("Puesto 1")
    await expect(page.getByRole("link", { name: "Ir al mostrador" })).toHaveAttribute("href", "/app/mostrador")
    await page.getByTestId("zona-muelle").click()
    await expect(panel).toHaveAttribute("data-zona", "muelle")

    // Esc cierra el panel; el siguiente vuelve a la red por el camino inverso
    await page.keyboard.press("Escape")
    await expect(panel).toHaveCount(0)
    await page.keyboard.press("Escape")
    await expect(taller).toHaveCount(0, { timeout: 15_000 })
    await expect(page.locator("[data-nivel=red]")).toBeVisible()
    await expect(page.getByTestId("nodo-forja")).toHaveCount(3)

    // El enlace del rack abre el inventario de esa sucursal, filtrado por ubicación
    await page.goto(hrefRack)
    await expect(page.getByTestId("filtro-ubicacion")).toBeVisible({ timeout: 30_000 })
  })

  test("@celular el taller entra en la pantalla con la barra de zonas a mano", async ({ page }) => {
    test.skip(test.info().project.name !== "celular", "Solo en el proyecto de celular")
    test.setTimeout(180_000)
    await ingresar(page, "dueno@demo.quvant.app")
    await activarForja(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await page.locator("[data-nodo=CC] button").click({ force: true })
    await expect(page.getByTestId("forja-taller")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    // La barra de zonas queda arriba de la navegación inferior de la app
    const barra = await page.getByTestId("zona-deposito").boundingBox()
    const nav = await page.getByRole("navigation", { name: "Accesos rápidos" }).boundingBox()
    expect(barra!.y + barra!.height).toBeLessThanOrEqual(nav!.y)
    await page.getByTestId("zona-deposito").click()
    await expect(page.getByTestId("panel-zona")).toBeVisible()
  })
})

test.describe("Forja · repetición del día y sala de control", () => {
  test("repetir el día a 1200×: arranca de cero, suma ventas y al llegar al presente vuelve a en vivo", async ({ page }) => {
    test.setTimeout(180_000)
    await ingresar(page, "dueno@demo.quvant.app")
    await activarForja(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    const linea = page.getByTestId("linea-tiempo")
    await expect(linea).toHaveAttribute("data-modo", "vivo")

    await page.getByTestId("velocidad-1200").click()
    await page.getByTestId("repetir").click()
    await expect(linea).toHaveAttribute("data-modo", "repeticion")
    await expect(page.getByText("REPETICIÓN")).toBeVisible()
    await expect.poll(() => ventasHoy(page)).toBeLessThan(5)
    await expect.poll(() => ventasHoy(page), { timeout: 30_000 }).toBeGreaterThan(5)
    // De 8:00 a 15:30 son unos 22 s a 1200×
    await expect(linea).toHaveAttribute("data-modo", "vivo", { timeout: 45_000 })

    // Con el teclado: Inicio lleva al principio del día, en pausa
    await page.getByTestId("cursor-dia").focus()
    await page.keyboard.press("Home")
    await expect(linea).toHaveAttribute("data-modo", "repeticion")
    await expect(page.getByTestId("repetir")).toHaveAttribute("aria-label", "Seguir la repetición")
    expect(await ventasHoy(page)).toBeLessThanOrEqual(1)
    await page.getByTestId("volver-en-vivo").click()
    await expect(linea).toHaveAttribute("data-modo", "vivo")
  })

  test("sala de control: recorre la red y cada sucursal cada 20 s, con titulares y sellos visibles", async ({ page }) => {
    test.setTimeout(150_000)
    await ingresar(page, "dueno@demo.quvant.app")
    await activarForja(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await page.getByTestId("abrir-sala").click()
    const sala = page.getByTestId("sala-control")
    await expect(sala).toHaveAttribute("data-parada", "red")
    await expect(page.getByTestId("sala-parada")).toHaveText("Toda la red")
    await expect(page.getByTestId("titular").first()).toBeVisible()
    await expect(page.getByText("SIMULACIÓN")).toBeVisible()
    await expect(page.getByTestId("linea-tiempo")).toHaveCount(0)

    await page.clock.fastForward(20_500)
    await expect(sala).not.toHaveAttribute("data-parada", "red")
    await expect(page.getByTestId("sala-parada")).not.toHaveText("Toda la red")

    await page.getByTestId("salir-sala").click()
    await expect(sala).toHaveCount(0)
    await expect(page.getByTestId("linea-tiempo")).toBeVisible()
  })
})

test.describe("Forja · activación", () => {
  test("la Q se traza, el punto salta y la grilla se vuelve el mapa: termina sola, enciende las sucursales y no vuelve a aparecer", async ({ page }) => {
    test.setTimeout(150_000)
    await ingresar(page, "dueno@demo.quvant.app")
    await page.goto("/app/extensiones")
    await page.getByTestId("activar-forja").click()
    await page.waitForURL(/\/app\/forja/)
    const activacion = page.getByTestId("activacion")
    await expect(activacion).toBeVisible({ timeout: 30_000 })
    await expect(activacion).toHaveAttribute("data-modo", "animada")
    // La placa nueva: «Forja · by Quvant» y su frase (borrador en src/config/forja.ts)
    await expect(activacion.getByRole("img", { name: "Forja, by Quvant" }).first()).toBeAttached()
    await expect(activacion.getByTestId("frase-forja")).toHaveText(FORJA.frase)
    // Dura 4,5 s como máximo
    await expect(activacion).toHaveCount(0, { timeout: 10_000 })
    await expect(page.locator("[data-entrada=encender]")).toHaveCount(1)
    await expect(page).not.toHaveURL(/activacion=1/)

    // Quedó guardada en las preferencias: al volver a Forja no se repite sola
    await expect(page.getByTestId("estado-conexion")).toHaveText("Sincronizado", { timeout: 15_000 })
    await page.goto("/app/forja")
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await expect(activacion).toHaveCount(0)

    // Desde Extensiones se puede ver de nuevo, y se salta con Esc
    await page.goto("/app/extensiones")
    await page.getByRole("link", { name: "Ver la activación" }).click()
    await expect(activacion).toBeVisible({ timeout: 30_000 })
    await page.keyboard.press("Escape")
    await expect(activacion).toHaveCount(0, { timeout: 5_000 })
  })
})

test.describe("Forja · pieza (nivel 3)", () => {
  test("⌘K abre el recorrido de un producto; desde el taller y por número de serie, la historia de una máquina", async ({ page }) => {
    test.setTimeout(180_000)
    await ingresar(page, "dueno@demo.quvant.app")
    await activarForja(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    const buscador = page.getByPlaceholder("Buscar productos, clientes o ir a…")
    const panel = page.getByTestId("panel-pieza")

    // Recorrido de un SKU desde el buscador: stock y marca en cada sucursal, movimientos con saldo
    await page.keyboard.press("Control+k")
    await buscador.fill("Taladro percutor 650 W 13 mm Vulkor")
    await page.getByRole("option", { name: /Recorrido de Taladro percutor 650 W 13 mm Vulkor/ }).click()
    await expect(panel).toHaveAttribute("data-tipo", "producto", { timeout: 15_000 })
    await expect(page.locator("[data-nivel=pieza]")).toBeVisible()
    await expect(page.getByTestId("marca-pieza")).toHaveCount(3)
    await expect(panel.getByTestId("stock-pieza").locator("> li")).toHaveCount(3)
    await expect(panel.getByTestId("movimientos-pieza")).toContainText("queda")
    await expect(page).not.toHaveURL(/pieza=/)
    await page.keyboard.press("Escape")
    await expect(panel).toHaveCount(0)
    await expect(page.locator("[data-nivel=red]")).toBeVisible()

    // Historia de una máquina desde una orden del taller (el nodo sigue al mapa: se entra con el teclado, no con un clic por coordenadas)
    await page.locator("[data-nodo=CC] button").focus()
    await page.keyboard.press("Enter")
    await expect(page.getByTestId("forja-taller")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await page.getByTestId("zona-servicio").click()
    await page.getByTestId("fila-orden").first().click()
    await page.getByTestId("ver-historia-maquina").click()
    await expect(panel).toHaveAttribute("data-tipo", "maquina", { timeout: 15_000 })
    await expect(page.getByTestId("forja-taller")).toHaveCount(0)
    await expect(panel.getByTestId("ordenes-maquina").locator("> li").first()).toBeVisible()
    await expect(panel).toContainText("Quvant todavía no registra números de serie")
    const serie = (await panel.locator("header").innerText()).match(/SN\d+/)![0]

    // Y por número de serie desde el buscador
    await page.keyboard.press("Escape")
    await page.keyboard.press("Control+k")
    await buscador.fill(serie)
    await page.getByRole("option", { name: /Historia de/ }).first().click()
    await expect(panel).toHaveAttribute("data-tipo", "maquina", { timeout: 15_000 })
    await expect(panel).toContainText(serie)
  })
})

test.describe("Forja · versión 2D", () => {
  test.use({ reducedMotion: "reduce" })

  test("con movimiento reducido: mapa SVG y plano de planta, mismos paneles, sin MapLibre, deck.gl ni three.js", async ({ page }) => {
    test.setTimeout(180_000)
    await ingresar(page, "dueno@demo.quvant.app")
    const scripts = registrarScripts(page)
    await activarForja(page)
    const red = page.getByTestId("forja-red")
    await expect(red).toHaveAttribute("data-modo", "2d", { timeout: 60_000 })
    await expect(page.getByTestId("nodo-forja")).toHaveCount(3)
    await expect(page.getByTestId("alternar-2d")).toHaveAttribute("aria-pressed", "true")

    // Tarjeta del nodo y detalle de la transferencia, como en el mapa
    await page.locator("[data-nodo=CC] button").hover({ force: true })
    await expect(page.getByTestId("tarjeta-nodo")).toContainText("Ventas de hoy")
    await page.mouse.move(5, 5)
    await page.getByTestId("transferencia-en-transito").first().click()
    await expect(page.getByTestId("detalle-transferencia")).toContainText("En camino")
    await page.getByTestId("vista-constelacion").click()
    await expect(red).toHaveAttribute("data-vista", "constelacion")
    await page.getByTestId("vista-mapa").click()

    // Plano de planta: racks con sus productos al pasar, zonas con su panel
    await page.locator("[data-nodo=CC] button").click({ force: true })
    const taller = page.getByTestId("forja-taller")
    await expect(taller).toHaveAttribute("data-listo", "true", { timeout: 30_000 })
    await expect(taller).toHaveAttribute("data-modo", "2d")
    await page.locator("[data-rack]").first().hover()
    await expect(page.getByTestId("tooltip-rack")).toBeVisible()
    await page.getByTestId("zona-servicio").click()
    await expect(page.getByTestId("panel-zona")).toHaveAttribute("data-zona", "servicio")
    await expect(page.getByTestId("banco-orden").first()).toBeVisible()
    await page.keyboard.press("Escape")
    await page.keyboard.press("Escape")
    await expect(taller).toHaveCount(0, { timeout: 10_000 })

    const texto = await scripts()
    expect(texto).not.toContain("maplibregl-canvas")
    expect(texto).not.toContain("THREE.WebGLRenderer")
  })
})

test.describe("Forja · interruptor 2D/3D", () => {
  test("se puede pasar a 2D a mano y queda recordado en el navegador", async ({ page }) => {
    test.setTimeout(150_000)
    await ingresar(page, "dueno@demo.quvant.app")
    await activarForja(page)
    const red = page.getByTestId("forja-red")
    await expect(red).toHaveAttribute("data-modo", "3d", { timeout: 60_000 })
    await page.getByTestId("alternar-2d").click()
    await expect(red).toHaveAttribute("data-modo", "2d")
    await page.reload()
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-modo", "2d", { timeout: 60_000 })
    await page.getByTestId("alternar-2d").click()
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-modo", "3d", { timeout: 60_000 })
  })
})

test.describe("Forja · teclado y robustez", () => {
  test("se recorre con el teclado: flechas entre sucursales y zonas, Enter para entrar, Esc para volver", async ({ page }) => {
    test.setTimeout(180_000)
    await ingresar(page, "dueno@demo.quvant.app")
    await activarForja(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    const nodos = page.getByTestId("nodo-forja").locator("button")
    await nodos.first().focus()
    await page.keyboard.press("ArrowRight")
    await expect(nodos.nth(1)).toBeFocused()
    await page.keyboard.press("End")
    await expect(nodos.last()).toBeFocused()
    await page.keyboard.press("Home")
    await expect(nodos.first()).toBeFocused()
    // La tarjeta del nodo también aparece con el foco
    await expect(page.getByTestId("tarjeta-nodo")).toBeVisible()
    await page.keyboard.press("Enter")
    await expect(page.getByTestId("forja-taller")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })

    const zonas = page.getByRole("navigation", { name: /Zonas de la sucursal/ }).locator("button")
    await zonas.first().focus()
    await page.keyboard.press("ArrowRight")
    await expect(zonas.nth(1)).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page.getByTestId("panel-zona")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("panel-zona")).toHaveCount(0)
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("forja-taller")).toHaveCount(0, { timeout: 15_000 })
  })

  test("si el navegador pierde el contexto WebGL, el taller sigue en el plano 2D", async ({ page }) => {
    test.setTimeout(180_000)
    await ingresar(page, "dueno@demo.quvant.app")
    await activarForja(page)
    await expect(page.getByTestId("forja-red")).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await page.locator("[data-nodo=CC] button").click({ force: true })
    const taller = page.getByTestId("forja-taller")
    await expect(taller).toHaveAttribute("data-listo", "true", { timeout: 60_000 })
    await expect(taller).toHaveAttribute("data-modo", "3d")
    await page.evaluate(() => {
      const lienzo = document.querySelector("[data-testid=forja-taller] canvas") as HTMLCanvasElement
      lienzo.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()
    })
    await expect(taller).toHaveAttribute("data-modo", "2d", { timeout: 10_000 })
    await expect(page.getByTestId("aviso-contexto")).toBeVisible()
    await page.getByTestId("zona-deposito").click()
    await expect(page.getByTestId("panel-zona")).toHaveAttribute("data-zona", "deposito")
  })
})
