/**
 * Sonido de la activación, sintetizado con Web Audio (sin archivos): un golpe
 * grave cuando el yunque apoya y un chisporroteo corto con las chispas. Está
 * apagado por defecto; solo suena si la persona lo prende.
 */
export class SonidoActivacion {
  private ctx: AudioContext | null = null

  private contexto() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
    }
    if (this.ctx.state === "suspended") void this.ctx.resume()
    return this.ctx
  }

  private ruido(ctx: AudioContext, segundos: number) {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * segundos), ctx.sampleRate)
    const datos = buffer.getChannelData(0)
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1
    return buffer
  }

  /** Golpe metálico y sordo: un grave que cae y un ruido filtrado muy corto. */
  golpe() {
    const ctx = this.contexto()
    if (!ctx) return
    const t = ctx.currentTime
    const grave = ctx.createOscillator()
    const g = ctx.createGain()
    grave.type = "sine"
    grave.frequency.setValueAtTime(110, t)
    grave.frequency.exponentialRampToValueAtTime(42, t + 0.35)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    grave.connect(g).connect(ctx.destination)
    grave.start(t)
    grave.stop(t + 0.65)

    const ruido = ctx.createBufferSource()
    ruido.buffer = this.ruido(ctx, 0.2)
    const filtro = ctx.createBiquadFilter()
    filtro.type = "bandpass"
    filtro.frequency.value = 1800
    filtro.Q.value = 0.8
    const gr = ctx.createGain()
    gr.gain.setValueAtTime(0.35, t)
    gr.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    ruido.connect(filtro).connect(gr).connect(ctx.destination)
    ruido.start(t)
  }

  /** Chisporroteo: clics cortos de ruido agudo, cada vez más espaciados. */
  chisporroteo(segundos = 1.2) {
    const ctx = this.contexto()
    if (!ctx) return
    const t0 = ctx.currentTime
    const buffer = this.ruido(ctx, 0.03)
    let t = 0
    while (t < segundos) {
      const fuente = ctx.createBufferSource()
      fuente.buffer = buffer
      const filtro = ctx.createBiquadFilter()
      filtro.type = "highpass"
      filtro.frequency.value = 3000 + Math.random() * 3000
      const g = ctx.createGain()
      const fuerza = 0.12 * (1 - t / segundos)
      g.gain.setValueAtTime(fuerza, t0 + t)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.025)
      fuente.connect(filtro).connect(g).connect(ctx.destination)
      fuente.start(t0 + t)
      t += 0.012 + Math.random() * 0.05 * (1 + t)
    }
  }

  cerrar() {
    void this.ctx?.close().catch(() => {})
    this.ctx = null
  }
}
