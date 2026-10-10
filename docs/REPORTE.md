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
| D25 | Service worker escrito a mano (`public/sw.js`): precarga las rutas clave y sus chunks; estáticos cache-first; páginas de `/app` network-first con respaldo. | Serwist y similares dependen de webpack; con Turbopack, un SW chico es más predecible. |

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
