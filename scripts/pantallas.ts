import type { Page } from "@playwright/test"

/** Recorre la página para que se monten las secciones que cargan al entrar en pantalla. */
export async function recorrer(p: Page) {
  const alto = await p.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < alto; y += 600) {
    await p.evaluate((n) => window.scrollTo(0, n), y)
    await p.waitForTimeout(120)
  }
  await p.waitForTimeout(1500)
  await p.evaluate(() => window.scrollTo(0, 0))
}

export type Pantalla = {
  id: string
  ruta: string
  /** Inicia sesión con este usuario demo antes de capturar. */
  usuario?: string
  /** Espera a este selector antes de capturar. */
  esperar?: string
  /** Acciones previas a la captura (abrir un diálogo, etc.). */
  antes?: (p: Page) => Promise<void>
  paginaCompleta?: boolean
  /** Se copia a public/capturas para usarla en el sitio. */
  publica?: boolean
  soloEscritorio?: boolean
  tema?: "claro" | "oscuro"
  /** Subcarpeta dentro de docs/capturas (p. ej. "forja"). */
  carpeta?: string
}

/** Entra a una presentación con clave (si hace falta) y va a la escena n. */
export function escena(n: number, clave = process.env.INVERSORES_KEY ?? "yunque-demo") {
  return async (p: Page) => {
    if (await p.locator("#clave").count()) {
      await p.locator("#clave").fill(clave)
      await p.getByRole("button", { name: "Entrar" }).click()
    }
    await p.getByTestId("presentacion-play").waitFor({ timeout: 60_000 })
    await p.evaluate((k) => (window.location.hash = String(k)), n)
    await p.locator(`[data-escena]:not([aria-hidden=true])`).first().waitFor()
    await p.waitForTimeout(4000)
  }
}

const ESCENAS_CLIENTE = ["portada", "su-problema", "su-marca", "un-dia", "corte", "como-empezamos", "socio-fundador"]

const ESCENAS_INVERSORES = ["apertura", "problema", "terreno", "solucion", "demo", "diferencial", "modelo", "estado", "hoja-de-ruta", "inversion", "equipo", "cierre"]

/** Activa Forja desde Extensiones (los datos de la demo viven en el navegador de cada captura). */
export async function activarForja(p: Page) {
  await p.goto(p.url().replace(/\/app.*$/, "/app/extensiones"))
  await p.getByTestId("activar-forja").click()
  await p.waitForURL(/\/app\/forja/)
  await p.getByTestId("forja").waitFor({ timeout: 30_000 })
  await p.waitForTimeout(1500)
}

/** Pantallas a capturar. Se completa a medida que se construye cada fase. */
export const PANTALLAS: Pantalla[] = [
  { id: "marca", ruta: "/marca", paginaCompleta: true },
  { id: "sitio", ruta: "/", paginaCompleta: true, antes: recorrer },
  { id: "sitio-hero", ruta: "/" },
  {
    id: "sitio-nunca-se-cae",
    ruta: "/",
    antes: async (p) => {
      await p.locator("#nunca-se-cae").scrollIntoViewIfNeeded()
      const demo = p.getByTestId("demo-conexion")
      await demo.waitFor()
      await demo.getByRole("button").first().click()
      await p.waitForTimeout(800)
      await demo.getByTestId("demo-interruptor").click()
      await demo.getByRole("button").nth(1).click()
      await demo.getByRole("button").nth(3).click()
      await p.locator("#titulo-nunca").scrollIntoViewIfNeeded()
    },
  },
  { id: "ingresar", ruta: "/ingresar" },
  { id: "app-tablero", ruta: "/app", usuario: "dueno@demo.yunque.app", esperar: "[data-testid=ventas-hoy]", publica: true },
  { id: "app-tablero-mostrador", ruta: "/app", usuario: "mostrador@demo.yunque.app", esperar: "#contenido h1" },
  {
    id: "app-mostrador",
    ruta: "/app/mostrador",
    usuario: "mostrador@demo.yunque.app",
    esperar: "[data-testid=buscador-productos]",
    publica: true,
    antes: async (p) => {
      for (const q of ["amoladora angular 115", "disco de corte metal 115", "guantes de nitrilo"]) {
        await p.getByTestId("buscador-productos").fill(q)
        await p.getByRole("option").first().waitFor()
        await p.getByTestId("buscador-productos").press("Enter")
      }
      await p.getByTestId("buscador-productos").blur()
    },
  },
  {
    id: "app-mostrador-cobro",
    ruta: "/app/mostrador",
    usuario: "mostrador@demo.yunque.app",
    esperar: "[data-testid=buscador-productos]",
    soloEscritorio: true,
    antes: async (p) => {
      await p.getByTestId("buscador-productos").fill("hidrolavadora 135")
      await p.getByRole("option").first().waitFor()
      await p.getByTestId("buscador-productos").press("Enter")
      await p.getByTestId("cobrar").click()
      await p.getByRole("button", { name: "Mercado Pago" }).click()
    },
  },
  { id: "app-inventario", ruta: "/app/inventario", usuario: "deposito@demo.yunque.app", esperar: "[role=table]", publica: true },
  {
    id: "app-inventario-producto",
    ruta: "/app/inventario",
    usuario: "dueno@demo.yunque.app",
    esperar: "[role=table]",
    antes: async (p) => {
      await p.getByRole("row").nth(3).click()
      await p.getByTestId("detalle-producto").waitFor()
    },
  },
  { id: "app-conteos", ruta: "/app/inventario/conteos", usuario: "deposito@demo.yunque.app", esperar: "#contenido h1" },
  { id: "app-precios", ruta: "/app/precios", usuario: "compras@demo.yunque.app", esperar: "[role=table]", publica: true },
  { id: "app-presupuestos", ruta: "/app/presupuestos", usuario: "mostrador@demo.yunque.app", esperar: "[role=table]", publica: true },
  {
    id: "app-presupuesto-detalle",
    ruta: "/app/presupuestos",
    usuario: "mostrador@demo.yunque.app",
    esperar: "[role=table]",
    antes: async (p) => {
      await p.getByRole("row").nth(1).click()
      await p.getByTestId("detalle-presupuesto").waitFor()
    },
  },
  {
    id: "ingresar-2fa",
    ruta: "/ingresar",
    antes: async (p) => {
      await p.getByLabel("Email").fill("dueno@demo.yunque.app")
      await p.getByLabel("Contraseña").fill("demo1234")
      await p.getByRole("button", { name: "Ingresar" }).click()
      await p.waitForURL(/verificar/)
      await p.getByTestId("codigo-demo").waitFor()
    },
  },
  { id: "app-servicio", ruta: "/app/servicio", usuario: "tecnico@demo.yunque.app", esperar: "#contenido h1", publica: true, antes: async (p) => p.getByLabel("Solo mis órdenes").uncheck() },
  {
    id: "app-servicio-orden",
    ruta: "/app/servicio",
    usuario: "admin@demo.yunque.app",
    esperar: "#contenido h1",
    antes: async (p) => {
      await p.getByRole("region", { name: "Listo para retirar" }).getByRole("button").first().click()
      await p.getByTestId("detalle-orden").waitFor()
    },
  },
  { id: "app-clientes", ruta: "/app/clientes", usuario: "admin@demo.yunque.app", esperar: "[role=table]", publica: true },
  {
    id: "app-cliente-cuenta",
    ruta: "/app/clientes?filtro=deudores",
    usuario: "admin@demo.yunque.app",
    esperar: "[role=table]",
    antes: async (p) => {
      await p.getByRole("row").nth(1).click()
      await p.getByTestId("ficha-cliente").waitFor()
    },
  },
  { id: "app-compras", ruta: "/app/compras", usuario: "compras@demo.yunque.app", esperar: "[role=table]" },
  { id: "app-compras-sugerencias", ruta: "/app/compras", usuario: "compras@demo.yunque.app", esperar: "[role=table]", antes: async (p) => p.getByRole("tab", { name: /Sugerencias/ }).click() },
  { id: "app-entregas", ruta: "/app/entregas", usuario: "deposito@demo.yunque.app", esperar: "#contenido h1" },
  { id: "app-reportes", ruta: "/app/reportes", usuario: "dueno@demo.yunque.app", esperar: "#contenido h1", publica: true, paginaCompleta: true },
  { id: "app-usuarios", ruta: "/app/usuarios", usuario: "dueno@demo.yunque.app", esperar: "#contenido h1" },
  { id: "app-permisos", ruta: "/app/usuarios", usuario: "dueno@demo.yunque.app", esperar: "#contenido h1", soloEscritorio: true, antes: async (p) => p.getByRole("tab", { name: "Matriz de permisos" }).click() },
  { id: "app-configuracion", ruta: "/app/configuracion", usuario: "dueno@demo.yunque.app", esperar: "#contenido h1", publica: true },
  { id: "app-importar", ruta: "/app/importar", usuario: "compras@demo.yunque.app", esperar: "#contenido h1" },
  { id: "app-auditoria", ruta: "/app/auditoria", usuario: "dueno@demo.yunque.app", esperar: "[role=table]" },
  { id: "estado", ruta: "/estado", esperar: "h1" },
  { id: "inversores-clave", ruta: "/inversores", esperar: "#clave" },
  { id: "forja-extensiones", ruta: "/app/extensiones", usuario: "dueno@demo.yunque.app", esperar: "[data-testid=extension-forja]", carpeta: "forja" },
  { id: "forja-red-base", ruta: "/app", usuario: "dueno@demo.yunque.app", esperar: "#contenido h1", carpeta: "forja", antes: activarForja },
  ...ESCENAS_INVERSORES.map((nombre, i) => ({
    id: `inversores-${String(i + 1).padStart(2, "0")}-${nombre}`,
    ruta: "/inversores",
    antes: escena(i + 1),
  })),
  ...ESCENAS_CLIENTE.map((nombre, i) => ({
    id: `demo-ferremix-${String(i + 1).padStart(2, "0")}-${nombre}`,
    ruta: "/demo/ferremix",
    antes: escena(i + 1),
  })),
]
