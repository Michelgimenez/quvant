"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Keyboard, LogOut, Menu, Moon, MoreHorizontal, RotateCcw, Search, Sun } from "lucide-react"
import { ProveedorApp, useApp, useCargaApp } from "@/cliente/app-contexto"
import { reiniciarDemo } from "@/cliente/motor-demo"
import { NAVEGACION, NAV_MOVIL, TODOS_LOS_ITEMS, itemActivo, itemVisible } from "@/cliente/navegacion"
import { borrar as borrarSesionLocal } from "@/cliente/sesion"
import { LogoOrg } from "@/components/base/logo-org"
import { Sello } from "@/components/base/sellos"
import { ConQuvantDiscreto } from "@/components/marca/con-quvant"
import { Isotipo } from "@/components/marca/quvant"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { NOMBRE_ROL } from "@/dominio/permisos"
import { textoSobre } from "@/lib/color"
import { cn } from "@/lib/utils"
import { salir } from "@/acciones/ingreso"
import { AtajosGlobales, EVENTO_AYUDA_ATAJOS } from "./atajos"
import { AvisosSincronizacion } from "./avisos-sync"
import { IndicadorConexion } from "./indicador-conexion"
import { EVENTO_ABRIR_PALETA, PaletaComandos } from "./paleta-comandos"

export function ShellApp({ children }: { children: React.ReactNode }) {
  const carga = useCargaApp()

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  if (carga.fase === "cargando") return <Apertura />
  if (carga.fase === "error") return <Apertura mensaje={carga.mensaje} />
  return (
    <ProveedorApp motor={carga.motor} servidor={carga.servidor} sesion={carga.sesion}>
      <Marco renovada={carga.renovada}>{children}</Marco>
    </ProveedorApp>
  )
}

function Apertura({ mensaje }: { mensaje?: string }) {
  return (
    <div className="grilla-puntos flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center" role="status" aria-live="polite">
      <Isotipo className={cn("h-10", !mensaje && "animate-pulse")} />
      <p className="t-texto-sm text-muted-foreground">{mensaje ?? "Abriendo tu sistema…"}</p>
      {mensaje && (
        <Button variant="outline" onClick={() => location.reload()}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

function Marco({ children, renovada }: { children: React.ReactNode; renovada: boolean }) {
  const { motor } = useApp()
  const org = motor.estado.org
  const pathname = usePathname()
  // El menú móvil queda abierto solo en la ruta donde se abrió: al navegar se cierra.
  const [menuEn, setMenuEn] = useState<string | null>(null)
  const menu = menuEn === pathname
  const setMenu = (abierto: boolean) => setMenuEn(abierto ? pathname : null)

  useEffect(() => {
    if (renovada) toast.info("La demo se renovó con datos de hoy.")
  }, [renovada])

  return (
    <div
      className="min-h-dvh"
      // El color de la empresa va solo en su logo, el indicador del módulo activo y la serie principal de sus gráficos.
      // --serie-1 se redefine acá porque los tokens se resuelven en el elemento donde se declaran.
      style={{ "--marca": org.colorAcento, "--marca-contraste": textoSobre(org.colorAcento), "--serie-1": org.colorAcento, "--chart-1": org.colorAcento } as React.CSSProperties}
    >
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <Lateral />
      </aside>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <Lateral />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-linea bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú">
              <Menu />
            </Button>
            <Link href="/app" className="flex min-w-0 items-center gap-2 lg:hidden">
              <LogoOrg org={org} alto="h-7" />
            </Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_PALETA))}
              className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-linea bg-superficie-2 px-3 text-muted-foreground transition-colors hover:border-gris-5 md:flex"
            >
              <Search className="size-4" />
              <span className="t-texto-sm flex-1 truncate whitespace-nowrap text-left">Buscar en Quvant</span>
              <Kbd>⌘K</Kbd>
            </button>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buscar" onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_PALETA))}>
                <Search />
              </Button>
              <SelectorSucursal />
              <IndicadorConexion compacto />
              <TemaBoton />
              <MenuUsuario />
            </div>
          </div>
        </header>
        <main id="contenido" className="px-3 pb-24 pt-4 sm:px-5 sm:pt-6 lg:pb-10">
          {children}
        </main>
      </div>

      <NavegacionMovil onMas={() => setMenu(true)} />
      <PaletaComandos />
      <AtajosGlobales />
      <AvisosSincronizacion />
    </div>
  )
}

function Lateral() {
  const { motor, puede, moduloActivo, extensionActiva, usuario } = useApp()
  const pathname = usePathname()
  const org = motor.estado.org
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pb-3 pt-5">
        <Link href="/app" className="min-w-0">
          <LogoOrg org={org} alto="h-9" />
        </Link>
      </div>
      {org.esDemo && (
        <div className="px-4 pb-2">
          <Sello titulo="Empresa ficticia con datos de demostración" />
        </div>
      )}
      <nav className="sin-scrollbar flex-1 space-y-5 overflow-y-auto px-2 py-3" aria-label="Módulos">
        {NAVEGACION.map((g) => {
          const items = g.items.filter((i) => itemVisible(i, puede, moduloActivo, extensionActiva))
          if (!items.length) return null
          return (
            <div key={g.grupo} className="space-y-0.5">
              <p className="t-etiqueta px-2.5 pb-1.5 text-muted-foreground">{g.grupo}</p>
              {items.map((i) => {
                const activo = itemActivo(pathname, i.href)
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    aria-current={activo ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 transition-colors t-texto-sm",
                      activo ? "bg-sidebar-accent font-medium text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    {activo && <span className="absolute inset-y-2 left-0 w-[3px]" style={{ background: "var(--marca)" }} aria-hidden />}
                    <i.icono className="size-4" />
                    {i.nombre}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>
      <div className="space-y-3 border-t border-sidebar-border px-4 py-3">
        <div className="min-w-0">
          <p className="t-texto-sm truncate font-medium">{usuario.nombre}</p>
          <p className="t-etiqueta truncate text-muted-foreground">{NOMBRE_ROL[usuario.rol]}</p>
        </div>
        <ConQuvantDiscreto />
      </div>
    </div>
  )
}

function SelectorSucursal() {
  const { sucursalId, setSucursalId, sucursalesPermitidas } = useApp()
  if (sucursalesPermitidas.length <= 1) {
    const s = sucursalesPermitidas[0]
    return s ? <span className="ficha hidden px-2 sm:inline">{s.codigo} · {s.nombre}</span> : null
  }
  return (
    <Select value={sucursalId} onValueChange={setSucursalId}>
      <SelectTrigger size="sm" className="h-8 w-auto max-w-44 gap-1.5 t-texto-sm" aria-label="Sucursal activa">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {sucursalesPermitidas.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="num text-muted-foreground">{s.codigo}</span> {s.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function TemaBoton() {
  const { resolvedTheme, setTheme } = useTheme()
  const oscuro = resolvedTheme !== "light"
  return (
    <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => setTheme(oscuro ? "light" : "dark")} aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
      {oscuro ? <Sun /> : <Moon />}
    </Button>
  )
}

function MenuUsuario() {
  const { usuario, motor, sesion } = useApp()
  const { resolvedTheme, setTheme } = useTheme()
  const iniciales = usuario.nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="t-etiqueta inline-flex size-8 items-center justify-center rounded-md border border-linea bg-secondary text-foreground tracking-normal" aria-label={`Cuenta de ${usuario.nombre}`}>
          {iniciales}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="t-texto-sm font-semibold">{usuario.nombre}</p>
          <p className="t-texto-sm font-normal text-muted-foreground">
            {NOMBRE_ROL[usuario.rol]} · {usuario.email}
          </p>
          {sesion.aal === "aal2" && <p className="t-texto-sm font-normal text-ok">Doble factor verificado</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.dispatchEvent(new CustomEvent(EVENTO_AYUDA_ATAJOS))}>
          <Keyboard /> Atajos de teclado
        </DropdownMenuItem>
        <DropdownMenuItem className="sm:hidden" onSelect={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}>
          {resolvedTheme === "light" ? <Moon /> : <Sun />} Modo {resolvedTheme === "light" ? "oscuro" : "claro"}
        </DropdownMenuItem>
        {motor.estado.org.esDemo && (
          <DropdownMenuItem
            onSelect={async () => {
              if (!confirm("¿Reiniciar los datos de la demo? Se pierden los cambios hechos en este navegador.")) return
              await reiniciarDemo(motor.estado.org.id)
              location.reload()
            }}
          >
            <RotateCcw /> Reiniciar datos de la demo
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action={salir} onSubmit={() => borrarSesionLocal()}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Salir
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NavegacionMovil({ onMas }: { onMas: () => void }) {
  const { usuario, puede, moduloActivo } = useApp()
  const pathname = usePathname()
  const items = NAV_MOVIL[usuario.rol]
    .map((href) => TODOS_LOS_ITEMS.find((i) => i.href === href)!)
    .filter((i) => i && puede(i.permiso) && (!i.modulo || moduloActivo(i.modulo)))
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Accesos rápidos">
      <ul className="grid grid-cols-5">
        {items.map((i) => {
          const activo = itemActivo(pathname, i.href)
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={activo ? "page" : undefined} className={cn("flex h-14 flex-col items-center justify-center gap-0.5 t-texto-sm", activo ? "text-foreground" : "text-muted-foreground")}>
                <i.icono className="size-5" style={activo ? { color: "var(--marca)" } : undefined} />
                <span className="max-w-full truncate px-1">{i.nombre.split(" ")[0]}</span>
              </Link>
            </li>
          )
        })}
        <li>
          <button type="button" onClick={onMas} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 t-texto-sm text-muted-foreground">
            <MoreHorizontal className="size-5" />
            Más
          </button>
        </li>
      </ul>
    </nav>
  )
}
