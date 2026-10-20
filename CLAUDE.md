@AGENTS.md

# Quvant — reglas del proyecto

Quvant (antes Yunque) es el sistema de gestión en la nube que se adapta a cada negocio: del kiosco a la empresa con decenas de sucursales (Argentina). Identidad: el manual en `referencias/` y `docs/TIPOGRAFIA.md`.
Estado real: **demo funcional / piloto**. Todavía no hay clientes pagando.

## Regla del registro de funcionalidades (obligatoria)
Al terminar o cambiar una funcionalidad:
1. Actualizar `src/showcase/features.ts` (estado `disponible` | `demo` | `próximamente`, frase y nota honesta).
2. Revisar las escenas que la muestran: sitio (`src/components/sitio/`), presentación para inversores (`src/components/presentacion/escenas-inversores.tsx`) y demo comercial (`src/components/presentacion/escenas-cliente.tsx`).
3. Actualizar `docs/ROADMAP.md`.

## Regla de honestidad
- Nada de métricas, clientes, testimonios ni logos de clientes inventados presentados como reales.
- Donde no hay dato real: `[COMPLETAR: ...]` visible (se renderiza resaltado con `<TextoConfig />`).
- Datos de ejemplo = las cuatro empresas ficticias de `src/demo/empresas.ts` (Kiosco La Esquina, Ferretería Industrial Demo, Distribuidora Ruta Clara, Grupo Cordal), siempre con el sello `DEMO` visible. Los eventos simulados llevan la etiqueta `SIMULACIÓN`.
- La demo pública (`/demo`) no lee ni escribe la base: lee `src/demo/` y guarda lo del visitante en su navegador.
- Ferremix aparece solo en `/demo/ferremix` como "propuesta" / "así se vería", nunca como cliente activo. En el código, solo en `src/config/clientes/` (lo verifica `tests/unit/honestidad.test.ts`).
- Textos y números de las presentaciones y del sitio se editan en `src/config/` (lo sensible de inversores, en `inversion.ts`, que es `server-only`). Prospectos nuevos: `src/config/clientes/_plantilla.ts`.

## Convenciones
- Código, rutas y nombres de dominio en español (`producto`, `sucursal`, `venta`). Componentes de shadcn en `src/components/ui` (no editar salvo estilo).
- Lógica de negocio pura en `src/dominio/` (sin React, sin IO) y con tests en `tests/unit/`.
- Toda tabla de negocio lleva `org_id`; las políticas RLS viven en `supabase/migrations/` y se prueban en `tests/rls/`.
- Toda tabla nueva de `public` necesita privilegios explícitos para `anon`/`authenticated` (Supabase otorga ALL por defecto; la 0800 lo revoca a futuro y `tests/rls/privilegios.test.ts` lo controla).
- La app es local-first: la UI lee de la réplica local y escribe operaciones en la cola (`src/sync/`). Nunca escribir directo al servidor desde un componente.
- Animación solo con `transform`, `opacity` y trazos SVG. Respetar `prefers-reduced-motion`.
- Componentes compartidos en `src/components/`, nunca importados desde la carpeta de otra ruta de `src/app/` (provoca recargas en bucle en desarrollo).
- Dentro del escenario de las presentaciones, usar consultas de contenedor (`@container`) en vez de breakpoints de ventana.
- El salto del punto (`lanzarSalto`, `src/components/marca/salto.tsx`) solo en logros: cola sincronizada, presupuesto → venta, cierre de caja, conteo sin diferencias, aprobación completa.

## Antes de commitear
`npm run verificar` (typecheck, lint, tests unitarios y de RLS, build). Tests de punta a punta: `npm run test:e2e`.
