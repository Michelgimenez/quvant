# Yunque — reporte de trabajo

> Bitácora viva. Se completa al cerrar cada fase. Al final del documento: cómo levantar el proyecto,
> usuarios de prueba y teclas de las presentaciones.

## Decisiones tomadas sin consultar (y por qué)

| # | Decisión | Motivo |
|---|---|---|
| D1 | Next.js 16.4 (última estable) con Cache Components y Partial Prefetching activados, como trae `create-next-app`. | Es la base recomendada hoy; la app es mayormente cliente (local-first) así que el impacto es bajo. |
| D2 | shadcn/ui 4 con primitivas Radix y preset *nova*. | API conocida (`asChild`), accesible y fácil de auditar. |
| D3 | Inter con eje óptico `opsz` desde `next/font/google`: `opsz 32` = Inter Display. | Inter Display no está en Google Fonts como familia aparte; el eje óptico de Inter 4 es la misma tipografía. |
| D4 | El azul temple `#3B6EF5` con texto blanco da 4,44:1 (no llega a AA). Los botones llenos usan `#3466F0` (4,9:1); los enlaces usan `#6E93F8` en oscuro y `#2A55D0` en claro. | Accesibilidad AA sin alterar la percepción de la marca. Verificado en `tests/unit/color.test.ts`. |
| D5 | Planes: "Negocio" a USD 290/mes y "Multinegocio" a medida. | El documento fija "desde USD 290"; inventar un segundo precio sería un dato comercial no validado. |
| D6 | Proyecciones solo como fórmula + supuestos editables en `src/config/proyecciones.ts`, rotuladas "escenario ilustrativo". | Regla de honestidad. |
| D7 | CSP sin nonces (`'unsafe-inline'` en scripts). | Con nonces todas las páginas pasan a render dinámico. Queda como deuda documentada en SEGURIDAD.md. |
| D8 | No se miró el proyecto de Ferremix (no hay acceso todavía). La app se construyó desde cero según la sección 4. No hubo migración de `/panol`. | Indicación explícita. Al tener acceso: comparar e integrar. |
| D9 | Los tests de RLS corren sobre **PGlite** (PostgreSQL 18 en WASM) con un *shim* de Supabase (`auth.uid()`, `auth.jwt()`, roles `anon`/`authenticated`/`service_role`). No se levantó Supabase local. | Sin claves ni Docker extra (en esta máquina ya corre el Supabase de otro proyecto). Los tests son rápidos (~3 s) y corren en CI. |
| D10 | Los clientes **no escriben directo** en las tablas: solo `SELECT` con RLS. Las escrituras pasan por `app.aplicar_operacion()` (security definer, fase 3). | Un usuario de mostrador con la API de Supabase en la mano no puede, por ejemplo, editar el stock a mano. |
| D11 | Columnas protegidas: `productos.costo` y `venta_items.costo_unitario` no se otorgan a `authenticated`; se leen con `app.costos_productos()` (exige `costos.ver`). | El mostrador no debe ver costos ni márgenes. |
| D12 | El 2FA se exige **en la base**: si el JWT no trae `aal2`, los roles Dueño y Administración no tienen permisos. | No depende de que la app "se acuerde" de pedirlo. |
| D13 | Marcas, proveedores, clientes y personas de la empresa demo son ficticios. Códigos de barras con prefijo GS1 `2` (circulación interna), teléfonos con numeración inexistente (`11 0xxx`), emails `.example`. | No asociar marcas reales a precios inventados ni generar datos de contacto de terceros. |
| D14 | Modo demo: autenticador TOTP emulado; el código vigente se muestra en pantalla **solo en modo demo** y solo a quien ya pasó la contraseña. | Permite mostrar el flujo de 2FA sin un teléfono. En modo Supabase ese endpoint no existe (404). |
| D15 | Ingreso: mismo mensaje para email inexistente y contraseña incorrecta; límite de 5 fallos por email y 20 por IP cada 15 minutos (en memoria en demo; en la base con `app.ingreso_permitido()` en producción). | Evita enumeración de usuarios y fuerza bruta. |
| D16 | Importes en **centavos** (enteros) en todo el sistema; cantidades con 3 decimales. | Sin errores de redondeo de punto flotante en totales y saldos. |
| D17 | Arquitectura **local-first**: la app lee de una réplica local y escribe operaciones idempotentes en una cola (IndexedDB). Estado visible = base confirmada + pendientes reaplicadas (*rebase*). | El mostrador sin conexión no es un modo especial: es como funciona siempre. |
| D18 | Un **mismo reductor** (`src/sync/reductores.ts`) aplica las operaciones en el navegador (optimista) y en el servidor demo (autoritativo). En producción, la función SQL `aplicar_operacion` implementa las mismas reglas. | Una sola definición de las reglas de negocio y de conflicto, testeada en ambos lados. |
| D19 | Reglas de conflicto: las ventas siempre se aceptan (stock negativo, precio distinto de lista, límite excedido y caja cerrada quedan como **advertencias**); stock por deltas; una sola conversión de presupuesto gana; cerrar una caja ya cerrada se rechaza; fichas con última escritura por campo e informe de conflicto. | En un mostrador la venta ya ocurrió: rechazarla al sincronizar sería perder plata. |
| D20 | Servidor demo **emulado en el navegador** con su log en IndexedDB y Web Locks: varias pestañas se comportan como varios dispositivos. | Permite mostrar conflictos y sincronización reales sin backend. |
| D21 | La empresa demo se ancla al primer uso del día y se **renueva cada día** (avisa). | Los ids de ventas/presupuestos dependen del día de la semilla. |
| D22 | Números **provisorios** locales (`CC1-L0007`) y **definitivos** asignados por el servidor al sincronizar; al reaplicar operaciones confirmadas se usa el número que asignó el servidor. | La numeración fiscal no puede depender de un dispositivo desconectado. |
| D23 | La función SQL implementa hoy 7 tipos de operación (venta, presupuesto guardar/convertir, ajuste, transferencia, cierre de caja, cobro). El resto devuelve **error temporal**: la operación queda en la cola del dispositivo, no se pierde. | Honestidad sobre el alcance; deuda documentada. |
| D24 | Gráficos en SVG propio con la paleta de series **validada** con el validador de dataviz (modo claro y oscuro); vista de tabla en cada gráfico. | Control total de accesibilidad y peso. |
| D26 | Integraciones (ARCA, Mercado Pago, Mercado Libre, WhatsApp) detrás de interfaces en `src/integraciones/`, con implementaciones **emuladas** que lo dicen en pantalla ("CAE emulado", "envío emulado"). | Conectar una real = implementar la interfaz; la app no cambia. |
| D27 | Monitoreo sin proveedor: errores de cliente y servidor (`onRequestError`) como JSON estructurado en la consola del servidor + webhook opcional (`MONITOREO_WEBHOOK`). | No hay cuenta de Sentry; queda listo para conectar. |
| D28 | La chispa se usa **solo** en los cuatro momentos del documento (cola sincronizada, presupuesto → venta, cierre de caja, conteo sin diferencias). | La regla de marca la reserva para logros; no se agregó en otros lugares. |
| D29 | Héroe del sitio animado **solo con CSS** (sin JavaScript), demos interactivas que cargan al acercarse a la pantalla, imágenes con `getImageProps` (sin JS de cliente), CSS incrustado (`experimental.inlineCss`) y proveedores de interfaz (toasts, tooltips, chispas) solo donde se usan. | Rendimiento del sitio público. |
| D30 | El formulario "Pedir una demo" guarda en Supabase si está configurado; en modo demo, en `.data/solicitudes-demo.jsonl` (ignorado por git). Tiene campo trampa contra bots y límite de 5 envíos cada 10 minutos por IP. | Sin claves reales no hay base remota; el archivo local permite probar el flujo completo. |
| D25 | Service worker escrito a mano (`public/sw.js`): precarga las rutas clave y sus chunks; estáticos cache-first; páginas de `/app` network-first con respaldo. | Serwist y similares dependen de webpack; con Turbopack, un SW chico es más predecible. |
| D31 | Motor de presentaciones propio (`src/components/presentacion/motor.tsx`), sin librería de slides: escenario fijo de 1920×1080 escalado a la ventana, el scroll es la línea de tiempo (cada escena 100–150 vh), transición superpuesta de 0,75 s, solo `transform`/`opacity`/trazos SVG, precarga completa y enlace directo `#N`. Lo reutiliza la demo comercial. | Control total del ritmo y de la regla "solo transform/opacity"; ninguna librería cumple a la vez scroll + autoplay + velocidades sin barras. |
| D32 | `/inversores` con clave compartida (`INVERSORES_KEY`) comparada en tiempo constante; si es correcta deja una cookie firmada (HS256), `httpOnly`, `SameSite=Strict`, solo para `/inversores`, por 8 h. Límite de intentos **por IP** (no global: nadie puede bloquear la clave para todos). En desarrollo sin clave se usa `yunque-demo`; en producción sin clave la presentación queda cerrada. | Es una presentación privada, no una cuenta: una clave alcanza, sin abrir alta de usuarios. |
| D33 | Lo sensible del deck (monto, destino de la inversión, equipo, contacto) vive en `src/config/inversion.ts` con `server-only` y llega como props **solo después** de validar la clave. El JavaScript del deck es estático (cualquiera con la URL del chunk puede leerlo), por eso no contiene esos datos; el caso del terreno está anonimizado. | Un test e2e verifica que el HTML sin clave no incluye esos textos. |
| D34 | Escena "Demo del producto": componentes reales de la app (carrito, logo con co-branding, ilustraciones) sobre la empresa demo en memoria, con un guion y cursor animado que ejecuta operaciones **reales** del motor (venta, presupuesto → venta con chispa). "El diferencial" es la misma demo de conexión del sitio con un guion automático (vende, corta, vende en cola, reconecta). | Lo que se ve en el deck es el producto funcionando, no un video ni una maqueta. |
| D35 | El carrito y la demo de conexión pasaron de breakpoints de ventana a **consultas de contenedor** (`@container`). | Dentro del escenario escalado (y en un celular) los breakpoints de ventana daban el diseño equivocado; en la app y el sitio el resultado es el mismo. |
| D36 | Categorías, problemas detectados y sucursales de Ferremix quedan en `[COMPLETAR]`. Logo y color salen de los archivos de su nueva identidad (`public/clientes/ferremix/`). | No hay acceso todavía a su proyecto ni al relevamiento, y no se buscaron datos en la web para no atribuirle información equivocada. Se completan en `src/config/clientes/ferremix.ts`. |
| D37 | La demo comercial muestra la **empresa demo** (datos ficticios) vestida con la marca del prospecto. Sello `PROPUESTA` en todas las escenas, sello "DATOS DE EJEMPLO" sobre el tablero, y "Ferremix **como** socio fundador" (propuesta, no hecho). Un test unitario falla si "Ferremix" aparece en el código fuera de su configuración. | Regla de honestidad: nunca como cliente activo ni con números propios. |
| D38 | `/demo/[cliente]` es pública por enlace (sin clave), `noindex`, fuera del sitemap y bloqueada en `robots.txt`. Los prospectos no configurados responden **404 real** desde el proxy. | No contiene datos sensibles (su marca pública + datos ficticios) y se comparte con el prospecto sin fricción. |
| D39 | El tablero pasó de `src/app/app/tablero.tsx` a `src/components/app/tablero.tsx`. | Importar un módulo de la carpeta de otra ruta provocaba un bucle de recargas de Fast Refresh en desarrollo. |
| D40 | Con "reducir movimiento", las películas de las presentaciones mantienen los tiempos del guion y solo dejan de deslizar el cursor y los elementos. | Comprimir el guion lo convertía en un parpadeo constante, peor para quien pidió menos movimiento. |

## Fases

### Fase 1 — Setup, identidad, tokens, componentes base, `<ConYunque />`
- Proyecto Next.js 16.4 + TypeScript estricto + Tailwind 4 + shadcn/ui.
- Tokens de marca (`--hierro`, `--forja`, `--acero`, `--niebla`, `--temple`, `--chispa`, `--ok`, `--error`) y semánticos por tema; modo oscuro por defecto y modo claro completo.
- Componentes de marca: `Isotipo`, `Wordmark`, `Logo`, `Chispa`, `YunqueArmado` (el yunque se arma: tres piezas, golpe de luz y chispa), `CapaChispas` + `lanzarChispa()` para los momentos chispa.
- `<ConYunque />` claro y oscuro (+ SVG estáticos en `public/marca/con-yunque-*.svg`, regenerables con `npm run sellos`).
- Sellos `DEMO` / `PROPUESTA`, fichas mono, badges de estado del registro, `TextoConfig` que resalta `[COMPLETAR]`.
- Registro de funcionalidades `src/showcase/features.ts`, configuración (`precios`, `proyecciones`, `inversion`, `sitio`).
- Encabezados de seguridad (CSP, HSTS en producción, `X-Frame-Options`, `Permissions-Policy` con cámara solo propia).
- Página interna `/marca` con el sistema de identidad.

### Fase 2 — Base multiempresa con RLS, tests de aislamiento y empresa demo
- Migraciones en `supabase/migrations/`: esquema completo (organizaciones, negocios, sucursales, miembros, catálogo, precios, stock, clientes, cuentas corrientes, ventas, presupuestos, servicio técnico, compras, entregas, caja, conteos, aumentos), con **claves foráneas compuestas `(org_id, id)`** para que ninguna fila pueda apuntar a otra empresa.
- Permisos por rol en la base (`permisos_rol`) idénticos a `src/dominio/permisos.ts` (un test lo verifica).
- RLS activado **y forzado** en todas las tablas; lectura por organización + permiso + sucursal; escrituras directas revocadas.
- Auditoría por triggers (quién, qué tabla, qué columnas cambiaron, qué operación) y libros de solo-agregar (auditoría, movimientos de stock y de cuenta corriente): `UPDATE`/`DELETE`/`TRUNCATE` se rechazan incluso para el dueño de la tabla.
- Límite de intentos de ingreso y tabla de solicitudes del sitio (anon puede insertar, nadie lee).
- **25 tests de RLS** sobre Postgres real (PGlite): aislamiento A↔B en todas las tablas, control negativo (una fuga plantada se detecta), escrituras directas bloqueadas, sucursal, rol, columnas protegidas, 2FA (aal2), anon, inmutabilidad de auditoría, límite de intentos.
- Empresa demo determinística (`src/datos/demo/`): 2 negocios, 3 sucursales, 290 productos en 16 categorías, 3 listas de precios, 120 clientes, ~4.300 ventas en 6 meses, ~400 presupuestos, ~200 órdenes de servicio, reposición automática, transferencias, conteos, cajas, entregas y 3 aumentos de precios históricos coherentes con los precios de cada venta. Se genera en ~300 ms en el navegador.
- Ingreso: pantalla con la marca del cliente y "con yunque" discreto, usuarios de prueba, 2FA para Dueño/Administración, límite de intentos, sesión firmada (cookie httpOnly) y `proxy.ts` que protege `/app`.
- Tests e2e de ingreso (Playwright): redirección sin sesión, error genérico, 2FA, bloqueo por intentos.

### Fase 3 — App: tablero, inventario, precios, mostrador sin conexión, presupuestos
- **Motor de sincronización** (`src/sync/`): operaciones idempotentes, cola en IndexedDB, rebase, eventos; servidor demo emulado; 31 tipos de operación con validación previa (si se rechaza, el estado no cambia).
- **Función de producción** `public.aplicar_operacion(op)` (security definer): idempotencia, autor = `auth.uid()`, permiso y sucursal, subtransacción (todo o nada), log `operaciones` con RLS y `operaciones_rechazadas`.
- **Shell**: co-branding (logo y color de acento de la organización, "con yunque" al pie), navegación por rol y módulos activos, barra inferior en celular, selector de sucursal, indicador de conexión con la cola y "simular corte", ⌘K (módulos, productos, clientes, acciones), atajos `g + letra`, `?`, `/`.
- **Tablero** por rol: dirección (ventas de hoy por negocio y sucursal, 30 días por negocio, mes, ticket, margen, presupuestos, lo más vendido, "para atender hoy", actividad), mostrador/depósito y taller.
- **Inventario**: tabla virtualizada con stock por sucursal, filtros, ficha de producto (stock, precios por lista y márgenes, movimientos), ajustes con motivo, transferencias, alta de productos, **escaneo con la cámara** (BarcodeDetector o ZXing; "simular lectura" en la demo) y **conteos** (chispa si cierra sin diferencias).
- **Precios**: aumento masivo por marca/categoría/proveedor con vista previa (productos afectados, aumento real tras redondeo, márgenes bajos, impacto en stock valorizado), historial y reversión.
- **Mostrador**: lector/teclado (F2, F4, F8, Esc, +/−), descuentos, cliente con cuenta corriente, entrega a domicilio, cobro con varios medios (Mercado Pago **emulado** con QR), vuelto, ticket imprimible ("sin validez fiscal" mientras ARCA esté emulado), caja (apertura, retiros, **cierre con arqueo y chispa**), venta en curso que sobrevive a una recarga.
- **Presupuestos**: lista con filtros, editor, envío por WhatsApp (**emulado**), aceptado/rechazado, **conversión a venta con chispa**, impresión.
- **PWA**: manifiesto y service worker; la app abre sin conexión.
- Tests: 85 unitarios + RLS (incluye 9 de sincronización y conflictos, 13 de la función SQL de operaciones) y 7 e2e (incluye venta sin conexión con recarga sin internet).
- Bug encontrado por los tests y corregido: `app.puede_sucursal()` no comparaba la sucursal pedida (respondía "sí" si el usuario tenía el permiso en cualquier sucursal).

### Fase 4 — App: servicio técnico, clientes, compras, entregas, reportes, roles, co-branding
- **Servicio técnico**: tablero por estado (kanban) y lista, ingreso de equipos con tipo ilustrado, técnico asignado, transiciones validadas, presupuesto de reparación, avisos por WhatsApp (**emulados**) en la línea de tiempo, órdenes atrasadas marcadas.
- **Clientes y cuentas corrientes**: filtros (con cuenta, con saldo, sobre su límite), ficha con saldo/límite/disponible, movimientos con saldo acumulado, registro de pagos, compras, presupuestos y taller; edición con detección de conflictos; solo administración otorga crédito.
- **Compras**: órdenes, **sugerencias por stock mínimo** agrupadas por proveedor, envío, recepción parcial o total que ingresa stock, proveedores.
- **Entregas**: hoja de ruta del día pensada para el celular del chofer, reordenamiento, en camino / entregada / no se pudo con motivo.
- **Reportes**: ventas (por día/semana y sucursal, categoría, medio de pago, vendedor, productos), stock valorizado y stock quieto, cuentas corrientes, taller, ventas para revisar; todo exportable a CSV (formato Excel en español).
- **Usuarios y permisos**: alta (invitación emulada), rol, sucursales, activo, estado del 2FA y matriz de permisos.
- **Configuración**: co-branding (nombre, logo claro y oscuro, color de acento con control de contraste AA y vista previa en vivo claro/oscuro), módulos activos, sucursales y listas, integraciones con "probar conexión", exportación (CSV y JSON completo).
- **Importador** Excel/CSV: detección de columnas, números argentinos, validación por fila, vista previa, nuevos vs. actualizados.
- **Auditoría** con filtros y exportación; **monitoreo de errores** (pantallas de error, `onRequestError`, `/api/errores` con límite); **página de estado** (`/estado`) honesta.
- Tests: 99 unitarios + RLS, 11 e2e (incluye recorrido de todos los módulos sin errores, permisos del técnico, co-branding y aviso del taller).

### Fase 5 — Sitio del producto (`/`)
- Héroe: el yunque se arma en tres piezas, cruza el golpe de luz, salta la chispa y aparece "Firme, aunque todo se mueva." (CSS puro; con `prefers-reduced-motion` aparece armado).
- Secciones: el problema, **"Nunca se cae" interactivo** (mostrador real con el mismo motor de la app, interruptor de internet, cola y sincronización con chispa), módulos con capturas reales en marcos de navegador y su estado del registro, **precios al día** (el aumento masivo de la app sobre el catálogo demo), para quién es, seguridad (sin certificaciones inventadas), precios desde `src/config/precios.ts`, socios fundadores con formulario, "Qué está listo hoy" generado desde `features.ts`, preguntas frecuentes y "Pedir una demo".
- SEO: metadatos, Open Graph generado con la marca (`/opengraph-image`), JSON-LD `Organization` + `SoftwareApplication`, `robots.txt`, `sitemap.xml`, canónica.
- **Lighthouse** (Lighthouse 13.5, Chrome del sistema, build de producción local):
  - Escritorio: Performance **100**, Accesibilidad **100**, Buenas prácticas **100**, SEO **100**.
  - Celular (simulación 4G lenta + CPU ×4): Accesibilidad **100**, Buenas prácticas **100**, SEO **100**, Performance **77–89** según la corrida (LCP simulado 3,4–3,6 s; TBT 120–530 ms). En Chrome real el LCP observado es de **0,27 s** (el titular, en el primer pintado). **Pendiente**: llevar Performance móvil simulada a ≥ 90; el costo restante es estilo y layout de una página larga más la hidratación de React (ideas en ROADMAP).
- Tests e2e del sitio: héroe y JSON-LD, "Nunca se cae" (vender, cortar, vender, reconectar, chispa), formulario con validación.

### Fase 6 — Presentación para inversores (`/inversores`)
- **Acceso** con clave (`INVERSORES_KEY`), cookie firmada de 8 h y límite de intentos por IP; `noindex` y fuera del sitemap. Pantalla de clave propia.
- **12 escenas** de 1920×1080 (`src/components/presentacion/escenas-inversores.tsx`): apertura (el yunque se arma), el problema (datos de mercado en `[COMPLETAR con dato y fuente]`, sin cifras inventadas), lo que vimos en el terreno ("Ferretería industrial, zona oeste de Buenos Aires", hallazgos en `[COMPLETAR]`), la solución y sus 5 pilares (con la cantidad de funciones disponibles leída del registro), **demo del producto** con componentes reales y cursor animado, **el diferencial** (corte de conexión en vivo), modelo de negocio (fórmula + barras de `proyectar(SUPUESTOS)` rotuladas "escenario ilustrativo… no es un pronóstico"), estado actual con los sellos del registro y "Primer piloto en negociación", hoja de ruta (5 etapas desde `src/config/hoja-de-ruta.ts`), inversión (`[COMPLETAR monto]` + gráfico de partes con la paleta validada), equipo (`[COMPLETAR]` en roles, bios y fotos) y cierre.
- **Controles**: P reproduce/pausa · H oculta controles y cursor · R reinicia · 1/2/3 velocidad 0,75×/1×/1,25× · ← → AvPág RePág Espacio Inicio Fin · F pantalla completa · `#N` va a la escena N. Sin barras de scroll; en un celular vertical sugiere girarlo.
- **Bug encontrado y corregido** en el motor de sincronización: una operación encolada mientras otra se estaba enviando esperaba al próximo disparador (otra venta, reconexión). Ahora el ciclo da otra vuelta al terminar. Test de regresión con control negativo (falla sin el arreglo).
- Capturas de la clave y de las 12 escenas en escritorio y celular (`docs/capturas/inversores-*`).
- Tests: 100 unitarios + RLS; 17 e2e (3 nuevos: sin clave no se entrega nada sensible, teclado completo con autoplay, enlace directo + demo de conexión en vivo).
- Pendiente de contenido (no de código): completar datos de mercado con fuente, hallazgos del relevamiento, monto, porcentajes definitivos, equipo y contacto en `src/config/inversores.ts` e `src/config/inversion.ts`.

### Fase 7 — Demo comercial por cliente (`/demo/[cliente]`, `/demo/ferremix`)
- **Un archivo por prospecto** en `src/config/clientes/` (nombre, rubro, color, logos, categorías, problemas detectados, sucursales, contacto) + registro en `index.ts` + `_plantilla.ts` para sumar uno nuevo. La ruta se genera en el build para cada prospecto configurado.
- **`/demo/ferremix`**: logo y naranja de Ferremix, "Así se vería Yunque en Ferremix" y sello `PROPUESTA` siempre visible. Mismo motor y controles que la presentación para inversores.
- **7 escenas** (≈ 5 min 47 s a 1×; 4 min 38 s a 1,25×; 7 min 43 s a 0,75×): portada, **su problema** (del relevamiento, en `[COMPLETAR]`), **Yunque con su marca** (el tablero real de la app con su logo y color, la pantalla de ingreso en el celular con "con yunque" discreto y sus categorías), **un día en su negocio** (mostrador 08:15, depósito 11:40, presupuesto aceptado 17:20, con operaciones reales y en bucle), **el corte de conexión** en vivo, **cómo empezamos** (relevamiento, migración, piloto en una sucursal, puesta en marcha) y **socio fundador** (condiciones y plan desde `src/config/precios.ts`).
- Tests: 103 unitarios + RLS (3 nuevos de honestidad: Ferremix solo en su configuración, ningún prospecto como "cliente activo" o "caso de éxito", estados válidos del registro); 19 e2e (2 nuevos: marca, sellos y escenas de Ferremix; prospecto inexistente → 404).
- Capturas de las 7 escenas en escritorio y celular (`docs/capturas/demo-ferremix-*`).
