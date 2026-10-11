import { NextResponse, type NextRequest } from "next/server"
import { clienteDemo } from "@/config/clientes"
import { exige2FA } from "@/dominio/permisos"
import { verificar } from "@/lib/auth/firma"
import { COOKIE_PRE_SESION, COOKIE_SESION, type Sesion } from "@/lib/auth/tipos"

/**
 * Chequeo optimista de sesión para /app (la autorización real está en la
 * base con RLS y en app.aplicar_operacion). Sin sesión → /ingresar.
 * Dueño o administración sin doble factor → /ingresar/verificar.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Demo comercial: solo los prospectos configurados en src/config/clientes/ (el resto, 404 real).
  // Los slugs no llevan punto: así no se tocan los archivos de public/demo/ (logos de la empresa demo).
  const demo = /^\/demo\/([^/.]+)\/?$/.exec(pathname)
  if (demo) {
    return clienteDemo(demo[1]) ? NextResponse.next() : NextResponse.rewrite(new URL("/_not-found", req.url), { status: 404 })
  }
  // Demo de Forja de un prospecto: solo si su configuración la tiene
  const forja = /^\/demo\/([^/.]+)\/forja\/?$/.exec(pathname)
  if (forja) {
    return clienteDemo(forja[1])?.forja ? NextResponse.next() : NextResponse.rewrite(new URL("/_not-found", req.url), { status: 404 })
  }

  const sesion = await verificar<Sesion>(req.cookies.get(COOKIE_SESION)?.value, "yunque-app")

  if (pathname.startsWith("/app")) {
    if (!sesion) {
      const url = new URL("/ingresar", req.url)
      url.searchParams.set("siguiente", pathname + search)
      return NextResponse.redirect(url)
    }
    if (exige2FA(sesion.rol) && sesion.aal !== "aal2") {
      const url = new URL("/ingresar/verificar", req.url)
      url.searchParams.set("siguiente", pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // /ingresar/verificar sin pre-sesión → volver al ingreso
  if (pathname === "/ingresar/verificar" && !req.cookies.has(COOKIE_PRE_SESION)) {
    return NextResponse.redirect(new URL("/ingresar?vencida=1", req.url))
  }

  // Con sesión válida, /ingresar lleva directo a la app
  if (pathname === "/ingresar" && sesion && (!exige2FA(sesion.rol) || sesion.aal === "aal2")) {
    return NextResponse.redirect(new URL("/app", req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/app/:path*", "/ingresar", "/ingresar/verificar", "/demo/:cliente", "/demo/:cliente/forja"],
}
