import "server-only"

/**
 * Solo servidor: la presentación recibe estos datos después de validar la clave.
 *
 * Para qué es la inversión. Monto y porcentajes a completar por el equipo.
 * La presentación arma el gráfico de partes desde acá y muestra [COMPLETAR]
 * mientras no haya monto real.
 */
export const INVERSION = {
  montoUSD: null as number | null, // [COMPLETAR monto]
  montoTexto: "[COMPLETAR monto]",
  destino: [
    { id: "seguridad", nombre: "Seguridad y arquitectura", porcentaje: 25, detalle: "Auditoría externa, hardening, backups probados" },
    { id: "equipo", nombre: "Equipo de desarrollo", porcentaje: 40, detalle: "Desarrolladores senior full-stack y mobile" },
    { id: "pilotos", nombre: "Implementación de pilotos", porcentaje: 20, detalle: "Migraciones, capacitación y soporte en sitio" },
    { id: "ventas", nombre: "Ventas", porcentaje: 15, detalle: "Demos, socios fundadores y red comercial" },
  ],
  nota: "Porcentajes preliminares: [COMPLETAR con el plan definitivo]",
} as const

export const EQUIPO = [
  { nombre: "Michel", rol: "[COMPLETAR: rol]", foto: null as string | null, bio: "[COMPLETAR: bio corta]" },
  { nombre: "[COMPLETAR: socio]", rol: "[COMPLETAR: rol]", foto: null as string | null, bio: "[COMPLETAR: bio corta]" },
] as const

export const CONTACTO_INVERSORES = {
  nombre: "[COMPLETAR: nombre y apellido]",
  email: "[COMPLETAR: email]",
  telefono: "[COMPLETAR: teléfono]",
}
