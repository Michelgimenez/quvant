# Yunque

Sistema de gestión en la nube para ferreterías industriales, distribuidores de maquinaria y negocios con stock
complejo en Argentina. El mostrador sigue vendiendo aunque se corte internet. *Firme, aunque todo se mueva.*

**Estado:** demo funcional / piloto. Primer piloto en negociación. Todavía no hay clientes pagando.
Pagos, facturación y mensajería están **emulados**. Sin despliegue a producción.

## Cómo correrlo

Requisitos: Node 22 o superior.

```bash
npm install
cp .env.example .env.local   # opcional: sin cambios corre en modo demo
npm run dev                  # http://localhost:3000
```

Sin variables de Supabase la app corre en **modo demo**: la empresa ficticia "Ferretería Industrial Demo"
(sello DEMO) se genera en el navegador y el servidor de sincronización está emulado. Para probar el modo sin
conexión, usar "simular corte" en el indicador de conexión de la app.

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build && npm start` | build de producción local |
| `npm run verificar` | typecheck + lint + tests unitarios y de RLS + build |
| `npm test` | tests unitarios y de RLS (PostgreSQL en WASM, sin Docker) |
| `npm run build && npm run test:e2e` | tests de punta a punta con Playwright (levanta `next start` en el puerto 3100) |
| `npm run build && npm run capturas` | capturas de todas las pantallas en `docs/capturas/` (1440×900 y 390×844) |
| `npm run build && npx tsx scripts/revision.ts` | recorrido de revisión con registro de errores de consola (`docs/capturas/revision/`) |

La primera vez que se corren los e2e o las capturas: `npx playwright install chromium`.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | sitio del producto |
| `/ingresar` → `/app` | la app (usuarios de prueba abajo) |
| `/inversores` | presentación para inversores (con clave) |
| `/demo/ferremix` | demo comercial "Así se vería Yunque en Ferremix" (sello PROPUESTA) |
| `/panel` | panel interno del equipo: solicitudes de "Pedir una demo" (con clave) |
| `/estado` | página de estado |
| `/marca` | identidad: logo, colores, sello "con yunque" |

## Usuarios de prueba (modo demo)

Contraseña de todos: **`demo1234`**. Dueño y administración piden doble factor: en la demo el código de 6 dígitos
se muestra en la pantalla de verificación (el autenticador está emulado).

| Email | Rol | Sucursales |
|---|---|---|
| `dueno@demo.yunque.app` | Dueño (2FA) | todas |
| `admin@demo.yunque.app` | Administración (2FA) | todas |
| `mostrador@demo.yunque.app` | Mostrador | Casa Central |
| `mostrador.norte@demo.yunque.app` | Mostrador | Sucursal Norte |
| `maquinaria@demo.yunque.app` | Mostrador | Salón y depósito de maquinaria |
| `deposito@demo.yunque.app` | Depósito | todas |
| `tecnico@demo.yunque.app` | Técnico | Casa Central |
| `tecnico2@demo.yunque.app` | Técnico | Casa Central |
| `compras@demo.yunque.app` | Compras | todas |

La pantalla de ingreso tiene un panel para elegir cualquiera de estos usuarios con un clic.

## Presentaciones

**Clave de `/inversores`:** la variable `INVERSORES_KEY`. En desarrollo, si no está definida, es `yunque-demo`.
En producción, sin `INVERSORES_KEY` la presentación queda cerrada.

| Tecla | Acción |
|---|---|
| **P** | reproducir / pausar (avanza solo) |
| **H** | ocultar / mostrar controles y cursor |
| **R** | reiniciar desde la primera escena |
| **1 / 2 / 3** | velocidad 0,75× / 1× / 1,25× |
| **→ ↓ AvPág Espacio** | escena siguiente |
| **← ↑ RePág** | escena anterior |
| **Inicio / Fin** | primera / última escena |
| **F** | pantalla completa |
| `#N` en la URL | ir a la escena N (por ejemplo `/inversores#5`) |

**Clave de `/panel`:** la variable `PANEL_KEY` (en desarrollo, si falta, `yunque-panel`; en producción sin
`PANEL_KEY` queda cerrado). Muestra cada solicitud de "Pedir una demo" con su WhatsApp, avisa cuántas hay
nuevas y permite marcarlas como contactadas. Sin Supabase, las solicitudes se guardan en una base PostgreSQL
local (`.data/base-local`, mismo esquema que producción).

Para sumar un prospecto a la demo comercial: copiar `src/config/clientes/_plantilla.ts`, poner sus logos en
`public/clientes/<slug>/` y registrarlo en `src/config/clientes/index.ts`. La demo queda en `/demo/<slug>`.

## Documentación

- [`docs/REPORTE.md`](docs/REPORTE.md) — qué se hizo por fase, decisiones (D1–D40), pendientes.
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — componentes, modelo multiempresa, sincronización sin conexión, deudas técnicas.
- [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) — medidas actuales, lo que falta y lista para una auditoría.
- [`docs/PITCH.md`](docs/PITCH.md) — guion de la presentación para inversores.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — etapas de demo a producción.
- [`CLAUDE.md`](CLAUDE.md) — reglas del proyecto (honestidad, registro de funciones, convenciones).
