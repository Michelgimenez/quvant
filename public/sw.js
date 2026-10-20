/*
 * Service worker de Quvant: que la app abra sin internet.
 *
 * - Estáticos (/_next/static, íconos, marca): cache-first (son inmutables).
 * - Páginas de /app: network-first con respaldo en caché (si no hay red,
 *   se sirve la última versión guardada).
 * - Al instalarse precarga las rutas clave de la app y sus chunks, así el
 *   mostrador abre sin conexión aunque no se haya visitado antes.
 * - Los datos NO pasan por acá: viven en IndexedDB (réplica + cola).
 */
const VERSION = "quvant-v1"
const ESTATICOS = `${VERSION}-estaticos`
const PAGINAS = `${VERSION}-paginas`
const RUTAS = [
  "/app",
  "/app/mostrador",
  "/app/inventario",
  "/app/inventario/conteos",
  "/app/presupuestos",
  "/app/presupuestos/nuevo",
  "/app/precios",
  "/app/servicio",
  "/app/clientes",
  "/app/entregas",
]

async function precargar() {
  const paginas = await caches.open(PAGINAS)
  const estaticos = await caches.open(ESTATICOS)
  const recursos = new Set()
  for (const ruta of RUTAS) {
    try {
      const r = await fetch(ruta, { credentials: "same-origin" })
      // Sin sesión el proxy redirige al ingreso: eso no se guarda. El cuerpo se
      // cancela para liberar la conexión (si no, la precarga se traba).
      if (!r.ok || r.redirected) {
        await r.body?.cancel()
        continue
      }
      const html = await r.clone().text()
      await paginas.put(ruta, r)
      for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) recursos.add(m[1])
    } catch {
      /* sin red: se cachea a medida que se navega */
    }
  }
  // De a 4 por vez para no acaparar las conexiones del navegador.
  const cola = [...recursos]
  const trabajador = async () => {
    for (let u = cola.shift(); u; u = cola.shift()) {
      try {
        if (await estaticos.match(u)) continue
        const r = await fetch(u)
        if (r.ok) await estaticos.put(u, r)
        else await r.body?.cancel()
      } catch {
        /* se cachea cuando se use */
      }
    }
  }
  await Promise.all([trabajador(), trabajador(), trabajador(), trabajador()])
}

self.addEventListener("install", (e) => {
  self.skipWaiting()
  e.waitUntil(precargar())
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("message", (e) => {
  if (e.data === "precargar") e.waitUntil?.(precargar())
})

function esEstatico(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/marca/") || url.pathname.startsWith("/demo/") || /\.(?:png|svg|ico|woff2?)$/.test(url.pathname)
}

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (esEstatico(url)) {
    e.respondWith(
      caches.open(ESTATICOS).then(async (c) => {
        const guardado = await c.match(req)
        if (guardado) return guardado
        const r = await fetch(req)
        if (r.ok) c.put(req, r.clone())
        return r
      }),
    )
    return
  }

  if (req.mode === "navigate" && url.pathname.startsWith("/app")) {
    e.respondWith(
      (async () => {
        const c = await caches.open(PAGINAS)
        try {
          const r = await fetch(req)
          if (r.ok && !r.redirected) c.put(url.pathname, r.clone())
          return r
        } catch {
          return (await c.match(url.pathname)) || (await c.match("/app")) || new Response("Sin conexión", { status: 503 })
        }
      })(),
    )
  }
})
