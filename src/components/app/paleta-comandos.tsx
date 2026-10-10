"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { FilePlus2, Moon, Package, RefreshCw, ShoppingCart, Sun, Unplug, User } from "lucide-react"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { TODOS_LOS_ITEMS } from "@/cliente/navegacion"
import { corteSimulado, setCorteSimulado } from "@/cliente/red"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command"
import { normalizar } from "@/lib/texto"

export const EVENTO_ABRIR_PALETA = "yunque:abrir-paleta"

/** Buscador ⌘K: ir a un módulo, buscar productos y clientes, acciones rápidas. */
export function PaletaComandos() {
  const [abierta, setAbierta] = useState(false)
  const [texto, setTexto] = useState("")
  const router = useRouter()
  const { puede, moduloActivo, motor } = useApp()
  const { e, v } = useDatos()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault()
        setAbierta((a) => !a)
      }
    }
    const abrir = () => setAbierta(true)
    window.addEventListener("keydown", tecla)
    window.addEventListener(EVENTO_ABRIR_PALETA, abrir)
    return () => {
      window.removeEventListener("keydown", tecla)
      window.removeEventListener(EVENTO_ABRIR_PALETA, abrir)
    }
  }, [])

  const q = normalizar(texto)
  const productos = useMemo(() => {
    if (q.length < 2 || !puede("inventario.ver")) return []
    return Object.values(e.productos)
      .filter((p) => normalizar(p.nombre).includes(q) || p.sku.toLowerCase().includes(q) || p.codigoBarras === texto.trim())
      .slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, v])
  const clientes = useMemo(() => {
    if (q.length < 2 || !puede("clientes.ver")) return []
    return Object.values(e.clientes)
      .filter((c) => normalizar(c.nombre).includes(q) || c.cuit.includes(q))
      .slice(0, 5)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, v])

  const ir = (href: string) => {
    setAbierta(false)
    setTexto("")
    router.push(href)
  }

  const items = TODOS_LOS_ITEMS.filter((i) => puede(i.permiso) && (!i.modulo || moduloActivo(i.modulo)))

  return (
    <CommandDialog open={abierta} onOpenChange={setAbierta} title="Buscar en Yunque" description="Módulos, productos, clientes y acciones">
      <CommandInput placeholder="Buscar productos, clientes o ir a…" value={texto} onValueChange={setTexto} />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        {productos.length > 0 && (
          <CommandGroup heading="Productos">
            {productos.map((p) => (
              <CommandItem key={p.id} value={`producto ${p.nombre} ${p.sku}`} onSelect={() => ir(`/app/inventario?producto=${p.id}`)}>
                <Package />
                <span className="truncate">{p.nombre}</span>
                <CommandShortcut className="num">{p.sku}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {clientes.length > 0 && (
          <CommandGroup heading="Clientes">
            {clientes.map((c) => (
              <CommandItem key={c.id} value={`cliente ${c.nombre} ${c.cuit}`} onSelect={() => ir(`/app/clientes?cliente=${c.id}`)}>
                <User />
                <span className="truncate">{c.nombre}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Acciones">
          {puede("mostrador.vender") && moduloActivo("mostrador") && (
            <CommandItem value="nueva venta mostrador" onSelect={() => ir("/app/mostrador")}>
              <ShoppingCart /> Nueva venta <CommandShortcut>G M</CommandShortcut>
            </CommandItem>
          )}
          {puede("presupuestos.editar") && moduloActivo("presupuestos") && (
            <CommandItem value="nuevo presupuesto" onSelect={() => ir("/app/presupuestos/nuevo")}>
              <FilePlus2 /> Nuevo presupuesto
            </CommandItem>
          )}
          <CommandItem
            value="sincronizar ahora"
            onSelect={() => {
              setAbierta(false)
              void motor.sincronizar()
            }}
          >
            <RefreshCw /> Sincronizar ahora
          </CommandItem>
          <CommandItem
            value="simular corte de conexión"
            onSelect={() => {
              setAbierta(false)
              setCorteSimulado(!corteSimulado())
            }}
          >
            <Unplug /> {corteSimulado() ? "Restablecer conexión (simulada)" : "Simular corte de conexión"}
          </CommandItem>
          <CommandItem
            value="cambiar tema claro oscuro"
            onSelect={() => {
              setAbierta(false)
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }}
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />} Modo {resolvedTheme === "dark" ? "claro" : "oscuro"}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ir a">
          {items.map((i) => (
            <CommandItem key={i.href} value={`ir ${i.nombre}`} onSelect={() => ir(i.href)}>
              <i.icono /> {i.nombre}
              {i.atajo && <CommandShortcut>G {i.atajo.toUpperCase()}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
