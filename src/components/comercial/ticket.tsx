"use client"

import { createPortal } from "react-dom"
import { useDatos } from "@/cliente/app-contexto"
import { formatoCantidad, formatoPesos } from "@/dominio/dinero"
import type { Presupuesto, Venta } from "@/dominio/tipos"
import { ivaContenido, NOMBRE_MEDIO, subtotalItem } from "@/dominio/ventas"

/**
 * Comprobante imprimible (venta o presupuesto). Se monta en un portal con la
 * clase `area-impresion`: al imprimir solo se ve esto (ver globals.css).
 * Mientras no haya integración con ARCA, la venta dice "sin validez fiscal".
 */
export function Comprobante({ venta, presupuesto }: { venta?: Venta; presupuesto?: Presupuesto }) {
  const { e } = useDatos()
  const doc = venta ?? presupuesto
  if (!doc) return null
  const s = e.sucursales.find((x) => x.id === doc.sucursalId)
  const n = e.negocios.find((x) => x.id === doc.negocioId)
  const cliente = doc.clienteId ? e.clientes[doc.clienteId] : null
  const numero = doc.numero ? `#${doc.numero}` : `${doc.numeroLocal} (provisorio)`
  return (
    <div className="mx-auto max-w-[80mm] space-y-3 bg-white p-4 font-mono text-[11px] leading-snug text-black">
      <div className="text-center">
        <p className="text-sm font-bold">{n?.nombre ?? e.org.nombre}</p>
        <p>CUIT {n?.cuit}</p>
        <p>{s?.nombre} · {s?.direccion}</p>
        {e.org.esDemo && <p className="mt-1 border border-dashed border-black px-1 font-bold">DEMO · empresa ficticia</p>}
      </div>
      <div className="border-y border-dashed border-black py-1.5">
        <p className="font-bold">
          {venta ? `${venta.comprobante.tipo === "FA" ? "FACTURA A" : venta.comprobante.tipo === "FB" ? "FACTURA B" : "COMPROBANTE X"} ${numero}` : `PRESUPUESTO ${numero}`}
        </p>
        <p>{new Date(venta?.fecha ?? presupuesto!.fecha).toLocaleString("es-AR")}</p>
        <p>Cliente: {cliente?.nombre ?? presupuesto?.clienteNombre ?? "Consumidor final"}</p>
        {cliente?.cuit && <p>CUIT {cliente.cuit} · {cliente.condicionIva}</p>}
        {presupuesto && <p>Válido hasta {new Date(presupuesto.vencimiento).toLocaleDateString("es-AR")}</p>}
      </div>
      <table className="w-full">
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={i} className="align-top">
              <td className="pr-1">
                {formatoCantidad(it.cantidad)} × {it.descripcion}
                {it.descuentoPct > 0 && ` (−${it.descuentoPct}%)`}
              </td>
              <td className="whitespace-nowrap text-right">{formatoPesos(subtotalItem(it))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black pt-1.5">
        <p className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatoPesos(doc.total)}</span>
        </p>
        <p className="flex justify-between">
          <span>IVA contenido</span>
          <span>{formatoPesos(ivaContenido(doc.total))}</span>
        </p>
        {venta?.pagos.map((p, i) => (
          <p key={i} className="flex justify-between">
            <span>{NOMBRE_MEDIO[p.medio]}</span>
            <span>{formatoPesos(p.importe)}</span>
          </p>
        ))}
      </div>
      {venta && (
        <p className="text-center text-[10px]">
          {venta.comprobante.emulado ? "CAE emulado · comprobante sin validez fiscal (facturación ARCA en la hoja de ruta)" : `CAE ${venta.comprobante.cae}`}
        </p>
      )}
      {presupuesto?.notas && <p className="text-[10px]">{presupuesto.notas}</p>}
      <p className="text-center text-[10px]">Gracias por su compra · funciona con yunque</p>
    </div>
  )
}

/** Imprime un comprobante: lo monta en el área de impresión y llama a window.print(). */
export function AreaImpresion({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null
  return createPortal(<div className="area-impresion">{children}</div>, document.body)
}
