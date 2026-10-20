# Quvant — reporte de trabajo

> Yunque pasa a ser Quvant (`PROMPT-QUVANT.md`), en 10 tandas, en la rama `quvant`. Arriba, lo último; abajo, el historial de Yunque.

## Resumen · tanda 4 de 10 · El cambio de empresa (20/10/2026)

**La coreografía** (`src/components/demo/coreografia.ts`) es una sola línea de tiempo de GSAP, con el plugin Flip, de ~1,5 s con el selector cerrado y ~1,2 s si ya estaba abierto:

1. **El salto:** el punto cuadrado sale de la tarjeta de la empresa actual, traza su arco punteado (la misma geometría del salto de la marca) y cae en la tarjeta de la nueva. Si el selector está cerrado, el cambio primero lo abre.
2. **Los logos:** el de la empresa actual vuelve a su tarjeta y el de la nueva sale de la suya y se instala en la barra lateral (`Flip.fit`).
3. **El barrido:** un círculo (`clip-path`) que nace donde cayó el punto revela el estado nuevo sobre una foto del estado viejo. Lo que sale queda montado en esa foto y se apaga mientras pasa el barrido.
4. **La barra lateral** se reorganiza con `Flip.from`: los módulos que siguen se reacomodan y los nuevos entran. Cada ítem tiene un `data-flip-id` estable.
5. **Los números** ruedan del valor viejo al nuevo (los que no existían, desde cero).
6. **Las tarjetas** que existen en las dos empresas viajan de su lugar viejo al nuevo. Las demás entran. Solo `transform` y `opacity`.

**Con React:**
- La foto y el estado viejo se toman antes del cambio.
- El cambio se aplica con `flushSync` justo cuando cae el punto, y todo lo que se mueve después se agrega a la misma línea de tiempo en tiempos absolutos.
- Sin cortes ni parpadeos: es la misma app que se transforma.

**Para filmar (adelanto de la tanda 8):**
- Con `?film=1`, `/demo` expone `window.__seek(t)` y `window.__ready`.
- `__seek(t)` pausa el reloj global de GSAP y lo lleva a `t`.
- `scripts/marca/capturar-cambio.mts` saca cuadros clave del cambio, y `scripts/marca/hoja-contacto.mjs` los junta en una hoja.

**Verificación:** typecheck sin errores, lint de lo tocado limpio y `npm run build` sin errores (`/demo` compila como prerender parcial). Hubo tres vueltas con cuadros clave en `docs/capturas/quvant/tanda-4/`.

## Resumen · tanda 3 de 10 · Las cuatro empresas y la demo (20/10/2026)

1. **Las cuatro empresas** (`src/demo/empresas.ts`), todas ficticias y con el sello DEMO:

   | Empresa | Escala | Color |
   |---|---|---|
   | Kiosco La Esquina | 1 caja, 327 productos | tomate |
   | Ferretería Industrial Demo | 3 sucursales, 290 productos (sale del seed de la app) | verde azulado |
   | Distribuidora Ruta Clara | 12 preventistas, 400 clientes, 1.800 productos | azul |
   | Grupo Cordal | 40 sucursales en 6 provincias, 24.996 productos | ciruela |

   - **Nombres:** se buscaron en la web y no aparece ninguna marca conocida igual o parecida. "La Esquina" es un nombre genérico; solo aparece en restaurantes, que son otro rubro. Michel los puede cambiar en la configuración.
   - **Logos ficticios:** una palabra en una tipografía libre (OFL: Fredoka, Oswald, DM Serif Display y Marcellus), convertida a trazados en `src/demo/logos-empresas.ts`. No suman fuentes a la web.
   - **Módulos:** con la misma forma que `Organizacion.modulos`.
   - **Terminología propia:** Caja y Fiado en el kiosco; Preventa, Reparto y Cobranzas en la distribuidora; Consolidado, Sucursales y Aprobaciones en el grupo.
2. **Los datos, con dos implementaciones del mismo modelo** (`src/dominio/negocio.ts`):
   - **App:** `src/datos/negocio-desde-estado.ts` lo arma desde la réplica local.
   - **Demo:** `src/demo/`.
     - La ferretería se exporta del seed con ese mismo adaptador a `src/demo/ferreteria-snapshot.json` (129 kB, `npx tsx scripts/generar-snapshot-ferreteria.ts`).
     - Las otras tres se generan con semilla fija desde la fecha ancla (viernes 16/10/2026, 17:30), con 90 días de ventas con estacionalidad: viernes en el kiosco, fin de mes en la distribuidora.
     - El catálogo del grupo se arma al elegirlo (40 ms) y el stock por sucursal se calcula a pedido con un hash.
   - **El simulador del día** (`src/demo/simulador.ts`) es una función del tiempo y de la semilla, con la etiqueta SIMULACIÓN:
     - el kiosco vende cada pocos segundos;
     - en el grupo se mueven decenas de sucursales a la vez.
3. **`/demo`:**
   - Es pública, sin login, con `noindex`, y no toca la base.
   - Tiene una barra con "Estás viendo: [empresa] · DEMO", el selector de cuatro tarjetas sobre la grilla, el recorrido guiado y reiniciar.
   - Atajos: teclas 1 a 4 (salvo en un campo o en un mostrador) y ⌘E o Ctrl+E.
   - La empresa elegida queda en la dirección (`/demo?empresa=grupo`, con `history.replaceState`).
   - Lo que hace el visitante se guarda en su navegador (zustand con persist, `skipHydration`, `version` y `partialize`), y la dirección manda sobre lo guardado.
4. **Los tableros:**
   - El kiosco es amplio: cuánto vendí, la caja, el fiado, qué pedir y los precios.
   - La ferretería tiene densidad media: las sucursales, los 30 días por negocio y lo que hay que atender.
   - La distribuidora muestra preventistas contra su objetivo, cobranzas, deuda en la calle, reparto y los picos de fin de mes.
   - El grupo es denso: consolidado, mapa de Argentina con la grilla de puntos, la comparación de las 40 sucursales ordenable, provincias, aprobaciones y auditoría.
   - Productos y clientes van en tablas virtualizadas; en el grupo, sobre los 25.000 productos.
   - El cambio de empresa es, por ahora, un fundido simple.
5. **Tests:** `tests/unit/demo-empresas.test.ts` (14), que cubren estructura, determinismo, estacionalidad, códigos de barras, simulador y resúmenes.

**El mapa:** el contorno sale de Natural Earth (dominio público), simplificado, e incluye las Islas Malvinas, sin rótulos.

## Resumen · tanda 2 de 10 · El renombre y la app (20/10/2026)

**Pedido de Michel:** hacer todas las tandas restantes seguidas, con ejemplos dinámicos. Donde el prompt pedía esperar una elección, queda una por defecto que se cambia en la configuración.

1. **Titular:** queda la propuesta A, «Del kiosco a la empresa.» (`TITULAR_ELEGIDO` en `src/config/sitio.ts`). B y C siguen en `TITULARES_ALTERNATIVOS`. La bajada de la marca es «Software a la vanguardia de cada nicho.».
2. **El renombre:**
   - Todo lo visible pasa de Yunque a Quvant: el sitio, la app, los metadatos, los datos estructurados, el manifiesto, los íconos, el favicon (`src/app/favicon.ico`, `icon.png`, `apple-icon.png`), la imagen para redes (`opengraph-image.png`, `twitter-image.png`), los usuarios de prueba (`@demo.quvant.app`), las presentaciones, el ticket y el panel.
   - En el código: `<ConQuvant />` y `<ConQuvantDiscreto />`, y sellos estáticos en `public/marca/con-quvant-*.svg`.
   - Las claves internas (localStorage, cookies, eventos, base local) pasan a `quvant`. Efecto: en la demo se pierde una vez la sesión guardada.
   - La variable `QUVANT_PERMITIR_SECRETO_DEV` reemplaza a `YUNQUE_PERMITIR_SECRETO_DEV`, que se sigue leyendo como respaldo (documentado en `.env.example`).
   - Docs: README, CLAUDE.md, ARQUITECTURA, SEGURIDAD, ROADMAP y FORJA.
   - Los logos viejos ya no se publican: de `public/marca/` queda solo `antes-yunque-brand-board.png`, como "el antes".
3. **Material viejo de Forja, oculto hasta la tanda 10:**
   - la sección del sitio;
   - la escena de `/inversores`, con su test e2e marcado como omitido;
   - la frase «Lo firme y lo vivo, trabajando juntos»;
   - la placa «yunque + forja», que pasa a «FORJA · by Quvant».

   Los videos `public/demo/forja*.mp4` quedan en el repo, pero nada los muestra.
4. **Componentes base:**
   - el chip de estado y el punto, cuadrados;
   - el sello DEMO, sin rotación;
   - las cifras con `.t-numero-lg`, y los encabezados y paneles con las clases cerradas;
   - los diálogos sin desenfoque de vidrio;
   - los avisos con Plex Mono.
5. **El marco de la app:** el color de la empresa va solo en su logo, en el indicador del módulo activo y en la serie principal de sus gráficos. La barra de color de arriba y el avatar teñido se fueron. Los alias de Yunque se borraron de `globals.css` después de pasar 454 usos a los tokens nuevos.
6. **Tablero, mostrador y caja:** tres vueltas (ver `BITACORA-ESTETICA.md`), con todos los tamaños en clases cerradas. El resto de los módulos tuvo una pasada: sus textos chicos ya usan `.t-texto-sm`. Capturas en `docs/capturas/quvant/tanda-2/`.

**Verificación:** typecheck sin errores. `next dev` sin errores de página ni de consola en tablero, mostrador, caja, inventario, presupuestos, clientes, reportes e ingreso.

**Sin tocar a propósito:**
- las migraciones de Supabase ya aplicadas (solo dicen "Yunque" en comentarios);
- `src/forja/` por dentro (tandas 9 y 10);
- `docs/PITCH.md` (el guion se reescribe con `/inversores` en la tanda 8);
- las capturas de la app que usa el sitio (se regeneran en la tanda 7).

## Resumen · tanda 1 de 10 · La marca en el sistema (20/10/2026)

**Estado real:** demo funcional / piloto. Todavía no hay clientes pagando. Sin deploy ni `git push`.

**Qué se hizo**
1. **Logos** (`public/marca/quvant-*`, generados por `node scripts/marca/generar-marca.mjs`):
   - La Q cromada oficial, extraída sin cambios del PDF del manual (2000 px con transparencia).
   - La Q en una tinta (blanca y negra), sacada del alfa del original.
   - La firma principal y la negativa (SVG y PNG de 2400 px), los favicons (16, 32, 48 y `.ico`), los íconos de la app y la PWA (180, 192, 512, 1024 y *maskable*) y la imagen para redes de 1200×630.
   - Las proporciones de la firma se midieron en el manual y viven en `src/components/marca/q-geometria.ts`.
   - Todas las versiones se verificaron sobre negro, sobre claro y en su tamaño mínimo.
2. **Color:** los tokens del manual, la escala de grises 0 a 13, los cuatro colores de estado y los modos oscuro y claro completos, en un solo lugar (`src/app/globals.css`). Los tokens de Yunque quedan como alias hasta la tanda 2. El test de contraste (`tests/unit/color.test.ts`) lee los valores del CSS: si alguien cambia un token, se entera.
3. **Tipografía:** Michroma e IBM Plex Mono con `next/font` (se van Inter y JetBrains Mono), `font-synthesis: none` y 13 estilos cerrados (`.t-marca`, `.t-hero`, `.t-titulo`, `.t-texto`, `.t-etiqueta`, `.t-dato` y `.t-numero`, con sus escalones). Documentado en [`docs/TIPOGRAFIA.md`](TIPOGRAFIA.md).
4. **Componentes de marca** (`src/components/marca/`):
   - `<Firma />` e `<Isotipo />`: los archivos con `<img>`, con los mínimos y el resguardo.
   - `<IsotipoAnimado />`: el aro se traza, la cola aparece y el punto salta. Son máscaras sobre el PNG original.
   - `<Grilla />` y `<SaltoEnGrilla />`, con la geometría pura en `salto-geometria.ts`.
   - `lanzarSalto()`: reemplaza a la chispa en los cinco lugares donde se lanzaba.
   - `.lista-punto`: la viñeta cuadrada.
5. **Lámina** [`docs/marca/quvant-sistema.png`](marca/quvant-sistema.png) (2400×1500, tres vueltas en [`BITACORA-ESTETICA.md`](BITACORA-ESTETICA.md)) y **3 titulares** compuestos como hero en [`docs/marca/quvant-titulares.png`](marca/quvant-titulares.png). Las dos se generan desde `/marca/sistema` con `npx tsx scripts/marca/capturar-lamina.mts`.

**Verificación:**
- `typecheck`, sin errores. Tests unitarios y de RLS: 164 de 164. `eslint` de lo tocado, limpio.
- `next dev`: la lámina, el tablero, el mostrador (oscuro y claro) y el sitio cargan sin errores de página. En la consola solo aparecen los avisos de desarrollo de Next sobre navegación instantánea en `/app`, que no tienen que ver con esta tanda.
- Los e2e no se corrieron (piden `build`). Tres esperan ahora `momento-salto` en lugar de `momento-chispa`.

## Para Michel

1. **Elegí el titular** (se ven compuestos en `docs/marca/quvant-titulares.png`). Pedí la tanda 2 con `Titular: A`, `B` o `C`:
   - **A** · «Del kiosco a la empresa.»
   - **B** · «Una caja o cuarenta sucursales.» Ojo: hoy las cuarenta sucursales existen solo en la demo, no en un cliente.
   - **C** · «Se adapta a tu negocio. No al revés.»
2. **Mirá la lámina** contra tu manual: la Q, los colores y las letras. Revisá las piezas marcadas como **Extensión**: el modo claro, la escala de grises, los estados, Plex Mono 500 y 600, el salto como recompensa y la bajada en el pie del sitio.
3. **El logo: faltan tus archivos.** En `marca/` solo estaban los de Yunque. Usé la Q que trae el manual (un PNG de 2000 px, tal cual) y armé QUVANT en Michroma como **provisorio**, con las proporciones de la firma del manual. Michroma es más extendida y más fina que la letra del PDF: la firma provisoria queda un poco más ancha que la del manual. Mandá a `marca/`:
   - la firma principal y la negativa, mejor en SVG;
   - la Q en SVG, si existe. Con el aro, la cola y el punto como capas separadas, la animación se haría por capas (sin máscaras) y habría un favicon vectorial. Hoy solo hay PNG.
4. **La página 4 del manual quedó vieja.** Dice que Yunque es un producto de Quvant ("Yunque · by Quvant", con Forja como "complemento de Yunque" y Ludus). Elegiste que Yunque pasa a ser Quvant: conviene actualizar esa página del manual.
5. **El PDF del manual tiene texto viejo escondido.** Algunas páginas se corrigieron tapando el texto anterior. Al copiar o extraer texto del PDF sale la versión vieja (por ejemplo, "Versión 1" y una regla con "degradés" en la página 7). Yo seguí lo que se ve. Si lo vas a compartir, conviene reexportarlo limpio.
6. **¿Se lee peor el texto largo en mono?** En los párrafos del sitio y de la app, no lo noté: se lee cómodo, como dice el manual. Lo que sí pasa es que la monoespaciada ocupa más ancho. El buscador del encabezado y la navegación del sitio se parten en dos renglones, y en el tablero los nombres largos se cortan antes. Lo arreglan la tanda 2 (app) y la 7 (sitio). Capturas: `docs/capturas/quvant/tanda-1/app-tablero-oscuro.png` y `sitio-texto-largo.png`.
7. **El puerto 3000** lo estaba usando otro proyecto tuyo (`firmamento-1-proyecto`), así que no lo toqué. Esta app corrió en el 3010: `npm run dev -- -p 3010`.

## Decisiones de la tanda 1

| # | Decisión | Motivo |
|---|---|---|
| Q1 | La Q sale del PDF del manual, sin tocar sus píxeles (las cuatro copias del PDF son idénticas). | No había archivo de Quvant en `marca/`. Es el original que tiene el manual. |
| Q2 | Logotipo provisorio en Michroma +0,18 em. Q = 1, mayúsculas 0,46, separación 0,435, centrado en el alto del cuadrado (medido en las págs. 2, 5 y 6). | Lo aprobó Michel. El manual dice que la versión final se arma con Michroma (pág. 9). |
| Q3 | Yunque pasa a ser Quvant, aunque la pág. 4 del manual diga otra cosa. | Lo decidió Michel. Es la única contradicción entre el manual y el prompt que encontré. |
| Q4 | La lámina se compone a 1600×1000 y se captura a 1,5×. | Los estilos se ven a tamaño real y la imagen queda nítida a 2400×1500. |
| Q5 | Escala de 14 pasos, con siete valores tomados de las páginas del manual y tres interpolados en OKLab. | "Sin otros tonos": todo sale de la paleta y del propio manual. |
| Q6 | Estados sobrios (croma baja en OKLCH), uno por modo, AA como texto. | Que sirvan para punto, chip y texto sin ser color de marca. |
| Q7 | Los tokens de Yunque quedan como alias de los nuevos. | La app no se rompe. La tanda 2 los saca componente por componente. |
| Q8 | `--radius` de 10 a 4 px. | El manual es de esquinas rectas y el punto es cuadrado. |
| Q9 | El favicon es la Q cromada sobre un cuadrado negro. | Contraste en pestañas claras y oscuras. A 16 px se lee con su punto. |
| Q10 | La recompensa conserva la forma de llamarla (`lanzarSalto({ desde, mensaje })`) y suma la "aprobación completa". | Cambio de una línea en cada lugar. La aprobación llega en la tanda 6. |
| Q11 | El sello `DEMO` pierde la rotación y el redondeo. | La rotación era el carácter de Yunque. Quvant es preciso. El resto de los componentes base es de la tanda 2. |
| Q12 | Las 3 propuestas de titular viven en `src/config/sitio.ts` (`TITULARES_PROPUESTOS`). | La tanda 2 guarda la elegida ahí y borra la lista. |

## Para la tanda 2 (visto en la tanda 1)

- **Conectar los archivos nuevos:** `src/app/icon.png`, `apple-icon.png`, `manifest.ts` y `opengraph-image.tsx` todavía apuntan a Yunque. Los de Quvant ya están en `public/marca/quvant-*` (favicon `.ico`, `apple-icon-180`, `icono-192`, `512`, `maskable-512` y `og`).
- **Sacar los alias** (`--hierro`, `--temple`, `--chispa`, `.ficha`, `.num`, `.grilla-tecnica`…): pasar los componentes a los tokens y a las clases `.t-*`, y después borrar los alias de `globals.css`.
- **El color de la empresa**, solo donde dice 2.2. Hoy también tiñe la barra de 3 px arriba del todo y el avatar (`src/components/app/shell.tsx`). Los gráficos todavía no lo toman: `--serie-1` se resuelve en `<html>` y no ve el `--marca` del AppShell, así que hay que definir `--serie-1` en el mismo elemento.
- **Los estados en áreas grandes:** el aviso "Caja cerrada" del mostrador pinta un fondo entero con la alerta (`bg-chispa/10`). Tiene que quedar en un punto, un chip o un borde.
- **El ancho de la mono:** el buscador del encabezado se parte en dos renglones y los nombres largos del tablero se cortan antes.
- **`/marca`** sigue mostrando la identidad de Yunque: pasa a ser la de Quvant (la lámina ya está en `/marca/sistema`).

---

# Antes: Yunque (historial)

## Resumen · revisión final y Forja (10/10/2026)

**Estado real:** demo funcional / piloto. Primer piloto en negociación, sin clientes pagando. Pagos, facturación y WhatsApp **emulados**. **Publicado para revisión en https://yunque-rust.vercel.app** (modo demo, datos ficticios, sin Supabase). Republicado con Forja el 11/10/2026: `/forja` y `/demo/ferremix/forja` andan ahí, y los e2e de Forja (18) pasan también contra el sitio publicado.

### Listo y probado
- **App (`/app`)**: inventario multisucursal con escaneo y conteos, precios con aumento masivo, mostrador y caja, presupuestos → venta, servicio técnico, clientes y cuentas corrientes, compras, entregas, reportes, usuarios y permisos, co-branding, importador y auditoría. Recorrida con **los 9 usuarios de prueba**, cada módulo de su rol, en escritorio y celular, sin errores.
- **Sin conexión**: se corta la red, se vende, se recarga sin internet y al volver sincroniza solo. Un test e2e verifica que **cada venta llega una sola vez** al servidor, con número definitivo único, y que **el stock baja exactamente lo vendido** (validado con controles negativos).
- **Datos y acceso**: aislamiento entre empresas con RLS forzado y privilegios explícitos (48 tests sobre PostgreSQL real, emulando a Supabase). Doble factor exigido para dueño y administración en la app y en la base. `.env` fuera de git. `service_role` solo en el servidor.
- **Sitio (`/`)** con la demo "cortá la conexión" y la sección "Yunque + Forja"; **`/inversores`** (13 escenas, con clave); **`/demo/ferremix`** (7 escenas, sello `PROPUESTA` en todas; Ferremix no aparece en ningún otro lado del código: lo controla un test).
- **Forja** (extensión visual, estado *demo*, detalle en [`FORJA.md`](FORJA.md)): activación, red de sucursales en el mapa y en constelación, cada sucursal por dentro en 3D, repetición del día a 1200×, sala de control, recorrido de una pieza, versión 2D completa, demo pública `/forja`, propuesta embebible `/demo/ferremix/forja` y dos videos. Lecturas y tiempo real con RLS por sucursal en Supabase (escritos y probados, todavía sin usar: la app corre en modo demo).
- **"Pedir una demo"**: se guarda en la base y aparece en el panel interno **`/panel`** (clave `PANEL_KEY`) con aviso de solicitudes nuevas.
- **Verificación**: typecheck, lint y build sin errores; **160 tests** unitarios y de RLS y **42 e2e** en verde (con Forja). La revisión de pantallas de abajo es anterior a Forja. Recorrido de revisión: **216 pantallas, 0 fallas, 0 errores de consola** ([`capturas/revision/RESULTADO.md`](capturas/revision/RESULTADO.md)).

### Corregido en esta revisión
1. **Privilegios en Supabase real**: las tablas creadas después de la migración 0300 heredaban los privilegios de fábrica de Supabase. RLS evitaba la fuga, pero la defensa era de una sola capa. Ahora la migración 0800 deja solo lo necesario, y los tests emulan a Supabase.
2. **"Pedir una demo"** iba a un archivo que nadie leía: ahora va a la base (`solicitudes_demo`) y al panel.
3. **Cabeceras HSTS y `upgrade-insecure-requests`** se enviaban también por http: con `npm start` en una PC rompían pedidos. Ahora solo van con https.
4. Tests nuevos: mostrador sin conexión sin duplicados; doble factor de administración; privilegios; solicitudes.
5. `/marca` y la demo de Ferremix tenían `[COMPLETAR]` escritos a mano; ahora salen de `src/config/`.

### No está listo
- **Supabase real**: preparado, sin probar; la función SQL cubre 7 de 33 operaciones y falta el adaptador del cliente. Forja también: sus funciones y canales están listos, falta la fuente que los use.
- **Integraciones reales**: ARCA, Mercado Pago, WhatsApp y Mercado Libre.
- **Para producción**: auditoría externa, CSP con nonces, revocación de sesiones, recuperación del 2FA, backups con restauración probada, CI, panel con usuarios individuales y aviso de privacidad en el formulario.
- **Rendimiento del sitio en celular**: Lighthouse simulado 77–89 (objetivo 90).

### Los `[COMPLETAR]` que tenés que llenar

| Dónde se ve | Qué falta | Dónde se edita |
|---|---|---|
| `/inversores` · 2 El problema | 3 datos de mercado **con su fuente**: ferreterías, corralones y repuestos; distribuidores de maquinaria; negocios con sistemas de escritorio o planillas | `src/config/inversores.ts` → `MERCADO.datos` |
| `/inversores` · 3 El terreno | 5 hallazgos (sistema, precios y listas, stock y sucursales, presupuestos y clientes, sitio web) y la conclusión | `src/config/inversores.ts` → `TERRENO` |
| `/inversores` · 11 Inversión | monto y plan definitivo (hoy 25/40/20/15 %, preliminar) | `src/config/inversion.ts` → `INVERSION` |
| `/inversores` · 12 Equipo | rol y bio de Michel; nombre, rol y bio del socio; dos fotos | `src/config/inversion.ts` → `EQUIPO` (fotos en `public/`) |
| `/inversores` · 13 Cierre | nombre, email y teléfono de contacto | `src/config/inversion.ts` → `CONTACTO_INVERSORES` |
| `/` · "Pedir una demo" y pie | email y WhatsApp comercial | `src/config/sitio.ts` → `contacto` |
| `/demo/ferremix` | categorías reales y su fuente, 4 problemas del relevamiento, sucursales, plazo estimado y contacto | `src/config/clientes/ferremix.ts` |
| `/demo/ferremix/forja` | los negocios y sucursales reales del dueño (hoy Moreno es real y hay tres ubicaciones DEMO) y sus direcciones; después, `npm run snapshot-forja` y `npm run grabar-forja -- ferremix` | `src/config/clientes/ferremix.ts` → `forja` |
| `/` · Forja y `/app/extensiones` | precio mensual de Forja (se muestra "Consultá") | `src/config/precios.ts` → `extensiones.forja` |
| Proyecto de Ferremix | copiar `public/demo/forja-ferremix.mp4` a `public/propuesta/forja.mp4` de ese proyecto | (a mano) |
| No se muestran (solo configuración) | LinkedIn; validar la implementación promedio (USD 1.500) y los supuestos de la proyección | `src/config/sitio.ts`, `src/config/proyecciones.ts` |

---

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
| D41 | "Pedir una demo" se guarda en la **base**: en Supabase, `solicitudes_demo`; sin Supabase, una base PostgreSQL local (PGlite en `.data/base-local`) creada con el shim y las **mismas migraciones**, con los mismos roles (el sitio inserta como `anon`). Antes iba a un archivo `.jsonl` que nadie leía. | Pedido de la revisión final. La base local evita depender de claves y mantiene las reglas de producción. No sirve en serverless: en producción va Supabase. |
| D42 | El aviso de solicitudes va en un **panel interno** nuevo (`/panel`) con clave propia (`PANEL_KEY`), no en `/app`. | `/app` es el panel de cada empresa cliente y sus usuarios de prueba son públicos: mostrar ahí nombres y WhatsApp de interesados expondría datos personales. |
| D43 | El shim de Supabase de los tests replica los **privilegios por defecto** de Supabase, y la migración `0800_privilegios_api` los revoca y deja solo lo necesario. | La revisión encontró que, en Supabase real, las tablas creadas después de la 0300 quedaban con privilegios de más para `anon`/`authenticated` (RLS evitaba la fuga, pero era una sola capa). |
| D44 | Test e2e de "sin conexión sin duplicados" que lee la cola, lo confirmado y el log del servidor demo en IndexedDB y compara el stock antes y después. Se validó con controles negativos (rompiendo las dos defensas contra duplicados el test falla). | El test anterior solo verificaba que sincronizara. |
| D45 | Publicado en **Vercel** (proyecto `yunque`, https://yunque-rust.vercel.app) por pedido explícito, en modo demo. Claves nuevas como variables secretas; la base local de solicitudes usa `/tmp` (temporal); `outputFileTracingIncludes` lleva el SQL de las migraciones al servidor. | Para revisar el sitio, la app y las presentaciones desde el navegador. Producción real (con Supabase y dominio propio) sigue pendiente. |
| D46 | **Forja · token**: `--forja` (marca, #1A1F27) pasó a `--superficie`. El `--superficie` semántico que ya existía valía lo mismo que `--card` en ambos temas, así que sus usos pasaron a `bg-card` y el nombre quedó libre. Verificado con `scripts/comparar-visual.ts`: 20 capturas antes/después (temas claro y oscuro) idénticas; solo cambia la etiqueta del token en `/marca`. | Pedido de PROMPT-FORJA: que no se confunda con la extensión. |
| D47 | **Forja · estructura**: código en `src/forja/` (dominio puro, datos, interfaz) y un registro de extensiones (`src/extensiones/registro.ts`). La organización activa extensiones con una operación (`extension.activar`, tabla `extensiones_org`). | Separar la extensión del núcleo deja claro cómo se agregaría otra. |
| D48 | **Transferencias en tránsito**: nuevas operaciones `transferencia.despachar` (sale del origen) y `transferencia.recibir` (entra al destino), con su tabla. `stock.transferir` (inmediata) sigue y también queda registrada. | Forja dibuja transferencias en camino; el modelo anterior no tenía ese estado. Es una mejora real de Yunque (stock en tránsito). |
| D49 | **Permisos extra por persona** (`miembros.permisos_extra`, `Usuario.permisosExtra`): dueño y administración ven Forja por rol; a otra persona se le puede dar `forja.ver` y ve solo sus sucursales. En la demo, Lucía (mostrador Norte) lo tiene. | "Otros roles, si se les da permiso, ven solo la sucursal que tienen asignada." |
| D50 | `aplicar_operacion` ganó un **punto de extensión** (`app.op_extendida`): las operaciones nuevas (las de Forja) se agregan ahí sin volver a tocar el despacho principal. | Una sola reescritura de la función, documentada para futuras extensiones. |
| D51 | **Lecturas de Forja en SQL**: funciones `security invoker` (`forja_red`, `forja_sucursal`, `forja_pieza`) que además exigen `forja.ver` en cada sucursal; la vista de transferencias en tránsito con `security_invoker = true`. **Tiempo real**: triggers que emiten por Broadcast a `org:{org}:suc:{sucursal}` (solo si la empresa tiene Forja activa) y una política RLS sobre `realtime.messages` que solo autoriza esos canales a quien tiene `forja.ver` en esa sucursal. 14 tests con control negativo. | Reglas no negociables del documento. El shim de los tests replica `realtime.messages`, `realtime.topic()` y `realtime.send()`. |
| D52 | **Simulador de la demo**: propone intenciones (ventas al ritmo de cada sucursal, despachos hacia stock crítico, recepciones, avances de servicio) que se convierten en **operaciones reales** con un autor verosímil y se inyectan en el servidor demo: mismas reglas que la app. Solo en organizaciones demo, con el sello SIMULACIÓN; sus cambios no disparan el aviso "cambios desde otros puestos". | Que la demo se vea viva sin inventar datos fuera del modelo de Yunque. |
| D53 | deck.gl **9.3.11** (la 9.4.0 depende de `@loaders.gl/worker-utils@4.5.4`, que no está publicado) y `overrides` para fijar la familia `@loaders.gl` en 4.5.3. | Instalación reproducible. |
| D54 | Coordenadas: "Ferremix Moreno" (Av. Bartolomé Mitre 2322, Moreno) geocodificada **una vez** con Nominatim (OpenStreetMap): −34,65088, −58,78347. Las sucursales de la empresa demo tienen coordenadas **ilustrativas** en el Gran Buenos Aires (son ficticias: sello DEMO). Error a reportar: en esa única consulta mandé el email del usuario en el encabezado User-Agent (Nominatim pide contacto) sin preguntar antes. | Pedido del documento; la consulta no se repite. |
| D55 | **Red (nivel 1)**: MapLibre con el estilo dark-matter de CARTO teñido a la paleta (atribución visible), deck.gl encima para arcos 3D, estelas que recorren los arcos y el brillo de los nodos; los **nodos son elementos del DOM** (botones accesibles) que se ubican con la proyección del mapa o con el diseño de la constelación, y se reacomodan con GSAP. | DOM para lo que se lee y se toca (texto nítido, foco, teclado); WebGL para lo que brilla y se mueve. |
| D56 | El **worker de MapLibre** se copia de `node_modules` a `public/vendor/maplibre/` antes de `dev` y `build` (`scripts/copiar-maplibre.mjs`) y se fija con `setWorkerUrl`. | Turbopack no resuelve la URL del worker que arma MapLibre; así queda la misma versión instalada y dentro de la CSP (`'self'`). |
| D57 | Las server actions compartidas pasaron a `src/acciones/` (`sitio.ts`, `ingreso.ts`). | En desarrollo, `/` y `/ingresar` se recargaban en bucle por importar acciones desde la carpeta de otra ruta (existía desde las fases de Yunque; los e2e corren contra producción y no lo veían). |
| D58 | CSP: `connect-src` e `img-src` suman `basemaps.cartocdn.com` y `*.basemaps.cartocdn.com` (estilo, tiles, fuentes y sprites del mapa). | Mínimo necesario para el mapa base gratuito. |
| D59 | **Plano del taller** como dominio puro (`src/forja/dominio/plano.ts`), compartido por la escena 3D y la futura versión 2D. El depósito agrupa los racks por categoría (secciones de a tres por fila, un rack por letra de la ubicación) y dibuja **un bloque por producto** en cuatro niveles (tres estantes por nivel), no un bloque por estante. Lo listo o sin reparación va al **estante de retiro**, no a un banco. En el muelle solo están las **entregas pendientes**: lo despachado ya salió. | La demo tiene 89 racks con unos tres productos cada uno repartidos en 12 estantes: un bloque por estante dejaba casi todo vacío. Así se lee el stock real de cada producto y la planta refleja lo que físicamente está ahí. |
| D60 | Las **etiquetas del taller** (zonas, secciones, órdenes, cola sin conexión, tooltip del rack) son elementos del DOM que la escena proyecta en cada cuadro (solo `transform`), en lugar de `Html` de drei. | `Html` crea una raíz de React por etiqueta: al salir del taller React avisaba 27 veces "synchronously unmount a root while rendering". Con la capa propia: cero avisos, texto nítido con las fuentes de la app y un solo render de React. |
| D61 | **Transición mapa → taller**: `flyTo` (1,5 s, zoom 15,5, 62° de inclinación) → el brillo del nodo, con el color de su calor, crece hasta cubrir la escena → debajo se monta el taller con la cámara casi cenital → al dibujar el primer cuadro, el brillo se funde (0,8 s) mientras la cámara baja al corte isométrico (1,6 s). La vuelta es el camino inverso. Con movimiento reducido no hay vuelo ni descenso, solo un fundido corto. three.js se descarga recién al hacer clic, mientras vuela el mapa. | El documento pide flyTo + iris/fundido + cámara descendente; el fundido con el brillo (opacidad y escala) respeta la regla de animar solo `transform` y `opacity`. |
| D62 | El inventario acepta `?sucursal=…&ubicacion=HE-A` (con un filtro visible que se puede quitar) para el enlace "Ver el rack en inventario". El enlace a una orden pasó a `?id=` (el de la fase 2 usaba `?orden=`, que la página no lee). | "Enlaces directos al módulo (inventario filtrado, orden de servicio, presupuesto)". |
| D63 | El e2e "taller: el equipo pasa a listo" usa un reloj fijo. | La demo se genera según la fecha: el 10/10 no quedaba ninguna orden "En reparación" y el test fallaba sin que nada estuviera roto. |
| D64 | Las capturas siguen pidiendo movimiento reducido (salen estables), salvo la de la transición: movimiento normal y reloj de la página en pausa, avanzando de a 32 ms hasta el cuadro buscado. | El render por software del navegador de pruebas es más lento que el tiempo real; con el reloj en pausa la foto cae siempre en el mismo instante. |
| D65 | **Repetición del día**: la red se reconstruye a la hora del cursor con la misma función que el vivo (`redForja(e, hora)`): ventas y calor, stock (el actual menos lo que se movió después), transferencias (según su despacho y su recepción) y órdenes de servicio (su último evento hasta esa hora). Presupuestos abiertos y ventas sin sincronizar se muestran como están hoy. El tramo va de la apertura (8:00, o el primer evento) hasta ahora: a 1200×, diez horas pasan en 30 s. Al alcanzar el presente vuelve sola a "en vivo"; entrar a una sucursal también la termina (el taller muestra el presente). | Una sola fuente de verdad para el vivo y la repetición. Lo que no tiene historial en el modelo (presupuestos) no se inventa: queda como hoy. |
| D66 | El cursor de la repetición avanza cuadro a cuadro en un objeto mutable del store (`reloj`), que el mapa lee sin provocar renders; React se entera unas 8 veces por segundo (barra, contadores, red recalculada). Un salto grande en la barra no dispara un pulso por cada venta (máximo 12 por paso). | Fluidez a 1200× sin recalcular la red 60 veces por segundo. |
| D67 | **Sala de control**: pide pantalla completa y que la pantalla no se apague (Wake Lock), si el navegador lo permite; si no, ocupa el área de Forja. Recorre la red completa y cada sucursal cada 20 s con un vuelo suave, con los números en grande y los **titulares** del día derivados de los eventos (quiebres de stock, transferencias, equipos listos o presupuestados, ventas sin conexión y las ventas del 5 % más alto del día). Los sellos DEMO y SIMULACIÓN siguen visibles. Esc o "Salir" para volver. | "Pantalla completa para una TV en la oficina… eventos importantes como titulares". |
| D68 | La leyenda de calor pasó del encabezado al mapa (arriba a la izquierda) y la atribución de CARTO/OpenStreetMap sube por encima de la línea de tiempo. | El encabezado se partía en dos renglones con el sello REPETICIÓN, y la barra tapaba la atribución, que tiene que verse. |
| D69 | **Activación con un solo reloj**: la capa del DOM lleva el tiempo (segundos) y la escena 3D, los textos, el brillo y el iris se dibujan como función de ese reloj, según el cronograma de `src/forja/dominio/activacion.ts` (4,5 s, con test). Arranca cuando la escena dibujó su primer cuadro y avanza como mucho 50 ms por cuadro (con la pestaña oculta, se pausa). La escena 3D se descarga aparte y empieza a bajar cuando el puntero se acerca a "Activar" o "Ver la activación". | Saltar, pausar y grabar cuadro a cuadro (los videos de la fase 8) salen gratis; nada se pierde si la escena tarda en cargar. |
| D70 | **La escena**: el isotipo se extruye desde su propio trazo (`TRAZO_YUNQUE`, sin la estrella) en acero oscuro con reflejos de un entorno generado en el navegador (`RoomEnvironment`: no se descarga nada); sin piso visible, solo la sombra de contacto sobre `--hierro`. Las chispas son el mismo sistema de estelas del taller; el polvo, puntos que se apagan contra el fondo; la campana y la chimenea se dibujan con líneas de luz (trazo progresivo); la brasa son halos aditivos que laten y una luz que calienta lo que la rodea. La estrella de 4 puntas aparece solo en el isotipo, junto al nombre, al final. | Reglas de estética del documento: materiales monocromos, color solo en lo vivo, chispas como estelas. |
| D71 | **Brillo, iris y encendido**: el brillo es una capa del DOM con un degradado radial que llena la pantalla (opacity) y se abre escalando (transform). Después, las sucursales se encienden una por una: animación CSS de opacity y scale con un turno por índice, y el brillo de deck.gl con el mismo ritmo. | Solo `transform` y `opacity`, como pide el proyecto. |
| D72 | **Cuándo se ve**: la primera vez que cada persona entra a Forja (preferencia `forja.activacion_vista`, guardada en el servidor con la operación `usuario.preferencia`) y cada vez que la pide desde Extensiones (`?activacion=1`, que se quita de la dirección al terminar: recargar no la repite). Se salta con el botón, Esc o Enter. **Sonido** opcional sintetizado con Web Audio (golpe y chisporroteo, sin archivos), apagado por defecto. | "Se ve la primera vez… se puede repetir desde ahí… se guarda en las preferencias del usuario en el servidor." |
| D73 | **Respaldo**: con movimiento reducido, sin WebGL (la escena falla) o si no carga en 8 s, una versión quieta (isotipo, nombre y frase durante 1,8 s, con fundido) que nunca traba la entrada a Forja. | La versión 2D completa llega en la fase 7; la activación ya no depende del 3D. |
| D74 | **Nivel 3 sobre el mapa**: la pieza no cambia de motor ni de cámara; el mapa reemplaza las transferencias del día por los flujos de la pieza (grosor por cantidad) y marca cada sucursal (stock del producto con su estado, o las reparaciones de la máquina; las sucursales por las que no pasó se atenúan). El panel lateral trae la historia y la red se encuadra en el espacio que deja libre. Se entra desde el buscador ⌘K, desde un rack o una orden del taller, o con `?pieza=producto:<id>` / `?pieza=maquina:<serie>`. | Mapa y panel cuentan lo mismo; el nivel 3 es una lectura de la red, no otro lugar. |
| D75 | **Recorrido de un SKU** (últimos 28 días): stock y mínimo por sucursal, flujos entre sucursales (incluidas las transferencias en camino) y cada movimiento con el saldo que dejó, reconstruido hacia atrás desde el stock actual (cierra exacto; hay test). | "El recorrido de un SKU por las sucursales (arcos en el mapa y línea de tiempo de movimientos)". |
| D76 | **Historia de una máquina**: Yunque registra el número de serie solo en servicio técnico, así que la historia junta todas las órdenes de esa serie en las sucursales visibles. Las "ventas que coinciden" (al mismo cliente, misma marca y tipo de equipo, antes del primer ingreso) se muestran rotuladas como coincidencia, no como vínculo comprobado. Registrar series en compras y ventas queda en el ROADMAP. | El documento pide "compra, venta y reparaciones"; no se inventa un dato que el sistema no tiene. |
| D77 | **Demo**: una de cada seis órdenes de servicio es el reingreso de una máquina ya entregada (mismo cliente y número de serie), elegida sin usar el generador aleatorio: el resto de la demo queda idéntico. | Para que la historia de una máquina tenga más de una reparación. |
| D78 | **Bug de Yunque encontrado**: el buscador ⌘K no abría. El `CommandDialog` de esta versión de shadcn no incluye el `<Command>` de cmdk y la paleta tampoco lo ponía: cmdk fallaba al montarse ("Cannot read properties of undefined (reading 'subscribe')"). Se envolvió el contenido en `<Command>` en la paleta, sin tocar `src/components/ui`. Ningún test abría el buscador; ahora el e2e del nivel 3 lo usa. | Venía de la fase 1; apareció al usarlo como entrada al nivel 3. |
| D79 | **Versión 2D completa**: se usa con movimiento reducido o en hardware bajo, como lo define el documento (menos de 4 núcleos, ahorro de datos activo o sin WebGL2), y también a mano con el interruptor 2D/3D del encabezado (queda recordado en el navegador). El mapa es SVG: proyección Mercator, cuadrícula y escala en km, sin mapa base (nada que descargar), con los mismos nodos del DOM, tarjeta, transferencias (arcos con el bulto ubicado según la hora; un trazo corre sobre el arco salvo con movimiento reducido), constelación, pieza, repetición y sala de control (el "vuelo" es un acercamiento con transform). El taller es un plano de planta SVG hecho con el mismo `planoTaller`: zonas, racks con su llenado y estado, puestos, bancos con orden y luz de estado, estante de retiro, palets y portón, con el mismo panel y la misma barra de zonas. | "Mapa SVG con nodos y plano de planta 2D por sucursal, con los mismos datos e interacciones." |
| D80 | En 2D **no se descargan MapLibre, deck.gl ni three.js**: el mapa 3D pasó a carga diferida y las precargas (el taller 3D al entrar a una sucursal, la escena de activación en Extensiones) no corren cuando se va a usar la versión 2D. Lo verifica un e2e. | Para equipos modestos y ahorro de datos, lo liviano tiene que ser liviano de verdad. |
| D81 | Los paneles de transferencias pasaron a su propio módulo y la tarjeta del nodo consulta la posición con funciones (los refs no se leen durante el render): 2D y 3D comparten nodos, tarjeta y paneles. | Una sola interfaz para los dos motores. |
| D82 | Las capturas fijan la vista (3D por defecto) en el almacenamiento del navegador, porque con movimiento reducido la app pasa sola a 2D; las de la versión 2D la piden explícitamente. | Que cada captura muestre lo que dice su nombre. |
| D83 | **Demos públicas sin base**: `/forja` (empresa de demostración) y `/demo/<prospecto>/forja` (PROPUESTA) trabajan sobre un **snapshot generado desde el seed** (`npm run snapshot-forja` → `src/demo/forja-snapshot.json` y `src/demo/<prospecto>-snapshot.json`, unos 2 MB cada uno, recortados a lo que Forja y el simulador usan). El **reloj de la demo** arranca en el momento del snapshot (miércoles 16:30) y avanza en tiempo real; el **simulador corre en el navegador** y aplica operaciones con el mismo reductor de Yunque. Sin sesión, sin lectura anónima y sin tocar RLS. | Lo pide el documento ("sin acceso a la base… sin debilitar RLS"). El reloj propio evita reacomodar fechas y que la demo se vea vacía de noche. |
| D84 | **Honestidad en el código**: el nombre del prospecto sigue apareciendo solo en `src/config/clientes/` (lo verifica `honestidad.test.ts`). Su snapshot no guarda nombres de la empresa ni de las sucursales (solo códigos): los pone la configuración al cargar, junto con la ubicación real de Moreno y las tres ubicaciones ilustrativas (Merlo, General Rodríguez y un depósito en Paso del Rey), marcadas DEMO y con `[COMPLETAR con los negocios y sucursales reales del dueño]` visible en la demo. El script de videos arma la toma de cada prospecto desde esa configuración. | La regla del proyecto y las del documento de Forja, juntas. |
| D85 | El **generador del seed** acepta sucursales a medida (`sucursales`: código, nombre, ubicación, tipo, ficticia o no, ritmo de ventas): cambia las de siempre por su código y suma las nuevas. Sin esa opción, la demo de siempre sale idéntica. Las sucursales nuevas venden con administración y el dueño. | La demo del prospecto tiene cuatro sucursales (una real, tres DEMO) y un depósito. |
| D86 | **Embebible solo esa ruta**: `/demo/<prospecto>/forja` lleva `frame-ancestors 'self'` más los orígenes de su configuración (`https://ferremix-propuesta.vercel.app http://localhost:*`) y no lleva `X-Frame-Options`; la regla general de cabeceras la excluye con una búsqueda negativa, así no la pisa. El resto del sitio sigue con `frame-ancestors 'none'` y `X-Frame-Options: DENY`. Un prospecto sin demo de Forja responde 404 real (en el proxy). | "Solo en esa ruta… sin X-Frame-Options y sin que una cabecera global la pise." |
| D87 | La demo pública ocupa toda la ventana del iframe, sin barras de desplazamiento, y está probada a 1920×1080 (videos y capturas). No se escala con `transform`: MapLibre y deck.gl calculan el puntero con el tamaño real del lienzo. | Escalar el lienzo del mapa rompía la puntería de los arcos. |
| D89 | **Taller a demanda**: `frameloop="demand"`; cada animación pide cuadros mientras dura (tweens de cámara, chispas, golpe del rack, bultos, destello de la pantalla, la baliza de un puesto sin conexión) y cada evento nuevo o cambio de datos pide uno. Quieto, el taller no gasta GPU. `dpr` adaptativo con `PerformanceMonitor` (arranca en 1,5, sube a 2 o baja a 1 según los cuadros por segundo) y el mapa con `pixelRatio` hasta 2. | "frameloop demand cuando no hay movimiento", "dpr adaptativo". |
| D90 | **Pérdida del contexto WebGL**: el taller sigue en el plano 2D, el mapa en la versión 2D y la activación en su versión quieta, con un aviso. Lo prueba un e2e que fuerza la pérdida con `WEBGL_lose_context`. | "Manejar la pérdida de contexto WebGL": que nunca quede una pantalla negra. |
| D91 | **Teclado y lectores de pantalla**: flechas, Inicio y Fin entre los nodos de la red y entre las zonas del taller (además de Tab), la tarjeta del nodo también con el foco, y una región en vivo que anuncia lo importante (quiebres de stock, llegadas, equipos listos) con una pausa de 8 s entre anuncios y nada durante la repetición. | "Navegación por teclado entre nodos y zonas, y textos alternativos de los estados". |
| D88 | **Videos**: `scripts/grabar-forja.mjs` graba cuadro a cuadro con el reloj de la página en pausa (60 fps exactos aunque el render vaya más lento), en Chromium con aceleración de GPU (ANGLE/D3D11 en esta PC), y codifica H.264 con `ffmpeg-static`. En modo `?grabar` el simulador se detiene, la activación espera la señal del guion y los eventos (venta, quiebre de stock) los pide el script: las tomas salen siempre iguales. Secuencia de 46 s: activación, red con transferencias, entrada a Casa Central / Moreno, dos ventas en el mostrador, un rack que pasa a crítico y la repetición del día a 1200×. | El documento pide GPU y 60 fps; el reloj en pausa garantiza la fluidez. |

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
- Tests: 103 unitarios + RLS (3 nuevos de honestidad: Ferremix solo en su configuración, ningún prospecto como "cliente activo" o "caso de éxito", estados válidos del registro); 19 e2e (2 nuevos: marca, sellos y escenas de Ferremix; prospecto inexistente → 404; en la fase 8 se sumó un tercero).
- Capturas de las 7 escenas en escritorio y celular (`docs/capturas/demo-ferremix-*`).

### Fase 8 — Documentación, pulido y verificación final
- **Documentación**: [`ARQUITECTURA.md`](ARQUITECTURA.md) (componentes, modo demo vs. Supabase, modelo multiempresa, sincronización y reglas de conflicto, deudas técnicas), [`SEGURIDAD.md`](SEGURIDAD.md) (medidas actuales, lo que falta, lista para auditoría profesional), [`PITCH.md`](PITCH.md) (guion de las 12 escenas con sus `[COMPLETAR]` y preguntas probables), [`ROADMAP.md`](ROADMAP.md) (etapas desde `src/config/hoja-de-ruta.ts`) y `README.md` (cómo correrlo, usuarios, rutas, teclas).
- **Pulido**: `shadcn` pasó a `devDependencies` (solo se usa su CSS al compilar): `npm audit --omit=dev` da 0 vulnerabilidades. El script de capturas cierra el servidor que levanta (en Windows quedaba huérfano) y copia al sitio solo las capturas que usa.
- **Bug encontrado al revisar las capturas** (introducido en la fase 7): el filtro de prospectos del proxy (`/demo/:cliente`) también atrapaba los archivos de `public/demo/` y el logo de la empresa demo respondía 404 en toda la app. Ahora los slugs no admiten punto; test e2e nuevo con control negativo (falla con el código anterior). Se rehicieron todas las capturas, incluidas las que usa el sitio.
- **Capturas**: 98 archivos en `docs/capturas/` — todas las pantallas del sitio, la app (por rol), el ingreso, las 12 escenas de inversores y las 7 de la demo de Ferremix, en escritorio (1440×900) y celular (390×844); algunas pantallas de detalle solo en escritorio.
- **Verificación final**: typecheck, lint, 103 tests unitarios + RLS, build y 20 tests e2e, todo en verde.

## Qué quedó hecho

- **App** (`/app`): inventario multisucursal con escaneo y conteos, precios con aumento masivo, mostrador que vende sin conexión (incluso tras recargar sin internet), caja, presupuestos → venta, servicio técnico, clientes y cuentas corrientes, compras, entregas, reportes, usuarios y permisos por rol con doble factor, configuración con co-branding, importador, auditoría. Local-first con sincronización y reglas de conflicto probadas.
- **Base**: esquema multiempresa en Supabase/PostgreSQL con RLS forzado, escrituras solo por una función con permisos, auditoría de solo agregar; probado con PGlite.
- **Sitio** (`/`): héroe animado, demo interactiva "Nunca se cae", precios al día, estado real del producto desde el registro; Lighthouse escritorio 100/100/100/100.
- **Presentación para inversores** (`/inversores`): 12 escenas con clave, demo del producto en vivo, controles completos.
- **Demo comercial** (`/demo/[cliente]`, `/demo/ferremix`): un archivo por prospecto, su marca y sello PROPUESTA.

## Pendientes

**De contenido (no de código)** — todo visible como `[COMPLETAR]`:
- Presentación: datos de mercado con fuente, hallazgos del terreno y conclusión (`src/config/inversores.ts`); monto, porcentajes definitivos, equipo con fotos y contacto (`src/config/inversion.ts`); validar supuestos de proyección (`src/config/proyecciones.ts`).
- Ferremix: categorías reales, problemas detectados, sucursales y contacto (`src/config/clientes/ferremix.ts`).
- Sitio: datos de contacto (`src/config/sitio.ts`).

**Técnicos** (detalle en ARQUITECTURA y SEGURIDAD):
- Modo Supabase: adaptador del cliente, carga inicial, 26 tipos de operación por portar a SQL, probar contra una instancia real.
- Seguridad antes de producción: auditoría externa, CSP con nonces, revocación de sesiones, recuperación del 2FA, datos locales al salir, backups con restauración probada, CI.
- Performance móvil del sitio en Lighthouse simulado (77–89; objetivo ≥ 90).
- Comparar con el proyecto de Ferremix cuando haya acceso e integrar lo mejor (D8).
- Validación de "instant navigation" de Next 16.4 en las páginas de `/app` (aviso solo en desarrollo; ver Forja · Fase 3).

## Cómo levantar el proyecto

```bash
npm install
npm run dev                      # http://localhost:3000 (modo demo, sin claves)
npm run verificar                # typecheck + lint + tests + build
npm run build && npm run test:e2e
npm run build && npm run capturas
```

Variables en `.env.example` (todas opcionales en desarrollo). Sin Supabase, todo corre en modo demo.

## Usuarios de prueba

Contraseña **`demo1234`** para todos. Dueño y administración pasan por el doble factor: el código se muestra en la pantalla de verificación (autenticador emulado).

`dueno@demo.yunque.app` (dueño) · `admin@demo.yunque.app` (administración) · `mostrador@demo.yunque.app` (mostrador, Casa Central) · `mostrador.norte@demo.yunque.app` (mostrador, Norte) · `maquinaria@demo.yunque.app` (mostrador, maquinaria) · `deposito@demo.yunque.app` (depósito) · `tecnico@demo.yunque.app` y `tecnico2@demo.yunque.app` (técnicos) · `compras@demo.yunque.app` (compras).

## Teclas de las presentaciones

Clave de `/inversores`: `INVERSORES_KEY` (en desarrollo, si falta, `yunque-demo`). `/demo/ferremix` no lleva clave.

**P** reproducir/pausar · **H** ocultar controles y cursor · **R** reiniciar · **1/2/3** velocidad 0,75×/1×/1,25× · **→ ↓ AvPág Espacio** siguiente · **← ↑ RePág** anterior · **Inicio/Fin** primera/última · **F** pantalla completa · **`#N`** en la URL va a la escena N.

### Revisión final (10/10/2026)
Pedido: verificar y corregir, sin funciones nuevas (salvo el destino de "Pedir una demo"). Resultado resumido al principio de este documento.
- **Tests**: los de RLS primero (40/40 al empezar). Se agregaron 8 (privilegios de la API y solicitudes) y el *shim* ahora replica los privilegios por defecto de Supabase: **48/48**. Total 111 unitarios + RLS y 23 e2e.
- **Mostrador sin conexión**: test nuevo `tests/e2e/sin-conexion.spec.ts`. Lee de IndexedDB la cola, lo confirmado y el log del servidor demo: tres ventas sin red, recarga, reconexión y sincronización forzada → cada operación una vez en el servidor y en el dispositivo, cola vacía, números definitivos únicos, stock −2 y −1 exactos. Controles negativos: sin la limpieza de la cola falla; sin las dos defensas contra duplicados (idempotencia por operación en el servidor y rechazo de venta repetida en el reductor) el servidor registra 2 y el test falla.
- **Honestidad**: sin clientes, métricas, testimonios, certificaciones ni logos inventados (búsqueda en todo `src/` y `public/`). Ferremix solo en `src/config/clientes/` y `/demo/ferremix`, con sello `PROPUESTA` en todas las escenas. Los `[COMPLETAR]` visibles se listan en el resumen y en `capturas/revision/RESULTADO.md`.
- **"Pedir una demo"**: antes iba a `.data/solicitudes-demo.jsonl` (nadie lo leía; en serverless no se puede escribir). Ahora va a la base y al panel `/panel` (D41, D42). El archivo viejo solo tenía envíos de los tests e2e.
- **Seguridad**: `.env.local` nunca estuvo en git; ningún archivo del navegador menciona `service_role`, secretos ni claves; 2FA verificado para dueño y administración. Corregidos los privilegios de fábrica de Supabase (D43) y las cabeceras HSTS/`upgrade-insecure-requests` por http. `SEGURIDAD.md` actualizado.
- **Recorrido**: `scripts/revision.ts` → 216 pantallas (sitio con la demo de corte, los 9 usuarios de prueba en cada módulo de su rol, 12 escenas de inversores y 7 de Ferremix) en 1440×900 y 390×844. La primera pasada encontró 32 errores en la demo de Ferremix (pedidos subidos a `https://localhost`); corregido, la segunda dio **0 errores**. Capturas en `docs/capturas/revision/`.
- **Publicado en Vercel** (https://yunque-rust.vercel.app, D45): el mismo recorrido contra el sitio publicado dio **216 pantallas, 0 fallas, 0 errores**. "Pedir una demo" → `/panel` probado en producción: se guarda y aparece como nueva.

## Forja — la extensión visual (PROMPT-FORJA.md)

### Forja · Fase 1 — Base
- **Token**: `--forja` → `--superficie` sin cambios visibles (D46). **Paleta de calor**: `--frio`, `--ascua`, `--brasa`, `--blanco-caliente` (más `--temple` y `--chispa` de Yunque) y escala continua interpolada en OKLab (`src/forja/dominio/calor.ts`).
- **Modelo de datos**: sucursales con ubicación, tipo y marca de ficticia; transferencias en tránsito; extensiones por empresa; preferencias por persona; permisos extra (D47–D50). Migración `0900_forja.sql`.
- **Lecturas y tiempo real con RLS** (D51): funciones de Forja, vista con `security_invoker` y canales privados por sucursal.
- **Dominio de Forja** (`src/forja/dominio/`): modelo de red y de taller desde el estado de Yunque, eventos del día (incluidos los quiebres de stock reconstruidos hacia atrás), geometría y simulador (D52).
- **Rutas**: `/app/extensiones` (activar, precio "Consultá" mientras sea `[COMPLETAR]` en `src/config/precios.ts`) y `/app/forja` (carga diferida con `next/dynamic`, solo dueño, administración o permiso extra, y con la extensión activa). Forja aparece en la navegación solo si está activa.
- **Stack** instalado (Three.js, React Three Fiber, drei, MapLibre, deck.gl, GSAP, zustand) para las fases siguientes (D53).
- El *shim* de Realtime va en su propio archivo (`supabase/local/shim-realtime.sql`): la base local aplica cada archivo una sola vez por nombre, y agregar Realtime al shim original había dejado sin aplicar la migración 0900 en una base ya creada (lo detectaron los e2e de "Pedir una demo").
- Tests: 15 unitarios de Forja, 14 de aislamiento de Forja (lecturas, vista, canales, operaciones) y 2 e2e (activación con simulación viva; permiso extra ve solo su sucursal y sin permiso no hay acceso). Capturas en `docs/capturas/forja/`.

### Forja · Fase 2 — Red en el mapa
- **Mapa** (MapLibre, estilo oscuro de CARTO teñido: hormigón y grafito, nombres apagados, sin puntos de interés) con inclinación de 50°, encuadre de toda la red y atribución visible (D55, D58).
- **Nodos-forja**: núcleo con el color de la escala de calor, anillo con la porción de stock crítico en ámbar, halo contenido (deck.gl, aditivo) y pulso por cada venta en vivo. Nombre, código y sello DEMO en cada sucursal ficticia.
- **Transferencias en tránsito**: arcos 3D con estelas finas que recorren el arco (sentido y movimiento) y el bulto ubicado según la llegada estimada; clic en el arco o en la lista → detalle con productos, cantidades, salida y llegada estimada.
- **Tarjeta del nodo** (cursor o foco): ventas de hoy, presupuestos abiertos, stock crítico y sin stock, ventas sin sincronizar y órdenes de servicio por estado.
- **Constelación**: disposición radial con nodos dimensionados por facturación (28 días) y enlaces con grosor por volumen de transferencias; el interruptor Mapa/Constelación reacomoda los nodos con una animación de 0,9 s.
- Carga diferida verificada en e2e: los scripts de `/app/inventario` no contienen MapLibre ni deck.gl.
- Arreglos de paso: worker de MapLibre (D56) y bucle de recargas en desarrollo (D57).
- Tests: 3 e2e de Forja (red completa con tarjeta, transferencia, constelación y simulación; permisos por sucursal; carga diferida). Capturas en `docs/capturas/forja/forja-red-*`.

### Forja · Fase 3 — Taller isométrico (nivel 2)
- **Escena** (React Three Fiber, carga diferida): cámara ortográfica, losa, dos paredes cortadas (fondo e izquierda, con el portón del muelle), luz cenital suave, sombras de contacto y materiales monocromos; el color aparece solo como emisión (estado, calor, chispas) y `--temple` solo en el contorno de selección. El plano sale de los datos de Yunque (D59).
- **Mostrador**: un puesto por caja con su pantalla (encendida si la caja está abierta). Cada venta enciende la pantalla y hace saltar chispas (estelas finas con física simple y mezcla aditiva). Si hay ventas sin sincronizar, luz ámbar y un ticket por venta en la cola.
- **Depósito**: racks instanciados por ubicación y un bloque por producto: altura = stock relativo (contra tres veces el mínimo), frío si está bien, ámbar en el mínimo o debajo, hueco marcado (ascua) sin stock. Cuando un rack pasa a crítico, un golpe ámbar en sus aristas. Al pasar el cursor: productos, estante y cantidades.
- **Servicio técnico**: bancos con la máquina como bloque sobrio, número de orden, luz de estado y barra de tiempo en el banco (ámbar si está atrasada); estante de retiro para lo listo o sin reparación.
- **Carga y entregas**: un palet por entrega pendiente; cuando sale una transferencia, el bulto (con zuncho brasa) cruza el portón y se va, y en el nivel 1 aparece como arco en tránsito. Umbral del portón en brasa y "N en tránsito" si hay mercadería en camino.
- **Interacciones**: contorno `--temple` al pasar por una zona (o con foco en la barra de zonas, que también es el camino con teclado). Clic → **panel lateral** con los datos de Yunque y enlaces directos: inventario de la sucursal filtrado por rack, producto o faltantes; la orden de servicio; mostrador, presupuestos y entregas (D62). En celular el panel es una hoja inferior y la escena se corre hacia arriba. Esc cierra el panel; otro Esc vuelve a la red.
- **Transición** de cámara desde el mapa y vuelta (D61). El bucle del mapa descansa mientras se ve el taller.
- La pantalla de Forja en celular termina arriba de la barra de accesos de la app y no se puede desplazar por accidente (`overflow-clip`).
- Tests: 5 unitarios del plano (zonas sin solaparse, cada elemento en su zona, racks sin pisarse, bloques dentro de su rack, estado y altura según stock, retiro vs. banco, muelle) y 2 e2e (entrada con carga diferida de three.js, las cuatro zonas, tooltip, panel con enlaces, Esc y vuelta a la red; en celular, barra de zonas visible sobre la navegación). Capturas `forja-transicion`, `forja-taller`, `forja-taller-zona` y `forja-taller-rack`.
- Avisos conocidos en desarrollo (no de Forja): Next 16.4 informa "Could not validate that a segment in your UI has instant navigation" en `/app`, `/app/extensiones` y `/app/forja` (las páginas de la app se dibujan del lado del cliente desde la réplica local); three.js 0.186 avisa que `THREE.Clock` está deprecado (lo usa React Three Fiber 9.8).

### Forja · Fase 4 — Línea de tiempo del día y sala de control
- **Línea de tiempo** (barra inferior del nivel 1): repetir el día a 1×, 60×, 600× o 1200×, pausar, y moverse por la jornada con el cursor (también con el teclado: es un control deslizante). Muestra el pulso del día (ventas por franja; lo ya reproducido, en brasa) y la hora. Durante la repetición los eventos vuelven a animarse en orden (pulsos de venta, arcos que salen y llegan, bultos ubicados según la hora del cursor), los contadores y las tarjetas muestran ese momento, y el encabezado lleva el sello REPETICIÓN (D65, D66).
- **Sala de control** (botón en el encabezado, desde una pantalla mediana): pantalla completa, recorrido de 20 s por parada con una línea de avance, tarjeta con ventas, facturado, calor, stock crítico, presupuestos y equipos en servicio, y titulares del día. Con movimiento reducido, las paradas cambian sin vuelo (D67).
- El modelo de red ahora es correcto a cualquier hora (antes asumía "ahora" para transferencias, stock y órdenes).
- Tests: 7 unitarios nuevos (red a otra hora: ventas, transferencias y stock reconstruido; tramo y velocidades; eventos hasta el cursor; titulares; recorrido de la sala) y 2 e2e (repetición a 1200× que arranca de cero, suma y vuelve sola a en vivo, más el control con teclado; sala de control con recorrido, titulares y sellos). Capturas `forja-repeticion` y `forja-sala`.

### Forja · Fase 5 — Animación de activación y `/app/extensiones`
- **"El yunque se convierte en forja"** (4,5 s como máximo): el isotipo de Yunque extruido en acero cae y apoya con peso (temblor de cámara de 2 px y polvo fino que se levanta y se asienta); saltan chispas de la cara del yunque en tres golpes; alrededor suben las placas del hogar, la campana y la chimenea se dibujan con líneas de luz, se enciende el núcleo de brasa y late, y los bordes del yunque pasan de acero a naranja incandescente. Aparecen "yunque + forja" con el isotipo (la estrella, recién ahí) y "Lo firme y lo vivo, trabajando juntos." La cámara empuja hacia la brasa, el brillo llena la pantalla y se abre hacia el universo, donde las sucursales se encienden una por una (D69–D71).
- Se ve la primera vez de cada persona y cuando se pide desde Extensiones; se salta con un botón, Esc o Enter; sonido opcional apagado por defecto (D72). Versión quieta si se pide movimiento reducido o el 3D no está disponible (D73).
- En celular la cámara se aleja para que entren el yunque y el hogar, y la marca se achica.
- `/app/extensiones` ya listaba Forja con su estado, el precio ("Consultá" mientras sea `[COMPLETAR]`) y los botones Activar / Ver la activación / Desactivar; ahora además precarga la escena.
- Tests: 3 unitarios (duración y tramos del cronograma, cuándo mostrarla, polígono del isotipo) y 1 e2e (termina sola, enciende las sucursales, limpia la dirección, queda guardada y no se repite, se puede volver a ver desde Extensiones y se salta con Esc). Los demás e2e de Forja la saltan. Capturas `forja-activacion`, `forja-activacion-golpe` y `forja-activacion-quieta`.

### Forja · Fase 6 — Nivel 3: una pieza
- **Recorrido de un producto** (SKU): en el mapa, el stock de ese producto debajo de cada sucursal (con su estado) y los arcos de sus transferencias; en el panel, stock contra mínimo por sucursal, resumen de 28 días (vendidas, compradas, transferidas, ajustes), flujos entre sucursales y la línea de tiempo de movimientos con el saldo que dejó cada uno, y el enlace al inventario (D74, D75).
- **Historia de una máquina** por número de serie: todas sus reparaciones (falla, diagnóstico, estados con fecha y hora, presupuesto y enlace a la orden), dónde se reparó y las ventas que coinciden, rotuladas como tales (D76). La demo suma reingresos de la misma máquina (D77).
- **Entradas**: buscador ⌘K (grupo "En Forja": recorrido de los productos encontrados e historia de máquinas por serie, marca o modelo), el botón de recorrido en cada producto de un rack, "Historia de la máquina" en una orden del taller, y la dirección `?pieza=`. Esc o "Red" vuelven a la red.
- Arreglo de paso: el buscador ⌘K, que no abría (D78).
- Tests: 5 unitarios (el saldo cierra con el stock actual, flujos y otra sucursal en las transferencias, permisos por sucursal, historia con reingreso y búsqueda por serie, la pieza en la dirección) y 1 e2e (recorrido desde ⌘K con marcas en las tres sucursales, historia desde el taller y por número de serie desde ⌘K). Capturas `forja-pieza-producto` y `forja-pieza-maquina`.

### Forja · Fase 7 — Versión 2D completa
- **Cuándo**: movimiento reducido, menos de 4 núcleos, ahorro de datos o sin WebGL2; o a mano con el interruptor 2D/3D (D79).
- **Nivel 1**: mapa SVG con los mismos nodos, calor, anillo de stock crítico, tarjetas, transferencias con su detalle, constelación, línea de tiempo, sala de control y nivel 3.
- **Nivel 2**: plano de planta SVG por sucursal con las mismas zonas, datos e interacciones (contorno `--temple`, panel lateral con enlaces, tooltip del rack, barra de zonas).
- La activación usa su versión quieta, y en 2D no se descarga nada de 3D (D80).
- Tests: 2 e2e (con movimiento reducido: mapa, tarjeta, transferencia, constelación, plano del taller con tooltip y panel, y ningún script de MapLibre ni three.js; el interruptor 2D/3D queda recordado al recargar). Capturas `forja-2d-mapa`, `forja-2d-taller` y `forja-2d-rack`.

### Forja · Fase 8 — Demos públicas, videos, sitio e inversores
- **`/demo/ferremix/forja`** (PROPUESTA, sin sesión): co-branding con la identidad v2 (los archivos de `clientes/ferremix/` reemplazaron a los anteriores en `public/clientes/ferremix/`; sobre fondo oscuro, la versión negativa), "Ferremix Moreno" real (Av. Bartolomé Mitre 2322, Moreno) y tres ubicaciones DEMO, simulador en el navegador y la activación al entrar. Embebible solo desde los orígenes de su configuración (D83–D87).
- **`/forja`**: la misma demo con la empresa de demostración, para el botón "Ver la demo" del sitio.
- **Videos** (D88): `public/demo/forja.mp4` (genérico: sitio e `/inversores`) y `public/demo/forja-ferremix.mp4` (con el sello PROPUESTA). **Pendiente de Michel**: copiar `public/demo/forja-ferremix.mp4` a `public/propuesta/forja.mp4` del proyecto de Ferremix; es solo para esa presentación.
- **Sitio**: sección "Yunque + Forja" con el video genérico en bucle y sin sonido (con movimiento reducido no arranca solo), los tres puntos, "Ver la demo" y el precio como extensión ("Consultá" mientras sea `[COMPLETAR]`), y su ancla en el encabezado.
- **`/inversores`**: escena 06 "Forja: el negocio, en vivo" con la toma genérica, después de la demo del producto (las siguientes pasan a 07–13).
- Tests: 4 e2e de las demos públicas (genérica sin sesión y no embebible; la del prospecto con sus cabeceras, marca, PROPUESTA, Moreno sin DEMO y las demás con DEMO, el `[COMPLETAR]` visible; carga dentro de un iframe; 404 de un prospecto sin Forja; la sección del sitio) y 1 de la escena de inversores. La regla de honestidad sigue pasando.

### Forja · Fase 9 — Rendimiento, accesibilidad y documentación
- **Rendimiento** (D89, D90): taller dibujado a demanda, `dpr` adaptativo, `pixelRatio` acotado en el mapa, nada animado ni simulado con la pestaña oculta, carga separada de cada motor (verificada en e2e) y pérdida del contexto WebGL resuelta sin pantallas negras.
- **Accesibilidad** (D91): flechas entre nodos y zonas, foco visible `--temple`, descripciones de cada nodo y zona, línea de tiempo como control deslizante con la hora en texto, región en vivo para lo importante, Esc para volver y versión 2D con movimiento reducido.
- **Documentación**: [`docs/FORJA.md`](FORJA.md) (recorrido, código, datos y permisos, demos, videos, rendimiento, 2D, accesibilidad y qué falta), este reporte y el ROADMAP.
- Tests: 3 e2e (teclado de punta a punta, pérdida del contexto en el taller, anuncio de un quiebre de stock).
- **Arreglo de paso**: el primer anuncio a lectores de pantalla se descartaba si llegaba en los primeros 8 s de la página.

### Forja · Cierre
Las nueve fases del documento están hechas y commiteadas, con typecheck, lint, build, 160 tests unitarios y de RLS y 42 e2e en verde. Forja queda en estado **demo** en el registro de funcionalidades: completa con la empresa de demostración y con la propuesta para Ferremix, sin conectar todavía a una base real.
