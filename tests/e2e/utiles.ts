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

export async function agregarProducto(page: Page, busqueda: string) {
  const buscador = page.getByTestId("buscador-productos")
  await buscador.fill(busqueda)
  await expect(page.getByRole("option").first()).toBeVisible()
  await buscador.press("Enter")
  await expect(page.getByTestId("carrito")).toBeVisible()
}

/** Si la caja del puesto está cerrada (p. ej. antes de las 8), la abre. */
export async function asegurarCaja(page: Page) {
  const abrir = page.getByRole("button", { name: "Abrir caja para cobrar" })
  if (await abrir.isVisible()) {
    await abrir.click()
    await page.getByRole("dialog").getByRole("button", { name: "Abrir caja" }).click()
    await expect(page.getByTestId("cobrar")).toBeVisible()
  }
}

export async function cobrarEnEfectivo(page: Page) {
  await asegurarCaja(page)
  await page.getByTestId("cobrar").click()
  await expect(page.getByTestId("total-cobro")).toBeVisible()
  await page.getByTestId("confirmar-venta").click()
  await expect(page.getByRole("heading", { name: "Venta registrada" })).toBeVisible()
}

/** Primer resultado del buscador del mostrador: nombre y stock en la sucursal ("12 u." o "sin stock"). */
export async function stockEnBuscador(page: Page, busqueda: string) {
  const buscador = page.getByTestId("buscador-productos")
  await buscador.fill(busqueda)
  const opcion = page.getByRole("option").first()
  await expect(opcion).toBeVisible()
  const texto = await opcion.innerText()
  await buscador.fill("")
  const m = /([\d.]+(?:,\d+)?) u\./.exec(texto)
  return { texto, stock: m ? Number(m[1].replaceAll(".", "").replace(",", ".")) : 0 }
}

export type OpResumen = { id: string; tipo: string; venta: string | null; ok: boolean; numero: number | null }

/** Lee de IndexedDB la cola local, lo confirmado en el dispositivo y el log del servidor demo. */
export async function leerBaseLocal(page: Page) {
  return page.evaluate(async () => {
    const nombre = (await indexedDB.databases()).map((d) => d.name ?? "").find((n) => n.startsWith("quvant-"))
    if (!nombre) throw new Error("No hay base local de Quvant")
    const db = await new Promise<IDBDatabase>((ok, mal) => {
      const r = indexedDB.open(nombre)
      r.onsuccess = () => ok(r.result)
      r.onerror = () => mal(r.error)
    })
    const todo = (store: string) =>
      new Promise<Record<string, unknown>[]>((ok, mal) => {
        const r = db.transaction(store).objectStore(store).getAll()
        r.onsuccess = () => ok(r.result)
        r.onerror = () => mal(r.error)
      })
    type Op = { id: string; tipo: string; datos?: { venta?: { id: string } } }
    type Conf = { op: Op; resultado: { ok: boolean; asignado?: { numero?: number } } }
    const deOp = (o: Op, r?: Conf["resultado"]) => ({
      id: o.id,
      tipo: o.tipo,
      venta: o.datos?.venta?.id ?? null,
      ok: r ? r.ok : false,
      numero: typeof r?.asignado?.numero === "number" ? r.asignado.numero : null,
    })
    const [pendientes, confirmadas, log] = await Promise.all([todo("pendientes"), todo("confirmadas"), todo("servidor_log")])
    db.close()
    return {
      pendientes: (pendientes as unknown as Op[]).map((o) => deOp(o)),
      confirmadas: (confirmadas as unknown as Conf[]).map((c) => deOp(c.op, c.resultado)),
      servidor: (log as unknown as Conf[]).map((c) => deOp(c.op, c.resultado)),
    }
  })
}
