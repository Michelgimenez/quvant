# Forja — la extensión visual de Yunque (el taller conectado)

## 0. Qué es Forja

**Yunque es la base firme:** inventario, ventas, precios y servicio técnico. **Forja es donde se ve el trabajo:** una extensión que convierte los datos de Yunque en un universo visual e interactivo. Muestra las sucursales de un negocio conectadas como un taller vivo, donde se ven las ventas, el stock, las transferencias y las reparaciones en tiempo real. Es la misma idea de la constelación que hicimos en Plaga, llevada al mundo industrial.

**Metáfora central: el calor del trabajo.**
- Una sucursal con actividad brilla como metal caliente; una sucursal quieta se enfría a gris acero.
- Las transferencias viajan como chispas entre sucursales.
- Cada venta es una chispa que salta en el mostrador.

### Cómo trabajar
- Proyecto Yunque existente: reutilizá su base multiempresa, RLS, roles, 2FA, datos demo y componentes.
- Trabajá solo y sin preguntar. Anotá cada decisión en `docs/REPORTE.md`.
- Hacé un commit por fase, con `typecheck`, `lint`, `build` y tests limpios.
- Capturas con Playwright en `docs/capturas/forja/`.
- Al terminar o cambiar una funcionalidad, actualizá `src/showcase/features.ts`, `docs/ROADMAP.md` y las escenas de `/inversores` que correspondan (regla del `CLAUDE.md`).
- Decime en un párrafo cómo lo vas a encarar y avanzá.

### Reglas que no se negocian
- **Honestidad:**
  - Ferremix aparece solo en `/demo/ferremix` con el sello PROPUESTA.
  - Las sucursales que no existen se marcan DEMO.
  - Sin métricas ni clientes inventados en el sitio del producto.
  - El precio de Forja como extensión va en `src/config/precios.ts` como `[COMPLETAR]`; mientras no tenga valor, se muestra "Consultá".
- **Nada de estética de juguete.** El 3D tiene que verse como un render de arquitectura o de producto premium:
  - Materiales monocromos (hormigón, acero, grafito), luz suave y sombras de contacto.
  - Bordes finos y precisos, y acentos de color solo para eventos vivos.
  - Prohibidos los colores primarios saturados en superficies, las formas redondeadas tipo caricatura y los personajes.
  - **Las chispas en 3D son estelas finas y luminosas** (líneas cortas con brillo y caída de intensidad), no estrellas dibujadas. La estrella de 4 puntas se usa solo en el isotipo de Yunque.
  - `--temple` (azul) solo como contorno fino de selección y foco, nunca como relleno.
  - Referencia de calidad: el cuarto de máquinas isométrico de congrue.ai.
- **Seguridad:** todo lo que Forja muestra respeta RLS y los permisos por rol y por sucursal.
  - **Vistas:** las vistas de Postgres ignoran RLS por defecto. Creá las vistas de Forja con `with (security_invoker = true)` o usá funciones que validen organización, sucursal y rol explícitamente.
  - **Tiempo real:** eventos por Broadcast desde triggers de la base hacia **canales privados por sucursal** (`org:{org_id}:suc:{branch_id}`), con políticas RLS sobre `realtime.messages`. Un usuario solo puede suscribirse a las sucursales que tiene permitidas. Nunca un canal por organización entera: filtraría eventos de otras sucursales a quien no debe verlos.
  - Extendé los tests de aislamiento a las vistas, las funciones y los canales de Forja: otra organización y otra sucursal sin permiso no ven nada.
- **Nombre del token de color:** Yunque ya tiene un token `--forja` (`#1A1F27`, superficies). Renombralo a `--superficie` en todo el proyecto para que no se confunda con la extensión, y verificá que no cambie nada visualmente.

---

## 1. Identidad de Forja (sub-marca provisoria de Yunque)
La identidad de Yunque se va a renovar después: construí todo con tokens para que se adapte sin rehacer componentes.
- **Nombre en pantalla:** "yunque **+ forja**", en minúsculas con el wordmark de Yunque. "forja" va en Inter Display ExtraBold en color sólido `--niebla`; la brasa aparece solo como un punto o una línea de acento al lado, no como gradiente en las letras.
- **Paleta de calor**, que se suma a la de Yunque:

| Token | Hex | Uso |
|---|---|---|
| `--frio` | `#3A4450` | Sucursal o zona sin actividad (metal frío) |
| `--temple` | `#3B6EF5` | (de Yunque) selección, foco, enlaces |
| `--ascua` | `#C2410C` | Calor bajo |
| `--brasa` | `#FF6A1F` | Calor medio, transferencias |
| `--chispa` | `#FFB224` | (de Yunque) calor alto, eventos, logros |
| `--blanco-caliente` | `#FFF4E0` | Pico de actividad (núcleo de la chispa) |

- **Escala de calor** continua: frío → ascua → brasa → chispa → blanco caliente. Se usa para mapear la actividad (ventas por hora relativas al promedio de la sucursal).
- Datos en JetBrains Mono, titulares en Inter Display y fondo `--hierro`.

---

## 2. Stack
- **Three.js** con React Three Fiber y drei.
- **MapLibre GL** con el estilo oscuro gratuito de Carto (`dark-matter`), atribución visible y teñido a la paleta.
- **deck.gl** con overlay para MapLibre: arcos, recorridos animados y nodos con brillo.
- **GSAP** (timeline, ScrollTrigger y MotionPath) para coreografías y transiciones de cámara.
- **Supabase Realtime** para los eventos y **zustand** para el estado de la escena.
- **Code splitting estricto:** Three, MapLibre y deck.gl se cargan solo en las rutas de Forja.

### Rendimiento
- 60 fps en una notebook común.
- **Hardware bajo** se define así: `navigator.hardwareConcurrency < 4`, `saveData` activo, `prefers-reduced-motion`, o un navegador sin WebGL2. En esos casos se usa la versión 2D.
- `dpr` adaptativo; instancing para racks, chispas y partículas; `frameloop="demand"` cuando no hay movimiento; pausa con la pestaña oculta.
- Manejar la pérdida de contexto WebGL.
- **`prefers-reduced-motion` o hardware bajo:** versión 2D completa (mapa SVG con nodos y plano de planta 2D por sucursal), con los mismos datos e interacciones.

---

## 3. Activación: el yunque se convierte en forja
Se ve la primera vez que una organización activa Forja (en `/app/extensiones`) y se puede repetir desde ahí. Dura 4,5 s como máximo, se puede saltar y se guarda en las preferencias del usuario en el servidor.

1. **El yunque cae.**
   - Pantalla `--hierro`. El isotipo de Yunque, extruido en 3D con acero cepillado, baja y **apoya con peso**: un temblor de cámara de 2 px y polvo fino que se levanta y se asienta.
2. **Chispas.** De la cara del yunque saltan chispas como estelas finas y luminosas, con trayectorias físicas simples (instanced). La única estrella de 4 puntas es la del isotipo, que aparece al final junto al nombre.
3. **Se arma la forja alrededor.** Mientras caen las chispas, las piezas aparecen como si se construyeran en conjunto:
   - Placas de la base del hogar suben desde abajo.
   - La campana y la chimenea se dibujan con líneas de luz (trazo progresivo).
   - En el hogar se enciende un núcleo de brasa con gradiente emisivo que late.
   - Los bordes del yunque toman temperatura y pasan de acero a naranja incandescente.
4. **Texto:** "yunque **+ forja**" y debajo "Lo firme y lo vivo, trabajando juntos."
5. **Entrada al universo.** La cámara empuja hacia el núcleo de la brasa. El brillo llena la pantalla y se abre en un iris radial hacia el **universo del taller**, donde las sucursales se encienden una por una.

Sonido opcional (golpe y chisporroteo), apagado por defecto y con un botón de silencio.

---

## 4. El universo del taller (`/app/forja`)
Tres niveles. El mapa (MapLibre con deck.gl) y el taller (React Three Fiber) son motores distintos, así que el paso entre niveles se hace así:
1. `flyTo` del mapa hacia el nodo, acercando y con inclinación.
2. Un iris o fundido con el brillo del nodo.
3. La cámara del taller entra en movimiento descendente, para que se sienta continuo.

Al volver, el camino es el inverso.

### Nivel 1 — Red: todas las sucursales
- **Vista Mapa:** MapLibre oscuro con cada sucursal en su ubicación real.
  - Cada **nodo-forja** tiene un núcleo con brillo cuyo color sigue la escala de calor, un anillo que muestra el stock crítico (porción ámbar) y un pulso por cada venta en vivo.
  - Las **transferencias en tránsito** son arcos animados con chispas que viajan a la velocidad estimada. Al hacer clic se ve el detalle: productos, cantidades y estado.
  - **Al pasar el cursor por un nodo:** tarjeta con ventas de hoy, presupuestos abiertos, stock crítico y órdenes de servicio por estado.
- **Vista Constelación:** para negocios con sucursales cercanas.
  - Disposición radial o por fuerzas, con nodos dimensionados por facturación y enlaces más gruesos según el volumen de transferencias.
  - Mismos datos e interacciones. Un interruptor alterna entre Mapa y Constelación con una animación de reacomodo.
- **Línea de tiempo del día:**
  - Barra inferior para reproducir el día: los eventos se re-animan en orden, a 1×, 60×, 600× o 1200×.
  - A 1200×, una jornada de 10 horas pasa en 30 segundos: ideal para mostrarle al dueño cómo fue el día.
- **Modo sala de control:** pantalla completa para una TV en la oficina. Recorre las sucursales cada 20 s con transiciones suaves y muestra los eventos importantes como titulares.

### Nivel 2 — Taller: una sucursal por dentro
Al hacer clic en un nodo, la cámara baja y la escena cambia a un **corte isométrico 3D de la sucursal**: cámara ortográfica, losa, dos paredes cortadas y una luz cenital suave.

**Zonas, todas generadas desde los datos de Yunque:**
- **Mostrador:**
  - Un puesto por caja, con su pantalla.
  - Cada venta hace saltar una chispa.
  - Si el mostrador está trabajando offline, se ve una luz ámbar con la cola de sincronización (el gran diferencial de Yunque, visible).
- **Depósito:**
  - Racks instanciados por ubicación.
  - La altura del bloque en cada estante representa el stock relativo y el color sigue el estado: frío si está normal, ámbar si es crítico y un hueco marcado si no hay stock.
  - Al pasar el cursor por un rack: productos y cantidades.
- **Servicio técnico:**
  - Bancos de trabajo con las máquinas en reparación, como bloques genéricos sobrios con su número de orden.
  - Color por estado y tiempo en el banco.
- **Carga y entregas:**
  - Muelle con las entregas del día como bultos.
  - Cuando una transferencia sale hacia otra sucursal, el bulto se desliza fuera de la escena y aparece como arco en el nivel 1.

**Interacciones:**
- Al pasar el cursor, la zona se resalta con un contorno `--temple`.
- Al hacer clic, se abre un panel lateral con los datos de Yunque y enlaces directos al módulo (inventario filtrado, orden de servicio, presupuesto).

### Nivel 3 — Pieza: un producto o una máquina
- Desde el buscador (⌘K) o un rack: el recorrido de un SKU por las sucursales (arcos en el mapa y línea de tiempo de movimientos).
- Para máquinas con número de serie: su historia completa de compra, venta y reparaciones.

### Datos y tiempo real
- **Vista o funciones en Supabase** que agregan por sucursal: ventas por hora, calor relativo, stock crítico, transferencias en tránsito y órdenes por estado. Todo con RLS.
- **Eventos en vivo** desde las tablas de ventas, movimientos, transferencias y servicio técnico, por Broadcast a los canales privados por sucursal (ver Reglas · Seguridad).
- **Simulador de eventos para organizaciones demo:** genera ventas, transferencias y cambios de estado verosímiles cada pocos segundos. Se activa solo en organizaciones marcadas como demo y con la etiqueta "SIMULACIÓN" visible.

---

## 5. Dónde aparece Forja

### 5.1 En la app
- `/app/extensiones` lista las extensiones (Forja la primera) con su estado y el botón para activarla, que dispara la animación.
- `/app/forja` está disponible para los roles Dueño y Administración, que ven todas las sucursales. Otros roles, si se les da permiso, ven solo la sucursal que tienen asignada.

### 5.2 Demo pública: `/demo/ferremix/forja`
- Sin login, con el sello PROPUESTA y el co-branding de Ferremix con su **identidad v2**: archivos en `clientes/ferremix/` → `/public/clientes/ferremix/`. Reemplazá los anteriores. Sobre fondo oscuro van las versiones `-negativo`.
- **Sin acceso a la base:** la demo pública no lee Supabase. Funciona sobre un snapshot de datos generado desde el seed (`src/demo/ferremix-snapshot.json`) y el simulador de eventos corre en el navegador. Así no hace falta ninguna lectura anónima ni se debilita RLS.
- **Datos:**
  - "Ferremix Moreno" es real: Av. Bartolomé Mitre 2322, Moreno, Buenos Aires. Geocodificá la dirección una vez y guardá las coordenadas en el seed.
  - Más dos sucursales y un depósito **marcados DEMO**, en ubicaciones verosímiles del oeste del conurbano: `[COMPLETAR con los negocios y sucursales reales del dueño]`.
- La animación de activación se reproduce al entrar.
- **Preparada para embeber en un iframe** desde la propuesta de Ferremix:
  - Solo en esa ruta: `Content-Security-Policy: frame-ancestors 'self' https://ferremix-propuesta.vercel.app http://localhost:*`, sin `X-Frame-Options` y sin que una cabecera global la pise.
  - Sin barras de scroll y con escala a 1920×1080.

### 5.3 Videos
Script de Playwright `scripts/grabar-forja.mjs`:
- Chromium con aceleración de GPU (no headless de software, que hace el WebGL entrecortado).
- Captura a 1920×1080 y 60 fps, convertida a MP4 H.264 con `ffmpeg-static`.
- **Dos tomas** de 40 a 50 s cada una, con la misma secuencia:
  1. La activación.
  2. La red con transferencias.
  3. La entrada a una sucursal.
  4. Una venta en el mostrador.
  5. Un rack que pasa a crítico.
  6. La reproducción del día a 1200×.
- **Toma Ferremix:** `public/demo/forja-ferremix.mp4`, con el sello PROPUESTA. Es solo para la presentación de Ferremix: Michel la copia a `public/propuesta/forja.mp4` del proyecto Ferremix. Dejalo indicado en el reporte.
- **Toma genérica:** `public/demo/forja.mp4`, con la empresa demo "Ferretería Industrial Demo" y sin nada de Ferremix. Es la que se usa en el sitio del producto y en `/inversores`.

### 5.4 Sitio del producto (`/`)
- Sección nueva **"Yunque + Forja"**: el video genérico (`forja.mp4`, sin Ferremix) en bucle silencioso y tres puntos (ver toda la red, entrar a cada sucursal, reproducir el día) con el botón "Ver la demo".
- Precio como extensión desde la configuración ("Consultá" mientras sea `[COMPLETAR]`).

### 5.5 Presentación para inversores (`/inversores`)
Escena nueva después de la demo del producto: "Forja: el negocio, en vivo", con la toma genérica (`forja.mp4`, sin Ferremix). Es el diferencial visual frente a los sistemas antiguos.

---

## 6. Orden de trabajo
1. **Base:** renombrar `--forja` a `--superficie`, tokens de calor, rutas y carga diferida, modelo de datos y vistas con RLS, simulador demo y tests de aislamiento.
2. **Nivel 1 Mapa:** nodos, arcos, tarjetas y el interruptor Mapa/Constelación.
3. **Nivel 2 Taller isométrico:** zonas, interacciones y panel lateral, con la transición de cámara desde el mapa.
4. **Línea de tiempo del día y modo sala de control.**
5. **Animación de activación y `/app/extensiones`.**
6. **Nivel 3 Pieza.**
7. **Versión 2D completa** para `prefers-reduced-motion` y hardware bajo.
8. **`/demo/ferremix/forja`** embebible, script de video, sección en el sitio y escena en `/inversores`.
9. **Rendimiento, accesibilidad y reporte:**
   - Accesibilidad: navegación por teclado entre nodos y zonas, y textos alternativos de los estados.
   - Reporte: en `docs/REPORTE.md` y una página nueva `docs/FORJA.md` con la arquitectura de la extensión, el modelo de eventos y cómo se agregaría otra extensión en el futuro.
