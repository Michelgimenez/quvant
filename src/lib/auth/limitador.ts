/**
 * Límite de intentos de ingreso. Misma política que app.ingreso_permitido()
 * en la base (supabase/migrations/…_ingreso_y_sitio.sql):
 *   - 5 fallos por email en 15 minutos → bloqueado
 *   - 20 fallos por IP en 15 minutos → bloqueado
 *   - un ingreso exitoso reinicia el contador del email
 *
 * Esta implementación en memoria sirve para el modo demo y para un único
 * servidor. En producción se usa la función de la base (compartida entre
 * instancias). El email nunca se guarda: solo su hash.
 */
export const VENTANA_MS = 15 * 60 * 1000
export const MAX_FALLOS_EMAIL = 5
export const MAX_FALLOS_IP = 20

type Intento = { emailHash: string; ip: string; exito: boolean; t: number }

export type Veredicto = { permitido: true; restantes: number } | { permitido: false; esperaSegundos: number }

export interface LimitadorIngreso {
  verificar(emailHash: string, ip: string): Promise<Veredicto>
  registrar(emailHash: string, ip: string, exito: boolean): Promise<void>
}

export class LimitadorMemoria implements LimitadorIngreso {
  private intentos: Intento[] = []
  constructor(private reloj: () => number = Date.now) {}

  async verificar(emailHash: string, ip: string): Promise<Veredicto> {
    const ahora = this.reloj()
    this.intentos = this.intentos.filter((i) => ahora - i.t < VENTANA_MS)
    // Orden de registro (no la hora): un éxito y un fallo en el mismo milisegundo no se confunden.
    const ultimoExito = this.intentos.findLastIndex((i) => i.emailHash === emailHash && i.exito)
    const fallosEmail = this.intentos.filter((i, k) => k > ultimoExito && i.emailHash === emailHash && !i.exito)
    const fallosIp = this.intentos.filter((i) => i.ip === ip && !i.exito)
    if (fallosEmail.length >= MAX_FALLOS_EMAIL || fallosIp.length >= MAX_FALLOS_IP) {
      const primero = Math.min(...(fallosEmail.length >= MAX_FALLOS_EMAIL ? fallosEmail : fallosIp).map((i) => i.t))
      return { permitido: false, esperaSegundos: Math.max(1, Math.ceil((primero + VENTANA_MS - ahora) / 1000)) }
    }
    return { permitido: true, restantes: MAX_FALLOS_EMAIL - fallosEmail.length }
  }

  async registrar(emailHash: string, ip: string, exito: boolean) {
    this.intentos.push({ emailHash, ip, exito, t: this.reloj() })
  }
}
