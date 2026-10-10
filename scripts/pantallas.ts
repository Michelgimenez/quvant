import type { Page } from "@playwright/test"

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
}

/** Pantallas a capturar. Se completa a medida que se construye cada fase. */
export const PANTALLAS: Pantalla[] = [
  { id: "marca", ruta: "/marca", paginaCompleta: true },
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
]
