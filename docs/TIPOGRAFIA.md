# Quvant · tipografía y sistema visual en la web

La identidad sale del manual (`referencias/Quvant-manual-de-identidad.pdf`, versión 2, octubre de 2026). Acá está cómo quedó aplicada en el código. Lo que el manual no dice y agregó el prompt va marcado **[EXTENSIÓN]**. La lámina que lo muestra todo junto es [`docs/marca/quvant-sistema.png`](marca/quvant-sistema.png) (se genera desde `/marca/sistema`).

## Las dos familias (manual, pág. 9)

| Familia | Para qué | Cómo se carga | Token |
|---|---|---|---|
| **Michroma** | Títulos muy cortos (una o dos palabras), siempre en mayúsculas y con espaciado amplio (+0,16 a +0,20 em). No compone el logotipo: el logotipo es un archivo. | `next/font/google`, `weight: "400"` (tiene un solo peso) | `--marca-display` → `font-marca` |
| **IBM Plex Mono** | Todo lo demás: títulos (Bold), textos (Regular, 15 px), datos, tablas, números y etiquetas (mayúsculas, +0,2 em). Es monoespaciada: los números de las tablas quedan alineados solos. | `next/font/google`, `weight: ["400", "500", "600", "700"]`, `style: ["normal", "italic"]` (no es variable) | `--marca-texto` → `font-sans`, `font-mono`, `font-heading` |

- Las dos se autohospedan con `next/font` (`src/app/layout.tsx`). No se suma ninguna otra familia. Inter, Inter Display y JetBrains Mono eran de Yunque y ya no se cargan.
- `font-synthesis: none` en `html`: el navegador no inventa una Michroma en negrita ni itálicas falsas.
- **[EXTENSIÓN]** Los pesos 500 y 600 de Plex Mono, para la jerarquía (etiquetas, títulos chicos, números).

## Estilos cerrados

Clases en `src/app/globals.css` (`@layer components`). Cada una resuelve tamaño, interlineado e interletrado: los componentes usan estas clases y **no** tamaños sueltos. Los sufijos `-sm`, `-lg` y `-xl` son los únicos escalones.

| Clase | Familia y peso | Tamaño / interlineado | Interletrado | Uso |
|---|---|---|---|---|
| `.t-marca` | Michroma 400, mayúsculas | 18 px / 1,2 | +0,18 em | Una o dos palabras: nombre de un módulo destacado, "FORJA" |
| `.t-marca-sm` | Michroma 400, mayúsculas | 13 px / 1,2 | +0,20 em | Lo mismo, chico (placas, sellos de producto) |
| `.t-marca-lg` | Michroma 400, mayúsculas | 40 px / 1,1 | +0,16 em | Portadas y cierres de video |
| `.t-hero` | Plex Mono 700 | 64 px / 1,04 | −0,02 em | Titular del sitio y portadas |
| `.t-titulo-lg` | Plex Mono 700 **[EXTENSIÓN]** | 40 px / 1,08 | −0,02 em | Título de sección del sitio y de las presentaciones (tanda 7) |
| `.t-titulo` | Plex Mono 700 | 28 px / 1,15 | −0,01 em | Título de pantalla ("Cerrar la caja") |
| `.t-titulo-sm` | Plex Mono 600 **[EXTENSIÓN]** | 18 px / 1,3 | 0 | Título de tarjeta o de panel |
| `.t-texto` | Plex Mono 400 | 15 px / 1,6 | 0 | Texto corrido (el manual: 15 px o 10 pt) |
| `.t-texto-sm` | Plex Mono 400 | 13 px / 1,55 | 0 | Texto de apoyo, notas |
| `.t-etiqueta` | Plex Mono 500 **[EXTENSIÓN]**, mayúsculas | 11 px / 1,3 | +0,20 em | Etiquetas: `TOTAL DEL DÍA · MOSTRADOR 1` |
| `.t-dato` | Plex Mono 400, tabular | 13 px / 1,4 | 0 | Celdas de tablas, códigos, SKU |
| `.t-numero` | Plex Mono 600 **[EXTENSIÓN]**, tabular | 16 px / 1,2 | −0,01 em | Números en línea |
| `.t-numero-lg` | Plex Mono 700, tabular | 32 px / 1,05 | −0,02 em | Totales de tarjeta |
| `.t-numero-xl` | Plex Mono 700, tabular | 56 px / 1 | −0,03 em | El total del mostrador del kiosco |

Los números (`.t-numero*`) nunca se parten en dos renglones (`white-space: nowrap`).

**De transición (se borran en la tanda 2):** `.ficha` es `.t-etiqueta` con color secundario; `.num` es número tabular; `.grilla-tecnica` es `.grilla-puntos`.

## Color (manual, pág. 8)

Negro y blanco hacen el 90 % de la marca. Los tokens viven en un solo lugar, `src/app/globals.css`, y Tailwind los expone como clases (`bg-negro`, `text-acero`, `border-gris-3`…).

| Token | Hex | Uso |
|---|---|---|
| `--negro` | `#0D0D0F` | Fondo principal |
| `--blanco` | `#ECECEE` | Logo, títulos y textos sobre negro. **[EXTENSIÓN]** Fondo del modo claro |
| `--acero` | `#9C9CA3` | Textos secundarios y bajadas, **sobre negro** (7,1:1) |
| `--profundo` | `#26262B` | Fondos de apoyo, bordes y la grilla de puntos |
| `--plata` | `#B9BBBF` | Solo impresos. En pantalla no se usa |

**[EXTENSIÓN] Escala de la marca:** de `--gris-0` (negro) a `--gris-13` (blanco), sin otros tonos. Los valores 1, 4, 5, 6, 7, 8 y 10 ya los usa el manual en sus páginas; 2, 11 y 12 se interpolan en OKLab entre sus vecinos. 3 es profundo y 9, acero.

| Paso | Hex | Uso principal |
|---|---|---|
| 0 | `#0D0D0F` | Fondo (oscuro) |
| 1 | `#141416` | Superficie, tarjetas (oscuro) |
| 2 | `#1C1C1F` | Superficie elevada, menús (oscuro) |
| 3 | `#26262B` | Bordes, grilla |
| 4 | `#2E2E33` | Campos, borde fuerte (oscuro) |
| 5 | `#3A3A40` | — |
| 6 | `#55555B` | Texto secundario **en claro** (6,3:1 sobre blanco) |
| 7 | `#6E6E75` | Deshabilitado |
| 8 | `#8D8D94` | Texto terciario en oscuro (5,9:1) |
| 9 | `#9C9CA3` | Texto secundario en oscuro |
| 10 | `#B4B4BA` | Campos (claro) |
| 11 | `#CDCDD1` | Bordes (claro) |
| 12 | `#DEDEE1` | Superficie hundida (claro) |
| 13 | `#ECECEE` | Texto en oscuro, fondo en claro |

**[EXTENSIÓN] Modo claro (la versión negativa):** para el mostrador con luz de día y los documentos. Fondo `--blanco`, texto `--negro`, secundario `--gris-6` (el acero sobre blanco da 2,3:1, no llega a AA). En claro no hay grilla. El oscuro sigue siendo el principal.

**[EXTENSIÓN] Colores de estado:** solo para estados del sistema, chicos (puntos, chips y bordes), nunca como color de marca. Todos pasan AA como texto sobre el fondo y las superficies de su modo (`tests/unit/color.test.ts`).

| Estado | Oscuro | Claro |
|---|---|---|
| `--ok` | `#7FBC8F` | `#296D40` |
| `--alerta` | `#D7AC68` | `#8A560C` |
| `--error` | `#E18881` | `#A43B35` |
| `--info` | `#80B1DA` | `#286193` |

**El color de cada empresa** (`--marca`, lo fija el AppShell) va solo en su logo, en el indicador de navegación activo y en la primera serie de sus gráficos (`--serie-1`). Sin empresa, `--marca` es el blanco (oscuro) o el negro (claro). El resto de la interfaz es de Quvant.

**Única excepción a la paleta:** la escala de calor de Forja (`--frio`, `--ascua`, `--brasa`, `--blanco-caliente`), solo como visualización de datos. Se rehace en la tanda 9.

**Alias de transición:** `--hierro`, `--niebla`, `--temple`, `--chispa`, `--superficie`, `--enlace`, `--chispa-texto`, `--ok-texto` y `--error-texto` apuntan a los tokens nuevos para que la app no se rompa. La tanda 2 los reemplaza en los componentes y los borra.

## La grilla, el salto y las viñetas (manual, pág. 11)

- **La grilla:** `<Grilla />` (`src/components/marca/grilla.tsx`) o la clase `.grilla-puntos`: puntos en `--profundo` sobre negro cada 28 px (se cambia con `--grilla-paso`). En claro el token es transparente: no hay grilla.
- **El salto:** `<SaltoEnGrilla progreso={0..1} />` dibuja el salto quieto en cualquier instante: el punto se vuelve un aro hueco, el arco punteado se traza y el cuadrado cae adelante. La geometría es pura (`salto-geometria.ts`), así el mismo cálculo sirve para la lámina, la app y la filmación cuadro por cuadro.
- **[EXTENSIÓN] El salto como recompensa:** `lanzarSalto({ desde, mensaje })` (`salto.tsx`) reemplaza a la chispa de Yunque. Solo cuando algo cierra justo: caja sin diferencias, conteo que coincide, cola sincronizada, presupuesto que pasa a venta, aprobación completa.
- **Las viñetas:** `.lista-punto`, el punto cuadrado en lugar de la viñeta redonda.

## El logo (manual, págs. 5 a 7)

- `<Firma />` y `<Isotipo />` (`src/components/marca/quvant.tsx`) usan los archivos de `public/marca/` con `<img>`. No se redibujan. Versiones: `principal`, `negativa` y `auto` (principal en oscuro, negativa en claro).
- Mínimos aplicados en el componente: isotipo 16 px y firma 96 px de ancho. `resguardo` deja libre el doble del lado del punto.
- `<IsotipoAnimado />`: el aro se traza, la cola aparece y el punto salta. Como solo hay PNG, se anima con máscaras sobre el original, sin vectorizar.
- **El logotipo QUVANT es provisorio:** compuesto en Michroma +0,18 em con las proporciones medidas en la firma del manual, hasta que llegue el archivo oficial. Para cambiarlo: reemplazar `marca/quvant-logotipo-provisorio.svg` y correr `node scripts/marca/generar-marca.mjs`.
