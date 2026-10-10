# Yunque — producto, sitio, presentación para inversores y demo comercial

## 0. Cómo trabajar
- Proyecto nuevo en esta carpeta. Trabajá **solo y sin preguntar**: ante una duda, tomá la decisión más razonable según este documento y anotala en `docs/REPORTE.md`.
- Fases con `typecheck`, `lint` y `build` sin errores, y un **commit de git** al cerrar cada una. Si algo se rompe, volvé al último commit sano.
- Capturas con Playwright de cada pantalla en `docs/capturas/` (desktop 1440×900 y mobile 390×844).
- Sin deploy a producción, sin claves reales. Pagos y facturación emulados.
- Antes de empezar, decime en un párrafo cómo lo vas a encarar y avanzá.

## 1. Qué es Yunque
**Yunque** es un sistema de gestión en la nube para ferreterías industriales, distribuidores de maquinaria y negocios con stock complejo en Argentina: inventario multisucursal, mostrador que sigue vendiendo sin internet, presupuestos, precios que se actualizan en minutos, servicio técnico, compras, clientes, entregas y reportes de todos los negocios en un solo lugar. Reemplaza sistemas antiguos, lentos y que se caen.

- **Tagline:** "Firme, aunque todo se mueva."
- **Estado real (y así se comunica):** producto en etapa de **demo funcional / piloto**. Primer cliente piloto en negociación. Todavía no hay clientes pagando.

### Regla de honestidad (obligatoria en todo el proyecto)
- **Nada de métricas, clientes, testimonios ni logos de clientes inventados presentados como reales.** Donde hoy no hay datos reales, se usa un `[COMPLETAR]` visible en la configuración, o se muestra el estado tal cual ("Programa de socios fundadores: cupos abiertos").
- Los datos de ejemplo usan una **empresa demo ficticia** claramente marcada: "Ferretería Industrial Demo" con el sello `DEMO` visible.
- **Ferremix** aparece solo en la demo comercial personalizada para Ferremix (sección 8) y siempre como "piloto" o "así se vería Yunque en Ferremix", nunca como cliente activo ni como caso de éxito, hasta que lo sea y lo autorice por escrito.
- Cada función del producto tiene un estado real en el registro de funcionalidades (sección 9): `disponible`, `demo` o `próximamente`.

## 2. Identidad
Archivos en `/marca/`; copialos a `/public/marca/`:
- `yunque-logo.svg` (isotipo + wordmark, positivo), `yunque-logo-negativo.svg`, `yunque-wordmark.svg` y `-negativo`, `yunque-isotipo.svg` y `-negativo`, `yunque-app-icon.svg` (+ PNG 1024), `favicon-512.png` y `yunque-brand-board.png` (referencia de todo el sistema).
- **Concepto:** el yunque es lo que no se mueve; la **chispa** es lo que se crea encima. Lo firme (el sistema) y lo vivo (el negocio). La chispa aparece en momentos de logro: una venta sincronizada, un presupuesto aceptado, un objetivo cumplido.
- **Wordmark** en minúsculas (Inter Display ExtraBold, tracking apretado).

### Paleta (tokens CSS)
| Token | Hex | Uso |
|---|---|---|
| `--hierro` | `#0E1116` | Fondo principal (modo oscuro por defecto) |
| `--forja` | `#1A1F27` | Superficies, tarjetas, paneles |
| `--acero` | `#9AA3AE` | Texto secundario, líneas, íconos |
| `--niebla` | `#EEF1F4` | Texto sobre oscuro y fondo del modo claro |
| `--temple` | `#3B6EF5` | Acción principal, enlaces, foco (el azul del acero templado) |
| `--chispa` | `#FFB224` | Destacados, logros, avisos importantes |
| `--ok` | `#2FB36E` | Estados correctos, sincronizado |
| `--error` | `#E5484D` | Errores, sin stock |

### Tipografía y estilo
- Titulares: **Inter Display**. Texto: **Inter**. Datos, códigos, montos: **JetBrains Mono**. Con `next/font`.
- Modo oscuro primero, modo claro completo. Grilla técnica muy sutil y etiquetas mono tipo ficha (`VENTA #10482 · MOSTRADOR 2`).
- Voz: firme, clara, sin vueltas. Frases cortas. Nada de jerga técnica para el cliente final.
- Animación con propósito: el yunque como base estable de los layouts; la chispa (pequeña estrella de 4 puntas) como recompensa visual, nunca como decoración permanente.

### Co-branding con clientes
- Yunque acompaña a la marca de cada cliente. Dentro de la app, el encabezado muestra **el logo y el color de acento del cliente** (configurables por organización) y Yunque queda discreto: isotipo + "con yunque" en el pie y en la pantalla de ingreso.
- Generá el componente `<ConYunque />` (sello "funciona con yunque") en versión clara y oscura, para usar en las webs de los clientes.

## 3. Base técnica (pensada para crecer con un equipo)
El objetivo es una base que después puedan auditar y fortalecer desarrolladores especializados en arquitectura y seguridad.
- **Si existe el proyecto de Ferremix con el módulo `/panol`**, copiá ese código como punto de partida de la app de Yunque en este proyecto, renombrado de Pañol a Yunque. Desde ahora **Yunque es el producto** y Ferremix es una organización (cliente) más dentro de él.
- Next.js (App Router) + TypeScript estricto + Tailwind + shadcn/ui. Supabase (Postgres, Auth, Storage, Realtime) con RLS.
- **Multiempresa real:** toda tabla de negocio con `org_id`; RLS por organización y por sucursal; tests automáticos que verifiquen que una organización **no puede** leer datos de otra.
- Roles y permisos (Dueño, Administración, Mostrador, Depósito, Técnico, Compras), registro de auditoría de cada acción, 2FA obligatorio para dueños y administradores, límites de intentos de login.
- **Mostrador sin conexión:** PWA con base local (IndexedDB), cola de operaciones, sincronización con resolución de conflictos documentada y probada.
- Configuración por organización: logo, color de acento, listas de precios, sucursales, módulos activos (feature flags).
- Integraciones preparadas detrás de interfaces (ARCA, Mercado Pago, Mercado Libre, WhatsApp), emuladas en la demo.
- Importador de datos desde Excel/CSV con mapeo de columnas y validación (la puerta de entrada de cada migración).
- Monitoreo de errores y página de estado del sistema.

## 4. La app (`/app`)
Mismos módulos que el sistema del prompt de Ferremix, con la identidad de Yunque: tablero multinegocio, inventario con escaneo por cámara, precios con aumento masivo y vista previa, mostrador con modo sin conexión, presupuestos, compras, servicio técnico con avisos, clientes y cuentas corrientes, entregas, reportes, usuarios y permisos. Atajos de teclado, buscador ⌘K y tablas rápidas.

**Momentos chispa:** al sincronizar la cola offline, al convertir un presupuesto en venta, al cerrar el día de caja y al completar un conteo sin diferencias, aparece la chispa con una microanimación breve.

## 5. Sitio del producto (`/`)
Página pública de Yunque, elegante y directa, modo oscuro.
1. **Hero:** el yunque se arma con un golpe de luz, salta la chispa y aparece el titular: "Firme, aunque todo se mueva." Bajada: "El sistema de gestión para ferreterías industriales y distribuidores que no se cae, no se traba y se entiende." CTA "Pedir una demo".
2. **El problema:** sistemas viejos, servidores que se caen, precios que llevan un día actualizar, presupuestos perdidos en WhatsApp, cada negocio por separado. Tarjetas cortas con íconos.
3. **Nunca se cae (demo interactiva):** un mostrador simulado donde el visitante corta la conexión con un interruptor, sigue vendiendo, la vuelve a activar y ve la cola sincronizarse con la chispa.
4. **Módulos:** recorrido por los módulos con capturas reales de la app (datos de la empresa demo) en mockups.
5. **Precios al día:** demo del aumento masivo por marca con la vista previa del impacto.
6. **Para quién es:** ferreterías industriales, distribuidores de maquinaria, corralones, casas de repuestos, negocios con varias sucursales.
7. **Seguridad y tus datos:** copias diarias, datos siempre exportables, permisos por rol, registro de auditoría. Contarlo simple y sin prometer certificaciones que no existen.
8. **Precios:** "Desde USD 290 por mes por negocio" (valores en `src/config/precios.ts`). Implementación cotizada aparte.
9. **Programa de socios fundadores:** cupos limitados para los primeros negocios, con condiciones especiales a cambio de acompañar el desarrollo. Formulario de interés.
10. **FAQ** y **Pedir una demo** (formulario guardado en Supabase: nombre, negocio, rubro, sucursales, sistema actual, WhatsApp).
- SEO completo (metadatos, Open Graph generado con la marca, `SoftwareApplication` y `Organization` en JSON-LD), Lighthouse ≥ 90.

## 6. Presentación para inversores (`/inversores`)
Presentación cinematográfica en **1920×1080**, protegida con clave (`INVERSORES_KEY` en `.env`). Elegante, sobria y potente: que transmita producto serio, no humo.

Escenas:
1. **Apertura:** pantalla hierro, el yunque se arma, salta la chispa, "yunque".
2. **El problema:** miles de negocios en Argentina gestionan millones en stock con sistemas antiguos. Datos de mercado con fuente o `[COMPLETAR con dato y fuente]`; **no inventes cifras**.
3. **Lo que vimos en el terreno:** el diagnóstico de un caso real (web y sistema de una ferretería industrial), anonimizado como "Ferretería industrial, zona oeste de Buenos Aires".
4. **La solución:** Yunque en una frase y sus cinco pilares (stock, ventas, precios, servicio técnico, multinegocio).
5. **Demo del producto:** componentes reales con datos de la empresa demo y cursor animado (venta de mostrador, escaneo, presupuesto que pasa a venta).
6. **El diferencial:** el corte de conexión en vivo y la sincronización.
7. **Modelo de negocio:** licencia mensual por negocio + implementación; cómo crece el ingreso con cada cliente (fórmula, sin proyecciones inventadas; proyecciones solo desde `src/config/proyecciones.ts` con supuestos explícitos y editables).
8. **Estado actual (con honestidad):** qué está disponible, qué está en demo y qué viene, con los sellos del registro. "Primer piloto en negociación."
9. **Hoja de ruta:** etapas para pasar de demo a producción: arquitectura y seguridad auditadas, facturación electrónica con ARCA, migraciones, app de depósito, integraciones.
10. **Para qué es la inversión:** `[COMPLETAR monto]` y su destino en un gráfico de partes (seguridad y arquitectura, equipo de desarrollo, implementación de pilotos, ventas). Montos y porcentajes desde config.
11. **Equipo:** `[COMPLETAR: Michel y socio, roles y fotos]`.
12. **Cierre:** el yunque, la chispa y "Firme, aunque todo se mueva." con contacto.

Controles y ritmo como en las demás presentaciones del proyecto: escenas de 100vh a 150vh, transiciones superpuestas de 0,6 a 0,9 s, autoplay `P`, `H` oculta controles y cursor, `R` reinicia, velocidades 0,75×/1×/1,25×, sin barras de scroll (tampoco en mockups), solo `transform`/`opacity`/trazos SVG, 60 fps, precarga completa.

## 7. Empresa demo
- "Ferretería Industrial Demo" (ficticia, sello `DEMO`): 2 negocios, 3 sucursales, unos 300 productos con categorías y marcas de ferretería industrial, 6 meses de ventas, presupuestos, servicio técnico y movimientos, para que todo se vea vivo.
- Imágenes de productos: ilustraciones neutras en SVG por tipo de máquina; nunca fotos descargadas de terceros.

## 8. Demo comercial personalizable (`/demo/[cliente]`)
Versión corta de la presentación (5 a 7 minutos) para mostrarle Yunque a un prospecto, con su marca:
- `/demo/ferremix` carga el logo y el color de Ferremix (desde `/public/clientes/ferremix/`, usando los archivos de su nueva identidad) y muestra **"Así se vería Yunque en Ferremix"**, con sus categorías reales y el sello `PROPUESTA` visible.
- Escenas: su problema (del relevamiento), Yunque con su marca, un día en su negocio, el corte de conexión, cómo empezamos (etapas) y "Socio fundador".
- Nuevos prospectos se agregan con un archivo de configuración por cliente (logo, color, nombre, categorías, problemas detectados).

## 9. Registro de funcionalidades y documentación
- `src/showcase/features.ts`: cada función con `id`, `nombre`, `frase`, `estado` (`disponible` | `demo` | `próximamente`) y `escena`. Lo usan el sitio, la presentación para inversores y la demo comercial.
- `CLAUDE.md` en la raíz con la regla: al terminar o cambiar una funcionalidad, actualizar `features.ts`, las escenas afectadas y `docs/ROADMAP.md`.
- `docs/ARQUITECTURA.md`: decisiones, diagrama de componentes, modelo de datos multiempresa, sincronización offline y **deudas técnicas conocidas**, escrito para que un equipo externo lo entienda rápido.
- `docs/SEGURIDAD.md`: qué medidas existen hoy, qué falta y una lista de verificación para una auditoría profesional (OWASP, RLS, manejo de secretos, backups y restauración probada, dependencias, logs).
- `docs/PITCH.md`: el guion de la presentación para inversores en texto, con los `[COMPLETAR]`.
- `docs/ROADMAP.md`: etapas de demo a producción.

## 10. Calidad
- Responsive impecable; la app especialmente usable en celular para depósito, técnicos y el dueño.
- Accesibilidad AA, navegación por teclado, `prefers-reduced-motion`.
- Tests: aislamiento entre organizaciones (RLS), cálculo de precios y stock, flujo offline y sincronización, venta de mostrador y presupuesto a venta (Playwright).

## 11. Orden de trabajo
1. Setup, identidad, tokens, componentes base, `<ConYunque />`.
2. Base multiempresa con RLS y tests de aislamiento; migración del código de `/panol` si existe; empresa demo.
3. App: tablero, inventario, precios, mostrador offline, presupuestos.
4. App: servicio técnico, clientes, compras, entregas, reportes, roles, co-branding por organización.
5. Sitio del producto con la demo interactiva de conexión.
6. Presentación para inversores.
7. Demo comercial personalizable y `/demo/ferremix`.
8. Documentación técnica y de seguridad, pulido y capturas.

Al terminar: `docs/REPORTE.md` con lo hecho, decisiones, pendientes, cómo levantar el proyecto, usuarios de prueba (en el README) y teclas de las presentaciones.
