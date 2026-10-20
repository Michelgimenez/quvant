"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Download, Search, UserPlus, Users } from "lucide-react"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { EncabezadoPagina, Requiere, Vacio } from "@/components/app/pagina"
import { TablaRapida, type Columna } from "@/components/app/tabla-rapida"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatoPesos, formatoPesosCorto } from "@/dominio/dinero"
import type { Cliente, Id } from "@/dominio/tipos"
import { descargarCSV, pesos } from "@/lib/csv"
import { normalizar } from "@/lib/texto"
import { cn } from "@/lib/utils"
import { DialogoCliente, FichaCliente } from "./ficha"

type Filtro = "todos" | "cuenta" | "excedidos" | "deudores"

export function Clientes() {
  const { e, v } = useDatos()
  const { puede } = useApp()
  const params = useSearchParams()
  const router = useRouter()
  const [texto, setTexto] = useState("")
  const [filtro, setFiltro] = useState<Filtro>((params.get("filtro") as Filtro) ?? "todos")
  const [alta, setAlta] = useState(false)
  const seleccionado = params.get("cliente")

  // Saldos y última compra en una pasada
  const resumen = useMemo(() => {
    const saldo: Record<Id, number> = {}
    const ultima: Record<Id, string> = {}
    for (const m of e.movimientosCuenta) saldo[m.clienteId] = (saldo[m.clienteId] ?? 0) + m.importe
    for (const venta of Object.values(e.ventas)) if (venta.clienteId && (!ultima[venta.clienteId] || venta.fecha > ultima[venta.clienteId])) ultima[venta.clienteId] = venta.fecha
    return { saldo, ultima }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  const filas = useMemo(() => {
    const q = normalizar(texto)
    return Object.values(e.clientes)
      .filter((c) => !q || normalizar(`${c.nombre} ${c.cuit} ${c.telefono} ${c.email}`).includes(q))
      .filter((c) => {
        const s = resumen.saldo[c.id] ?? 0
        if (filtro === "cuenta") return c.limiteCredito > 0
        if (filtro === "excedidos") return c.limiteCredito > 0 && s > c.limiteCredito
        if (filtro === "deudores") return s > 0
        return true
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, texto, filtro, resumen])

  const abrir = (id: string | null) => router.replace(id ? `/app/clientes?cliente=${id}` : "/app/clientes", { scroll: false })
  const totalACobrar = Object.values(resumen.saldo).reduce((t, s) => t + Math.max(0, s), 0)
  const lista = (id: Id) => e.listas.find((l) => l.id === id)?.nombre ?? ""

  const columnas: Columna<Cliente>[] = [
    {
      id: "nombre",
      encabezado: "Cliente",
      ancho: "minmax(220px,2fr)",
      orden: (c) => c.nombre,
      celda: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{c.nombre}</p>
          <p className="ficha truncate">{c.cuit || c.condicionIva}</p>
        </div>
      ),
    },
    { id: "contacto", encabezado: "WhatsApp", ancho: "150px", celda: (c) => <span className="num t-texto-sm text-muted-foreground">{c.whatsapp}</span> },
    { id: "lista", encabezado: "Lista", ancho: "100px", orden: (c) => lista(c.listaId), celda: (c) => <span className="t-texto-sm">{lista(c.listaId)}</span> },
    {
      id: "saldo",
      encabezado: "Saldo",
      ancho: "120px",
      alinear: "der",
      orden: (c) => resumen.saldo[c.id] ?? 0,
      celda: (c) => {
        const s = resumen.saldo[c.id] ?? 0
        return <span className={cn("num", s > c.limiteCredito && c.limiteCredito > 0 ? "font-semibold text-error" : s > 0 ? "" : "text-muted-foreground")}>{s ? formatoPesos(s, { sinDecimales: true }) : "—"}</span>
      },
    },
    { id: "limite", encabezado: "Límite", ancho: "110px", alinear: "der", orden: (c) => c.limiteCredito, celda: (c) => <span className="num t-texto-sm text-muted-foreground">{c.limiteCredito ? formatoPesosCorto(c.limiteCredito) : "—"}</span> },
    { id: "ultima", encabezado: "Última compra", ancho: "110px", alinear: "der", orden: (c) => resumen.ultima[c.id] ?? "", celda: (c) => <span className="num t-texto-sm text-muted-foreground">{resumen.ultima[c.id] ? new Date(resumen.ultima[c.id]).toLocaleDateString("es-AR") : "—"}</span> },
  ]

  return (
    <Requiere permiso="clientes.ver" modulo="clientes">
      <EncabezadoPagina
        ficha={`Clientes · ${Object.keys(e.clientes).length} · ${formatoPesosCorto(totalACobrar)} a cobrar`}
        titulo="Clientes y cuentas corrientes"
        descripcion="Saldo, límite y movimientos de cada cliente."
        acciones={
          <>
            <Button
              variant="outline"
              onClick={() =>
                descargarCSV("clientes", [
                  ["Nombre", "CUIT", "Condición IVA", "WhatsApp", "Email", "Lista", "Saldo", "Límite"],
                  ...filas.map((c) => [c.nombre, c.cuit, c.condicionIva, c.whatsapp, c.email, lista(c.listaId), pesos(resumen.saldo[c.id] ?? 0), pesos(c.limiteCredito)]),
                ])
              }
            >
              <Download /> Exportar
            </Button>
            {puede("clientes.editar") && (
              <Button onClick={() => setAlta(true)}>
                <UserPlus /> Nuevo cliente
              </Button>
            )}
          </>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["todos", "Todos"],
            ["cuenta", "Con cuenta corriente"],
            ["deudores", "Con saldo"],
            ["excedidos", "Sobre su límite"],
          ] as const
        ).map(([id, nombre]) => (
          <button key={id} type="button" aria-pressed={filtro === id} onClick={() => setFiltro(id)} className={cn("h-8 rounded-full border px-3 t-texto-sm", filtro === id ? "border-foreground/30 bg-muted font-semibold" : "border-linea text-muted-foreground hover:text-foreground")}>
            {nombre}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Nombre, CUIT, teléfono" className="h-9 pl-9" aria-label="Buscar cliente" />
        </div>
      </div>
      <TablaRapida
        etiqueta="Clientes"
        filas={filas}
        columnas={columnas}
        clave={(c) => c.id}
        onElegir={(c) => abrir(c.id)}
        alto="calc(100dvh - 300px)"
        tarjeta={(c) => (
          <div className="flex w-full items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate t-texto-sm font-medium">{c.nombre}</p>
              <p className="ficha truncate">{c.cuit || c.condicionIva}</p>
            </div>
            <span className={cn("num t-texto-sm", (resumen.saldo[c.id] ?? 0) > c.limiteCredito && c.limiteCredito > 0 && "text-error")}>{resumen.saldo[c.id] ? formatoPesosCorto(resumen.saldo[c.id]) : "—"}</span>
          </div>
        )}
        vacio={<Vacio icono={Users} titulo="No hay clientes con ese filtro" />}
      />
      <FichaCliente id={seleccionado} onCerrar={() => abrir(null)} />
      {alta && <DialogoCliente onCerrar={() => setAlta(false)} onGuardado={(id) => abrir(id)} />}
    </Requiere>
  )
}
