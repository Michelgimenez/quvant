# Yunque — seguridad

> Estado honesto: **demo funcional, sin auditoría externa.** Publicado en Vercel solo para revisión (https://yunque-rust.vercel.app), en modo demo: datos ficticios, sin Supabase ni datos de clientes. Este documento dice
> qué existe hoy, qué falta y qué tiene que revisar una auditoría profesional antes del primer cliente real.
> Arquitectura general en [`ARQUITECTURA.md`](ARQUITECTURA.md). Última revisión: 10/10/2026 (revisión final).

## Lo que existe hoy

### Aislamiento entre empresas (multiempresa)
- Todas las tablas de negocio llevan `org_id`, con **claves foráneas compuestas** (`org_id`, `id`): una fila no puede referenciar datos de otra empresa.
- **RLS activado y forzado** (`force row level security`) en todas las tablas, también para el dueño de las tablas.
- El rol `authenticated` solo tiene **`SELECT`**, filtrado por organización y, donde aplica, por sucursal permitida. `anon` no tiene ningún privilegio de tabla (solo puede insertar columnas puntuales de `solicitudes_demo`).
- **Privilegios explícitos, no los de fábrica**: Supabase otorga por defecto todos los privilegios a `anon` y `authenticated` sobre cada tabla nueva de `public`. La migración `0800_privilegios_api` los revoca (también para las tablas futuras) y deja solo lo necesario. RLS sigue como segunda capa. *Hallazgo de la revisión final*: antes de esa migración, auditoría, operaciones e intentos de ingreso quedaban con privilegios de más (RLS ya impedía ver o cambiar filas, así que no había fuga, pero la defensa dependía de una sola capa).
- **Escrituras solo por `public.aplicar_operacion()`** (security definer, `search_path` fijo): valida el permiso del rol y la sucursal, aplica en una subtransacción y deja registro. Las funciones internas (`app.*`) tienen `execute` revocado para `public`.
- **Columnas protegidas**: costos de productos y de ítems de venta no se otorgan; se leen con `app.costos_productos()` solo con el permiso `costos.ver`.
- **Doble factor exigido en la base**: dueño y administración sin `aal2` en el JWT no tienen permisos.
- **Tests**: 48 pruebas sobre PostgreSQL real (PGlite) con un *shim* que replica a Supabase, **incluidos sus privilegios por defecto**: aislamiento entre empresas, alcance por sucursal y rol, columnas protegidas, 2FA, auditoría, función de operaciones, matriz de privilegios de la API y solicitudes de demo. Tienen controles negativos (una fuga plantada a propósito; sin la migración 0800 los tests de privilegios fallan). Encontraron dos problemas reales, ya corregidos: `app.puede_sucursal()` no comparaba la sucursal pedida, y los privilegios de fábrica de Supabase descriptos arriba.

### Auditoría
- Trigger de auditoría en las tablas de negocio (quién, qué, cuándo, antes y después).
- `auditoria`, `movimientos_stock`, `movimientos_cuenta` y `operaciones` son **de solo agregar**: un trigger impide `UPDATE`, `DELETE` y `TRUNCATE`.
- Operaciones rechazadas registradas aparte (`operaciones_rechazadas`).

### Ingreso y sesiones
- Mismo mensaje para email inexistente y contraseña incorrecta (sin enumeración de usuarios).
- **Límite de intentos**: 5 fallos por email y 20 por IP cada 15 minutos (`app.ingreso_permitido()` en la base; en memoria en modo demo). El email se guarda solo como hash.
- Sesión en cookie **`httpOnly`**, `SameSite=Lax`, `Secure` en producción, firmada con HS256 (`SESION_SECRETO`, mínimo 32 caracteres; en producción sin secreto la app no arranca la sesión), 12 h. Pre-sesión de 5 min para el doble factor.
- Redirección posterior al ingreso solo a rutas internas de `/app` (sin redirecciones abiertas).
- Doble factor TOTP para dueño y administración, exigido en tres lugares: el proxy (sin `aal2` no entran a `/app`), la base (sin `aal2` no tienen permisos) y los tests (e2e para dueño y administración, RLS para la base). En la demo el autenticador está emulado: el código se muestra en pantalla a quien ya pasó la contraseña.
- Las server actions de Next validan el origen (protección CSRF incorporada).

### Presentaciones
- `/inversores`: clave (`INVERSORES_KEY`) comparada en **tiempo constante**, límite de intentos **por IP**, cookie firmada `httpOnly` + `SameSite=Strict` limitada a `/inversores` por 8 h. En producción sin clave configurada, la presentación queda cerrada.
- Monto, destino de la inversión, equipo y contacto están en un módulo `server-only` y viajan **solo después** de validar la clave (test e2e lo verifica).
- `/demo/[cliente]`: pública por enlace, sin datos sensibles, `noindex`; prospectos no configurados → 404.

### Panel interno (`/panel`)
- Lista las solicitudes de "Pedir una demo" (nombre, negocio, WhatsApp: **datos personales**). Clave propia (`PANEL_KEY`), con el mismo mecanismo que `/inversores`: tiempo constante, límite por IP, cookie firmada `httpOnly` + `SameSite=Strict` solo para `/panel`, 8 h. En producción sin `PANEL_KEY` queda cerrado.
- Sin la clave no se entrega ningún dato (test e2e). La acción "marcar como contactada" vuelve a verificar la clave del lado servidor (las server actions son endpoints públicos).
- Lee y actualiza con `service_role` solo del lado servidor; los usuarios de la app (incluidos los de prueba, que son públicos) **no pueden** leer solicitudes (test de RLS).

### Navegador y cabeceras
- `Content-Security-Policy` (`default-src 'self'`, `frame-ancestors 'none'`, `connect-src` limitado a la propia app y a Supabase), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (cámara solo propia; micrófono, geolocalización y pagos desactivados), `Cross-Origin-Opener-Policy: same-origin`, y **HSTS** + `upgrade-insecure-requests` cuando el sitio se publica por https (`NEXT_PUBLIC_SITIO_URL` con `https://`). *Hallazgo de la revisión final*: antes se enviaban en cualquier build de producción, y con `npm start` por http el navegador subía pedidos a `https://localhost` y fallaban.
- **Única excepción al no-embebido**: `/demo/<prospecto>/forja` (demo de Forja para un prospecto) se puede mostrar en un iframe solo desde los orígenes de su configuración (`frame-ancestors 'self' …`, sin `X-Frame-Options`); la regla general la excluye para no pisarla. Lo verifican los e2e (cabeceras y carga en un iframe).
- **Demos públicas de Forja** (`/forja`, `/demo/<prospecto>/forja`): no leen la base ni tienen sesión; trabajan sobre un snapshot del seed (empresa ficticia) con el simulador en el navegador. No hay lectura anónima ni se relaja RLS.
- `robots.txt` excluye `/app`, `/api`, `/ingresar`, `/inversores`, `/demo`, `/marca` y `/panel`.

### Formularios y endpoints públicos
- "Pedir una demo": validación con zod (y `check` en la base), **campo trampa** contra bots y límite de 5 envíos cada 10 minutos por IP. Se guarda en `solicitudes_demo`: en Supabase, o en modo demo en una base PostgreSQL local (PGlite en `.data/base-local`, mismo esquema y mismas reglas). Desde el sitio solo se pueden insertar columnas puntuales: ni el id, ni las fechas, ni el estado.
- `/api/errores` (reporte de errores del cliente) con límite por IP y tamaño acotado.

### Secretos
- Sin claves reales en el repositorio. `.env.local` está en `.gitignore`; `.env.example` documenta las variables.
- La clave de servicio de Supabase (`SUPABASE_SERVICE_ROLE_KEY`) solo se usa en módulos `server-only` (límite de intentos y panel). Verificado en la revisión final: ningún archivo de `.next/static` (lo que baja al navegador) menciona `service_role`, `SESION_SECRETO`, `INVERSORES_KEY`, `PANEL_KEY` ni las claves de desarrollo. Las únicas variables públicas son la URL del sitio y la URL + clave anónima de Supabase.
- `.env.local` nunca estuvo en el historial de git (verificado).
- Integraciones de pago, facturación y mensajería **emuladas**: no hay credenciales de terceros.

### Publicación en Vercel (revisión)
- Variables en Vercel → Production, cargadas como **secretas**: `SESION_SECRETO` (48 caracteres al azar), `INVERSORES_KEY` y `PANEL_KEY` (nuevas, distintas de las de desarrollo) y `NEXT_PUBLIC_SITIO_URL` (https → se activan HSTS y `upgrade-insecure-requests`).
- `.vercelignore` impide subir `.env*` (incluido `.env.local`), `.data` y las capturas.
- Rutas públicas por enlace: el sitio, la app demo (usuarios de prueba públicos, datos ficticios) y `/demo/ferremix` (marca de Ferremix con sello PROPUESTA, `noindex`). Con clave: `/inversores` y `/panel`.
- Sin Supabase, las solicitudes de "Pedir una demo" quedan en `/tmp` de la función: temporales y por instancia (el panel lo aclara).

### Monitoreo
- Errores de servidor (`onRequestError`) y de cliente como JSON estructurado en la consola del servidor + webhook opcional (`MONITOREO_WEBHOOK`). Página `/estado` honesta.

## Lo que falta (antes de producción)

| Tema | Situación | Qué hacer |
|---|---|---|
| Auditoría externa | No hubo | Revisión de arquitectura, RLS y pentest (es la etapa 1 de la hoja de ruta) |
| CSP | Usa `'unsafe-inline'` para scripts (con nonces todas las páginas pasan a render dinámico) | Nonces o hashes; medir el costo en el sitio público |
| Modo Supabase | Preparado pero **no probado** contra una instancia real; la función de operaciones cubre 7 de 33 tipos | Staging con Supabase, mismos tests de RLS, completar operaciones |
| Datos en el dispositivo | La réplica local y la cola (IndexedDB) **quedan en el equipo** al salir; no están cifradas | Borrar la base local al salir en equipos compartidos; política de dispositivos; evaluar cifrado |
| Panel interno | Una clave compartida para todo el equipo; no queda registro de quién marcó cada solicitud | Usuarios individuales del equipo (Supabase Auth) y auditoría de cambios |
| Datos personales de las solicitudes | Sin política de retención ni aviso de privacidad en el formulario | Texto de privacidad, plazo de borrado y pedido de baja |
| Base local del modo demo | PGlite en disco: sirve en una PC o un servidor con disco; **no** en plataformas serverless | En producción, Supabase (ya preparado) |
| Revocación de sesión | JWT sin estado: una sesión robada vale hasta que vence (12 h) | Lista de revocación o sesiones de Supabase con refresh corto |
| Bloqueo por email | 5 fallos bloquean ese email 15 min: un tercero puede bloquear a un usuario a propósito | CAPTCHA tras fallos, avisos al usuario, bloqueo progresivo |
| Recuperación del 2FA | No hay códigos de respaldo | Códigos de recuperación y proceso de soporte verificado |
| Backups | No configurados (no hay base real) | Backups diarios + PITR de Supabase y **restauración probada** periódicamente |
| Dependencias | `npm audit --omit=dev`: **0 vulnerabilidades**. El reporte completo marca `braces` (alta, DoS por patrones anidados) dentro de la CLI de `shadcn`, que es herramienta de desarrollo (`devDependencies`) y no llega al navegador ni al servidor | `npm audit` y Dependabot/Renovate en CI; actualizar la CLI cuando publique la corrección |
| CI | No hay pipeline | GitHub Actions con `npm run verificar`, tests de RLS y e2e en cada PR |
| Rotación de secretos | Manual | Procedimiento documentado para `SESION_SECRETO`, `INVERSORES_KEY` y claves de Supabase |
| Límite de intentos en demo | En memoria, por instancia | En producción ya usa la base |
| Logs | Solo consola + webhook | Retención, alertas y acceso restringido; no registrar datos personales |
| Protección de borde | Sin WAF ni límite global | Límites en el proveedor (Vercel/Cloudflare) |

## Lista para una auditoría profesional

**Aplicación (OWASP Top 10 / ASVS nivel 2)**
- [ ] Control de acceso: cada operación de `aplicar_operacion` valida permiso y sucursal; probar escalamiento horizontal (otra empresa) y vertical (otro rol).
- [ ] Autenticación: fuerza bruta, enumeración, fijación de sesión, cierre de sesión, expiración, flujo de 2FA y su recuperación.
- [ ] Inyección: entradas de las operaciones (`jsonb`) y del importador de Excel/CSV (incluida inyección de fórmulas al exportar CSV).
- [ ] XSS: datos de clientes, productos y presupuestos en la UI, tickets impresos y mensajes de WhatsApp; efectividad de la CSP.
- [ ] CSRF y origen de las server actions; cabeceras de seguridad en todas las respuestas.
- [ ] SSRF y redirecciones abiertas (parámetro `siguiente`).
- [ ] Manejo de errores: sin trazas ni datos internos en las respuestas.
- [ ] Service worker: qué queda en caché, alcance, actualización y que no cachee respuestas con datos de otra sesión.

**Base de datos y RLS**
- [ ] Todas las tablas con RLS forzado; ninguna política `using (true)` para `authenticated`.
- [ ] Privilegios de tabla de `anon` y `authenticated` en la instancia real iguales a los del test `tests/rls/privilegios.test.ts` (Supabase otorga ALL por defecto; la migración 0800 lo corrige).
- [ ] `security definer` con `search_path` fijo y `execute` revocado donde corresponde.
- [ ] Columnas protegidas (costos) inaccesibles por la API REST de Supabase.
- [ ] Exigencia de `aal2` para dueño y administración.
- [ ] Tablas de solo agregar: ni `UPDATE`, ni `DELETE`, ni `TRUNCATE`, tampoco con la clave de servicio salvo procedimiento.
- [ ] Correr `tests/rls` contra la instancia real (no solo PGlite).

**Secretos y configuración**
- [ ] Ningún secreto en el repo ni en el historial de git.
- [ ] Variables de entorno por ambiente; la clave de servicio nunca en el cliente.
- [ ] Rotación probada de `SESION_SECRETO` (invalida sesiones) y de `INVERSORES_KEY`.

**Backups y continuidad**
- [ ] Backups automáticos + PITR activados.
- [ ] **Restauración probada** en un entorno aparte, con tiempo medido.
- [ ] Exportación completa por empresa (ya existe en Configuración) verificada contra una restauración.

**Dependencias y cadena de suministro**
- [ ] `npm audit` sin altas/críticas en producción; versiones fijadas con lockfile.
- [ ] Dependabot/Renovate y revisión de paquetes nuevos.

**Logs y monitoreo**
- [ ] Errores con contexto sin datos personales ni secretos.
- [ ] Alertas por picos de rechazos de operaciones, intentos de ingreso fallidos y errores 5xx.
- [ ] Retención y acceso a logs definidos.

**Dispositivos y modo sin conexión**
- [ ] Datos locales al cerrar sesión en equipos compartidos.
- [ ] Qué puede hacer un dispositivo robado con una sesión vigente y una cola pendiente.
- [ ] Integridad de la cola: el servidor revalida todo (el cliente nunca decide precios ni números definitivos).
