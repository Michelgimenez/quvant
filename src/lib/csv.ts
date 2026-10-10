/**
 * Exportación CSV pensada para Excel en español: separador ";" y BOM UTF-8
 * (así los acentos y los números se abren bien). "Tus datos, siempre exportables."
 */
export function aCSV(filas: (string | number | null | undefined)[][]) {
  const celda = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return ""
    const s = typeof v === "number" ? v.toLocaleString("es-AR", { useGrouping: false, maximumFractionDigits: 3 }) : v
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n")
}

export function descargarArchivo(nombre: string, contenido: string, tipo = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function descargarCSV(nombre: string, filas: (string | number | null | undefined)[][]) {
  descargarArchivo(nombre.endsWith(".csv") ? nombre : `${nombre}.csv`, aCSV(filas))
}

/** Importes en centavos → número en pesos para planillas. */
export const pesos = (c: number) => Math.round(c) / 100
