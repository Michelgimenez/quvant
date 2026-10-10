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
| D8 | No se miró el proyecto de Ferremix (no hay acceso todavía). La app se construyó desde cero según la sección 4. | Indicación explícita. Al tener acceso: comparar e integrar. |

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
