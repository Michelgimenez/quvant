import { defineConfig, devices } from "@playwright/test"

const PUERTO = Number(process.env.PUERTO_E2E ?? 3100)

/**
 * Tests de punta a punta contra el build de producción (`next start`).
 * Correr `npm run build` antes de `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "celular", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }, grep: /@celular/ },
  ],
  webServer: {
    command: `npx next start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/api/salud`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { INVERSORES_KEY: "quvant-demo", PANEL_KEY: "quvant-panel", SESION_SECRETO: "secreto-de-pruebas-e2e-no-usar-en-produccion" },
  },
})
