import { Button } from "@/components/ui/button"
import { Sello } from "@/components/base/sellos"
import { Firma, Isotipo } from "@/components/marca/quvant"
import { Grilla, SaltoEnGrilla } from "@/components/marca/grilla"
import { IsotipoAnimado } from "@/components/marca/isotipo-animado"
import { cn } from "@/lib/utils"

/**
 * La lámina del sistema aplicado (tanda 1): la verificación de que el manual quedó bien aplicado a la
 * web y a la app. Se compone a 1600×1000 y se captura a 1,5× (2400×1500) con scripts/marca/capturar-lamina.mts.
 */

function Seccion({ n, titulo, nota, children, className }: { n: string; titulo: string; nota?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)}>
      <header className="flex h-7 items-center justify-between border-b border-gris-3">
        <h2 className="t-etiqueta pb-2 text-blanco">
          {n} · {titulo}
        </h2>
        {nota && <span className="t-etiqueta flex items-center gap-2 pb-2 text-gris-7">{nota}</span>}
      </header>
      {children}
    </section>
  )
}

/** Marca lo que el manual no dice y agregó el prompt. */
function Extension({ className }: { className?: string }) {
  return (
    <span className={cn("t-etiqueta inline-flex h-5 items-center gap-1.5 border border-gris-5 px-1.5 text-acero", className)}>
      <span className="size-[5px] border border-acero" aria-hidden />
      Extensión
    </span>
  )
}

function Pie({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("t-etiqueta text-acero", className)}>{children}</p>
}

const MARCA = [
  { nombre: "Negro Quvant", hex: "#0D0D0F", uso: "Fondo principal", fondo: "bg-negro", texto: "text-blanco", borde: true },
  { nombre: "Blanco Quvant", hex: "#ECECEE", uso: "Logo, títulos y textos", fondo: "bg-blanco", texto: "text-negro" },
  { nombre: "Gris acero", hex: "#9C9CA3", uso: "Secundarios y bajadas", fondo: "bg-acero", texto: "text-negro" },
  { nombre: "Gris profundo", hex: "#26262B", uso: "Apoyo, bordes y grilla", fondo: "bg-profundo", texto: "text-blanco" },
]

// (m): el valor está en el manual; los demás se interpolan en OKLab.
const ESCALA = [
  ["bg-gris-0", true],
  ["bg-gris-1", true],
  ["bg-gris-2", false],
  ["bg-gris-3", true],
  ["bg-gris-4", true],
  ["bg-gris-5", true],
  ["bg-gris-6", true],
  ["bg-gris-7", true],
  ["bg-gris-8", true],
  ["bg-gris-9", true],
  ["bg-gris-10", true],
  ["bg-gris-11", false],
  ["bg-gris-12", false],
  ["bg-gris-13", true],
] as const

const ESTADOS = [
  { nombre: "OK", fondo: "bg-ok", texto: "text-ok" },
  { nombre: "Alerta", fondo: "bg-alerta", texto: "text-alerta" },
  { nombre: "Error", fondo: "bg-error", texto: "text-error" },
  { nombre: "Info", fondo: "bg-info", texto: "text-info" },
]

const TIPOS = [
  { clase: "t-marca", muestra: "Forja", spec: "Michroma · +0,18 em" },
  { clase: "t-hero", muestra: "Vendé.", spec: "700 · 64 · −0,02 em" },
  { clase: "t-titulo", muestra: "Cerrar la caja", spec: "700 · 28 / 1,15" },
  { clase: "t-texto", muestra: "¿Cuánto vendí hoy?", spec: "400 · 15 / 1,6" },
  { clase: "t-etiqueta", muestra: "Total del día", spec: "500 · 11 · +0,2 em" },
  { clase: "t-dato", muestra: "SKU 10482 · 24 u", spec: "400 · 13 · tabular" },
  { clase: "t-numero-lg", muestra: "$ 284.350", spec: "700 · 32 · tabular" },
]

const EXTENSIONES = [
  "Modo claro completo, sin grilla",
  "Escala de grises de 0 a 13",
  "Estados: ok, alerta, error, info",
  "Plex Mono 500 y 600",
  "El salto como recompensa",
  "La bajada en el pie del sitio",
]

function TarjetaCaja({ tema }: { tema: "oscuro" | "claro" }) {
  return (
    <div className={cn(tema === "claro" ? "light" : "dark", "bg-background p-2.5")}>
      <div className="flex flex-col gap-3 border border-border bg-card px-4 py-3.5 text-card-foreground">
        <div className="flex items-center justify-between">
          <span className="t-etiqueta text-muted-foreground">Caja 1 · Hoy</span>
          <Sello />
        </div>
        <div>
          <p className="t-etiqueta text-muted-foreground">Total del día</p>
          <p className="t-numero-lg mt-1.5">$ 284.350</p>
        </div>
        <dl className="t-dato grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-muted-foreground">
          <dt>Efectivo</dt>
          <dd className="text-right text-foreground">$ 131.200</dd>
          <dt>Tarjeta</dt>
          <dd className="text-right text-foreground">$ 104.650</dd>
          <dt>Transferencia</dt>
          <dd className="text-right text-foreground">$ 48.500</dd>
        </dl>
        <p className="t-etiqueta flex items-center gap-2 text-ok">
          <span className="size-[7px] bg-ok" aria-hidden />
          Sin diferencias
        </p>
        <div className="flex gap-2">
          <Button className="flex-1">Cerrar caja</Button>
          <Button variant="outline">Detalle</Button>
        </div>
      </div>
    </div>
  )
}

export function Lamina() {
  return (
    <div className="dark relative h-[1000px] w-[1600px] overflow-hidden bg-negro text-blanco" data-lamina>
      <Grilla paso={32} />
      <div className="relative flex h-full flex-col px-14 pb-8 pt-10">
        {/* Encabezado */}
        <header className="flex items-end justify-between border-b border-gris-3 pb-6">
          <div className="flex items-end gap-8">
            <Firma alto={34} version="principal" />
            <div className="border-l border-gris-3 pl-8">
              <p className="t-etiqueta text-acero">Manual de identidad · Sistema aplicado</p>
              <h1 className="t-titulo mt-1.5">La marca, adentro del sistema.</h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <span className="t-etiqueta flex items-center gap-2 text-acero">
                <span className="size-[6px] bg-blanco" aria-hidden />
                Del manual
              </span>
              <Extension />
            </div>
            <p className="t-etiqueta text-gris-7">Manual v2 · octubre de 2026 · tanda 1</p>
          </div>
        </header>

        <div className="mt-6 grid flex-1 grid-cols-[520px_520px_1fr] grid-rows-[auto_1fr] gap-x-7 gap-y-6">
          {/* 01 · La firma */}
          <Seccion n="01" titulo="La firma" nota="págs. 5 a 7">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative flex h-[116px] items-center justify-center border border-gris-3 bg-negro">
                <div className="outline-1 outline-dashed outline-gris-5">
                  <Firma alto={26} version="principal" resguardo />
                </div>
                <Pie className="absolute bottom-2 left-2.5">Principal</Pie>
                <Pie className="absolute right-2.5 top-2 text-gris-7">Resguardo 2 × punto</Pie>
              </div>
              <div className="relative flex h-[116px] items-center justify-center bg-blanco">
                <Firma alto={26} version="negativa" />
                <Pie className="absolute bottom-2 left-2.5 text-gris-6">Negativa</Pie>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_1fr_1fr_1.25fr] gap-2">
              <div className="flex flex-col items-center gap-2 border border-gris-3 py-2.5">
                <Isotipo lado={44} version="principal" />
                <Pie>Cromada</Pie>
              </div>
              <div className="flex flex-col items-center gap-2 border border-gris-3 py-2.5">
                <Isotipo lado={44} tinta="blanca" />
                <Pie>Blanca</Pie>
              </div>
              <div className="flex flex-col items-center gap-2 bg-blanco py-2.5">
                <Isotipo lado={44} tinta="negra" />
                <Pie className="text-gris-6">Negra</Pie>
              </div>
              <div className="flex flex-col items-center gap-2 border border-gris-3 py-2.5">
                <div className="flex h-11 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/marca/quvant-icono-192.png" alt="" width={44} height={44} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/marca/quvant-favicon-32.png" alt="" width={16} height={16} />
                </div>
                <Pie>Ícono · favicon</Pie>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex h-11 items-center gap-4 border border-gris-3 px-3">
                <Isotipo lado={16} version="principal" />
                <Firma alto={1} version="principal" />
                <span className="t-etiqueta ml-auto text-gris-7">Mínimos</span>
              </div>
              <div className="flex h-11 items-center gap-4 bg-blanco px-3">
                <Isotipo lado={16} version="negativa" />
                <Firma alto={1} version="negativa" />
                <span className="t-dato ml-auto text-gris-6">16 · 96 px</span>
              </div>
            </div>
            <p className="t-texto-sm flex gap-2 text-acero">
              <span className="mt-[7px] size-[6px] shrink-0 bg-alerta" aria-hidden />
              QUVANT es provisorio: compuesto en Michroma +0,18 em con las proporciones del manual, hasta tener el archivo oficial.
            </p>
          </Seccion>

          {/* 02 · Color */}
          <Seccion n="02" titulo="Color" nota="pág. 8">
            <div className="grid grid-cols-4 gap-2">
              {MARCA.map((c) => (
                <div key={c.nombre} className="flex flex-col gap-1.5">
                  <div className={cn("flex h-[70px] flex-col justify-end p-2.5", c.fondo, c.texto, c.borde && "border border-gris-3")}>
                    <p className="t-dato">{c.hex}</p>
                  </div>
                  <p className="t-texto-sm font-semibold text-blanco">{c.nombre}</p>
                  <p className="t-texto-sm -mt-1.5 text-acero">{c.uso}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Pie>Escala de la marca</Pie>
                <Extension />
              </div>
              <div className="mt-2 grid grid-cols-14 border border-gris-3">
                {ESCALA.map(([clase]) => (
                  <div key={clase} className={cn("h-8", clase)} />
                ))}
              </div>
              <div className="mt-1 grid grid-cols-14">
                {ESCALA.map(([clase, delManual], i) => (
                  <span key={clase} className={cn("t-dato text-center", [0, 3, 9, 13].includes(i) ? "text-blanco" : delManual ? "text-acero" : "text-gris-7")}>
                    {i}
                  </span>
                ))}
              </div>
              <p className="t-texto-sm mt-1 text-gris-8">0 negro · 3 profundo · 9 acero · 13 blanco. En gris claro, los interpolados en OKLab.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["oscuro", "claro"] as const).map((t) => (
                <div key={t} className={cn(t === "claro" ? "light" : "dark", "flex h-10 items-center justify-between bg-background px-3", t === "oscuro" && "border border-gris-3")}>
                  {ESTADOS.map((e) => (
                    <span key={e.nombre} className={cn("t-etiqueta flex items-center gap-1.5", e.texto)}>
                      <span className={cn("size-[7px]", e.fondo)} aria-hidden />
                      {e.nombre}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Pie>Estados del sistema · AA en los dos modos</Pie>
              <Extension />
            </div>
          </Seccion>

          {/* 04 · La grilla y el salto, y cómo se arma la Q */}
          <Seccion n="04" titulo="La grilla y el salto" nota="pág. 11">
            <div className="grid grid-cols-3 gap-2">
              {[
                { p: 0, t: "La grilla" },
                { p: 0.56, t: "Se separa" },
                { p: 1, t: "Aterriza" },
              ].map((c) => (
                <div key={c.t} className="flex flex-col gap-1.5 border border-gris-3 bg-negro p-1.5 pb-2">
                  <SaltoEnGrilla columnas={5} filas={4} paso={24} desde={{ columna: 1, fila: 2 }} hasta={{ columna: 4, fila: 2 }} progreso={c.p} className="w-full" />
                  <Pie className="px-1">{c.t}</Pie>
                </div>
              ))}
            </div>
            <div className="mt-1 flex items-center justify-between border border-gris-3 px-4 py-3">
              {[0.32, 0.6, 0.8, 1].map((p, i) => (
                <div key={p} className="flex flex-col items-center gap-2">
                  <IsotipoAnimado lado={40} progreso={p} />
                  <span className="t-etiqueta text-gris-8">{["Aro", "Cola", "Salto", "Q"][i]}</span>
                </div>
              ))}
            </div>
            <p className="t-texto-sm text-acero">La Q se arma con máscaras sobre el PNG original: el aro se traza, la cola aparece y el punto salta. Sin rotar ni estirar.</p>
          </Seccion>

          {/* 03 · Tipografía */}
          <Seccion n="03" titulo="Tipografía" nota={<>pág. 9 · 500 y 600 <Extension /></>}>
            <div className="flex flex-col">
              {TIPOS.map((t) => (
                <div key={t.clase} className="grid grid-cols-[1fr_250px] items-baseline gap-4 border-b border-gris-2 py-[5px] last:border-0">
                  <span className={cn(t.clase, "overflow-hidden whitespace-nowrap")}>{t.muestra}</span>
                  <span className="t-dato whitespace-nowrap text-right">
                    <span className="text-blanco">.{t.clase}</span> <span className="text-gris-8">{t.spec}</span>
                  </span>
                </div>
              ))}
            </div>
            <Pie className="mt-auto">Michroma: una o dos palabras · IBM Plex Mono: todo lo demás</Pie>
          </Seccion>

          {/* 05 · En la app */}
          <Seccion n="05" titulo="En la app" nota="oscuro · claro">
            <div className="grid grid-cols-2 border border-gris-3">
              <TarjetaCaja tema="oscuro" />
              <TarjetaCaja tema="claro" />
            </div>
          </Seccion>

          {/* 06 · Extensiones y el antes */}
          <Seccion n="06" titulo="Extensiones del prompt">
            <ul className="lista-punto t-texto-sm space-y-1 text-acero">
              {EXTENSIONES.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <figure className="mt-auto flex flex-col gap-1.5">
              <figcaption className="t-etiqueta text-gris-7">Antes · Yunque</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element -- el "antes", tal cual */}
              <img src="/marca/antes-yunque-brand-board.png" alt="La identidad anterior (Yunque)" className="block w-[232px] border border-gris-3 opacity-80" />
            </figure>
          </Seccion>
        </div>

        {/* Pie */}
        <footer className="mt-5 flex items-center justify-between border-t border-gris-3 pt-4">
          <p className="t-texto-sm text-acero">
            <span className="text-blanco">Quvant.</span> Software a la vanguardia de cada nicho.
          </p>
          <p className="t-etiqueta text-gris-7">Tokens: src/app/globals.css · Estilos: docs/TIPOGRAFIA.md · Logos: public/marca</p>
        </footer>
      </div>
    </div>
  )
}
