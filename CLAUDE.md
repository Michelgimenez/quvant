@AGENTS.md

# Yunque — reglas del proyecto

Yunque es un sistema de gestión en la nube para ferreterías industriales y distribuidores (Argentina).
Estado real: **demo funcional / piloto**. Todavía no hay clientes pagando.

## Regla del registro de funcionalidades (obligatoria)
Al terminar o cambiar una funcionalidad:
1. Actualizar `src/showcase/features.ts` (estado `disponible` | `demo` | `próximamente`, frase y nota honesta).
2. Revisar las escenas que la muestran: sitio (`src/app/(sitio)`), presentación para inversores (`src/app/inversores`) y demo comercial (`src/app/demo/[cliente]`).
3. Actualizar `docs/ROADMAP.md`.

## Regla de honestidad
- Nada de métricas, clientes, testimonios ni logos de clientes inventados presentados como reales.
- Donde no hay dato real: `[COMPLETAR: ...]` visible (se renderiza resaltado con `<TextoConfig />`).
- Datos de ejemplo = "Ferretería Industrial Demo", siempre con el sello `DEMO` visible.
- Ferremix aparece solo en `/demo/ferremix` como "propuesta" / "así se vería", nunca como cliente activo.

## Convenciones
- Código, rutas y nombres de dominio en español (`producto`, `sucursal`, `venta`). Componentes de shadcn en `src/components/ui` (no editar salvo estilo).
- Lógica de negocio pura en `src/dominio/` (sin React, sin IO) y con tests en `tests/unit/`.
- Toda tabla de negocio lleva `org_id`; las políticas RLS viven en `supabase/migrations/` y se prueban en `tests/rls/`.
- La app es local-first: la UI lee de la réplica local y escribe operaciones en la cola (`src/sync/`). Nunca escribir directo al servidor desde un componente.
- Animación solo con `transform`, `opacity` y trazos SVG. Respetar `prefers-reduced-motion`.
- La chispa (`lanzarChispa`) solo en logros: cola sincronizada, presupuesto → venta, cierre de caja, conteo sin diferencias.

## Antes de commitear
`npm run verificar` (typecheck, lint, tests unitarios y de RLS, build). Tests de punta a punta: `npm run test:e2e`.
