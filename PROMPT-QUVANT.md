# Yunque pasa a ser Quvant
## La identidad del manual, del kiosco a la empresa grande, y una demo que cambia de empresa en vivo (boceto por tandas)

## 0. Cómo trabajar
- **Qué se hace:** el sistema que hoy se llama Yunque pasa a llamarse **Quvant**.
  - **El nombre Yunque desaparece** de todo lo visible.
  - **La identidad es la del manual de Quvant** (`referencias/Quvant-manual-de-identidad.pdf`), aplicada a todo el sistema.
  - **El alcance se abre:** deja de ser solo para ferreterías industriales y sirve para un kiosco de barrio y para una empresa con decenas de sucursales.
  - **La demo nueva** pasa de una empresa a otra en vivo, para mostrar cómo el mismo sistema se adapta a cada negocio.
- **Dónde:** en el repo actual de Yunque, que ya tiene la base multiempresa con RLS, la app, el sitio, `/inversores`, `/demo/[cliente]` y la extensión Forja.
  - **Leé el repo antes de empezar:** `CLAUDE.md`, `docs/REPORTE.md`, `docs/ARQUITECTURA.md`, `docs/ROADMAP.md`, `src/showcase/features.ts` y la estructura de `src/`.
  - Este prompt describe lo que hay según los prompts anteriores. Si algo no existe o se llama distinto, manda el repo: anotalo y seguí.
  - **El manual:** en la tanda 1, leé sus páginas 1 a 11 (las 12 a 16 son la tarjeta impresa). Después, volvé a él solo si dudás. Leé también `marca/LEEME.md`.
  - **Trabajá en una rama nueva, `quvant`.**
- **Modo boceto:** es la interfaz completa, bella y trabajada a fondo en lo visual, para mirar y decidir. Lo que no se ve (celular, respaldos, accesibilidad fina, rendimiento, auditorías) se anota en `docs/PENDIENTE-CIERRE.md` y se hace después con `PROMPT-QUVANT-CIERRE.md`.
  - Solo escritorio (1440×900, Chromium). Sin celular, sin `prefers-reduced-motion` y sin niveles de calidad en esta etapa.
  - **Verificación:** `next dev` y `typecheck` en cada tanda. Al cerrar las tandas 4 y 8, además, `build` (la 8 lo necesita para filmar). En la última tanda, `build` y `lint` limpios.
  - **Capturas:** solo de pantallas terminadas y de cada vuelta de ajuste visual, sin volver a mirar las que no cambiaron. Como mucho unas 15 por tanda.
  - Nada de video cuadro por cuadro mientras se trabaja: los videos los hace un script (punto 8).
- **Por tandas** (son 10; punto 10): hacé solo lo que pide la tanda, dejá un resumen corto y frená. Cada tanda va en una sesión nueva, que arranca leyendo este prompt, `docs/REPORTE.md` y los últimos commits.
- **Lo estético va profundo y es la prioridad:** hasta 3 vueltas por pantalla clave contra los criterios del punto 9, anotando qué cambió en cada vuelta en `docs/BITACORA-ESTETICA.md`. No se itera por rendimiento.
- **Git:** un commit por fase. Si algo se rompe, volvé al último commit sano.
- **En Windows:** los trabajos largos (filmaciones, generación de datos) corren en segundo plano, con su registro en `logs/`. Para cerrar un proceso con sus hijos: `taskkill /PID <pid> /T /F`.
- **Las instalaciones:** en tus primeras líneas, listá lo que hay que sumar (por ejemplo `ffmpeg-static` y `ffprobe-static` para los videos) y pedí un solo OK.
- **Decisiones y pendientes:** en `docs/REPORTE.md`, con un resumen de una página arriba y una sección "Para Michel" con lo que tiene que elegir o completar.
- **Bitácora para aprender:** al final de cada tanda, 5 a 10 líneas en `docs/BITACORA.md` sobre una idea de esa tanda, con un ejemplo del código. Por ejemplo: cómo un mismo sistema cambia según la empresa con *feature flags*, cómo funciona una transición de layout con Flip, o por qué una demo pública no tiene que tocar la base de datos.
- **Límites:**
  - Sin deploy, sin `git push` y sin secretos en el código.
  - La base de Supabase, **sin cambios destructivos.** Si hace falta un cambio de esquema, va como migración nueva y reversible.
  - Las demos públicas no leen ni escriben la base (punto 5).
  - Nunca dos sesiones sobre este repo a la vez.
- Decime en pocas líneas cómo lo vas a encarar (más la lista de instalaciones) y avanzá cuando Michel dé el OK.

## 1. Qué es Quvant
- **Quvant es el sistema de gestión que se adapta a cada negocio:** ventas, caja, stock, precios, compras, clientes y cuentas corrientes, sucursales, equipo y reportes, en un solo lugar.
  - Para un **kiosco**, una caja rápida que nunca se cae.
  - Para un **comercio**, su stock, sus precios y su mostrador.
  - Para una **distribuidora**, sus pedidos, sus listas de precios y su reparto.
  - Para una **empresa grande**, el control de decenas de sucursales, permisos y aprobaciones.
  - **Es el mismo producto:** a cada negocio se le encienden los módulos que necesita.
- **La bajada de la marca** (del manual): *"Software a la vanguardia de cada nicho."*
  - Va debajo de la firma en portadas, al cierre de los videos y en el pie de las presentaciones. En el pie del sitio también (extensión del prompt).
  - Se escribe así: mayúscula solo al inicio y punto final. Nunca abreviada ni traducida. El punto cuadrado que la acompaña se usa solo en piezas gráficas, no en el texto corrido.
- **El titular del sitio:** proponé 3 en la tanda 1 (por ejemplo, "Del kiosco a la empresa."), con la voz del manual. Michel elige y el elegido se guarda en `src/config/sitio.ts`.
- **El nombre:** une *quantum* (el salto cuántico) y *vanguard* (la vanguardia). Se pronuncia «kúvant». Se escribe **Quvant** en el texto y **QUVANT** solo dentro del logotipo.
- **Lo que se queda de Yunque:**
  - la base multiempresa con RLS;
  - el mostrador que sigue vendiendo sin internet (el gran diferencial);
  - los precios que se actualizan en minutos;
  - los módulos que ya existen;
  - la extensión Forja y la documentación técnica.
- **Lo que cambia:** el nombre, la identidad, la voz, el alcance (todos los rubros y tamaños) y la demo.
- **Estado real, y así se comunica:** producto en etapa de demo funcional y piloto. Todavía no hay clientes pagando.

### Regla de honestidad (en todo el proyecto)
- **Nada de métricas, clientes, testimonios ni logos de clientes inventados presentados como reales.** Donde no hay dato, `[COMPLETAR]` en la configuración, y en pantalla se oculta o se dice el estado tal cual.
- **Las empresas de la demo son ficticias** y llevan el sello `DEMO` visible (punto 4). Sus nombres no pueden coincidir ni parecerse a marcas conocidas: buscalos antes de usarlos y dejalos en la configuración para que Michel los cambie.
- **Ferremix** aparece solo en `/demo/ferremix`, siempre como "propuesta" o "así se vería Quvant en Ferremix", nunca como cliente activo.
- **Cada función tiene su estado real en `src/showcase/features.ts`,** con el sello visible donde se muestra:
  - **`disponible`:** funciona en la app real, con la base.
  - **`demo`:** se puede usar en la demo, pero todavía no en la app real.
  - **`próximamente`:** todavía no existe.
  - Es esperable que muchas funciones de la distribuidora y del grupo digan `demo` o `próximamente`. El manual ya lo pide: "Prometemos lo que existe. Lo que viene, lo decimos así."
- **Precios:** por plan, desde `src/config/precios.ts`. Lo que siga en `[COMPLETAR]` se muestra como "Consultá". El "desde USD 290 por mes" de Yunque era para ferreterías y no sirve para un kiosco: los valores los define Michel.
- **Socios fundadores:** sin cupos, contadores ni cuentas regresivas inventadas.

## 2. La identidad (manual de Quvant)
El manual manda. Si algo de este prompt lo contradice, gana el manual: anotalo en el reporte. Lo que este prompt agrega y el manual no dice (los colores de estado, el modo claro, los pesos intermedios, el salto como recompensa) va marcado como **extensión del prompt** en `docs/TIPOGRAFIA.md` y en la lámina, para que Michel lo vea.

### 2.1 El logo
- **El logo ya existe:** el aro (la Q), la cola que apunta abajo a la derecha y el punto cuadrado que se separa y se adelanta. Los archivos los deja Michel en `marca/`. **No se rediseña ni se redibuja.**
- **Las versiones del manual:**
  - **Principal:** la Q cromada y QUVANT en blanco, sobre negro. Es la versión por defecto.
  - **Negativa:** todo en negro, sobre fondos claros (documentos, facturas y el modo claro).
  - **Especial plata:** solo para impresos. En pantalla se reemplaza por la principal.
- **Copiá los archivos a `public/marca/`.** Si falta alguna versión que la web necesita (favicon, ícono de la app, imagen para redes, la Q en una tinta blanca o negra), generala desde el archivo original, sin tocar sus formas.
  - Verificá cada una renderizándola sobre negro y sobre claro, y en su tamaño mínimo.
  - Si solo hay PNG y algún uso necesita vector, avisalo en "Para Michel".
  - **El logotipo QUVANT de los archivos** puede no estar compuesto con Michroma (el manual avisa que su PDF usa una letra parecida). No lo recompongas: usá el archivo tal cual y avisá.
- **Reglas del manual:**
  - **Área de resguardo:** alrededor de la firma queda libre, como mínimo, el doble del lado del punto. Nada de texto ni bordes dentro de ese margen.
  - **Tamaños mínimos:** el isotipo, 16 px en pantalla; la firma horizontal, 96 px.
  - **Nunca:** rotar el isotipo (la cola siempre apunta abajo a la derecha), estirarlo o deformarlo (el aro es siempre un círculo), pegar el punto a la cola o moverlo, ni usarlo con poco contraste o con colores fuera de la paleta.
  - **Tampoco:** sombras, contornos, efectos 3D ni el logotipo escrito con otra tipografía. Las únicas excepciones a los efectos son el cromado oficial de la Q y el plateado real del hot stamping en impresos.
- **Cómo se anima:** el aro se traza, la cola aparece y el punto **salta** a su lugar. Nunca rotación, estiramiento ni 3D.
  - **Si hay SVG con el aro, la cola y el punto separados,** un script los separa en `public/marca/logo-capas.json` y el componente los importa. Nunca abras ni reescribas a mano los paths.
  - **Si solo hay PNG, o el aro y la cola son un solo trazado,** no vectorices: animá con máscaras sobre el archivo original (una máscara cónica que revela el aro, recortes para la cola y el punto) y avisalo.
  - Los usos estáticos van con `<img>`.
- **El "antes":** `referencias/antes-yunque-brand-board.png` es la identidad vieja, para la presentación y como contraste.

### 2.2 El color
**Negro y blanco hacen el 90 % de la marca.**

| Token | Hex | Uso |
|---|---|---|
| `--negro` | `#0D0D0F` | Negro Quvant: fondo principal |
| `--blanco` | `#ECECEE` | Blanco Quvant: logo, títulos y textos sobre negro. Fondo del modo claro (extensión del prompt) |
| `--acero` | `#9C9CA3` | Gris acero: textos secundarios y bajadas, sobre negro |
| `--profundo` | `#26262B` | Gris profundo: fondos de apoyo, superficies y la grilla de puntos |
| `--plata` | `#B9BBBF` | Plata: solo impresos. En pantalla no se usa |

- **Los grises intermedios** (superficies, bordes, estados de hover) se arman entre `--negro`, `--profundo`, `--acero` y `--blanco`, sin otros tonos, y se documentan como escala de la marca.
- **Ojo con el modo claro:** `--acero` sobre `--blanco` no llega al contraste AA para texto (da cerca de 2,3:1). En claro, el texto secundario va con un gris más oscuro de la misma escala. Sobre negro, `--acero` sí funciona (7:1).
- **Los colores de estado** (ok, alerta, error, información) son una extensión del prompt:
  - solo para estados del sistema;
  - chicos: puntos, chips y bordes;
  - nunca como color de marca;
  - en tonos sobrios que convivan con el negro y el blanco, con contraste AA.
- **El color de cada empresa** (punto 4) aparece solo en su logo, en el indicador de navegación activo y en el color principal de sus gráficos. El resto de la interfaz es de Quvant, en negro y blanco: así se ve que el sistema es uno y la empresa es otra.
- **Modo oscuro y modo claro, los dos completos.** El oscuro es el principal, como la marca. El claro (la versión negativa) es para el mostrador con luz de día y para los documentos.
- **Tokens en CSS, mapeados en Tailwind.** Reemplazan a los de Yunque (`--hierro`, `--temple`, `--chispa`, el `--acero` viejo, `--niebla` y `--superficie`). Hacé el cambio en un solo lugar y revisá que no queden colores sueltos en los componentes.

### 2.3 La tipografía
**Dos familias, las dos gratuitas.** No se suma ninguna otra.
- **Michroma:** solo para títulos muy cortos (una o dos palabras), siempre en mayúsculas y con espaciado amplio (+0,16 a +0,20 em). El logotipo no se compone con ella: es el archivo del logo.
- **IBM Plex Mono:** para todo lo demás. Títulos (Bold), textos (Regular, unos 15 px), datos, tablas, números y etiquetas (mayúsculas con +0,2 em).
  - Es monoespaciada, así que los números de las tablas ya quedan alineados.
  - Los pesos 500 y 600 para la jerarquía son una extensión del prompt.
- **Con `next/font/google`, autohospedadas:**
  - Michroma tiene un solo peso: `weight: '400'`.
  - IBM Plex Mono no es variable: `weight: ['400', '500', '600', '700']` y `style: ['normal', 'italic']`.
  - `font-synthesis: none` global, para que el navegador no invente una Michroma en negrita ni itálicas falsas.
- **Tokens por rol** (`--marca-display` para Michroma, `--marca-texto` para Plex Mono) y **clases cerradas** (`.t-marca`, `.t-hero`, `.t-titulo`, `.t-texto`, `.t-etiqueta`, `.t-dato` y `.t-numero`), con tamaño, interlineado e interletrado resueltos. Nada de tamaños sueltos en los componentes.
- **`docs/TIPOGRAFIA.md`:** las dos familias, los tokens y la tabla de estilos.
- Inter, Inter Display y JetBrains Mono eran de Yunque: se van.
- **Si en la tanda 1 ves** que algún uso con mucho texto corrido se lee peor en mono, anotalo en "Para Michel" con una captura. No sumes otra familia por tu cuenta.

### 2.4 El recurso gráfico: la grilla y el salto
- **La grilla:** puntos ordenados, siempre en `--profundo` sobre negro, de fondo en portadas, el sitio, las presentaciones y los estados vacíos de la app. En el modo claro no hay grilla.
- **El salto:** uno de los puntos se separa, salta hacia adelante con un arco punteado y cae como el punto cuadrado del logo. Es el punto del logo llevado a todo el sistema.
  - **En transiciones:** en los videos y en la demo, el punto que salta marca el cambio de escena y el cambio de empresa (5.3).
  - **Como recompensa** (extensión del prompt): reemplaza a la chispa de Yunque. Un salto breve del punto cuando algo cierra justo:
    - una caja sin diferencias;
    - un conteo de stock que coincide;
    - la cola sin conexión que se sincroniza;
    - un presupuesto que pasa a venta;
    - una aprobación completa.
    
    Nunca como decoración permanente.
- **Las viñetas:** el punto cuadrado reemplaza a la viñeta redonda en listas y destacados.

### 2.5 El tono (del manual)
- **Claro antes que técnico:** primero qué resuelve; la tecnología, después.
- **Concreto:** prometemos lo que existe; lo que viene, lo decimos así.
- **Cercano:** voseo, frases cortas, palabras de todos los días. Como habla el dueño del negocio: "¿cuánto vendí hoy?", "cerrar la caja", "me deben", "fiado".
- **Seguro:** sabemos lo que hacemos, sin soberbia.
- **Así sí:** «Tu stock al día en todas las sucursales.» **Así no:** «Solución omnicanal de gestión de inventario en tiempo real.»

### 2.6 La lámina del sistema aplicado (tanda 1)
`docs/marca/quvant-sistema.png` (2400×1500). Es la verificación de que el manual quedó bien aplicado a la web y a la app, no una identidad nueva. Lleva:
- la firma en sus versiones;
- los tokens con sus usos y los colores de estado;
- los estilos tipográficos;
- la grilla y el salto en 3 cuadros;
- una tarjeta de la app con un total y un botón, en oscuro y en claro;
- las extensiones del prompt, marcadas;
- al lado, chico, el "antes" de Yunque.

## 3. El renombre (tanda 2)
- **Todo texto visible pasa de "Yunque" a "Quvant":**
  - sitio, app, mails, mensajes prearmados y metadatos;
  - Open Graph y datos estructurados (`SoftwareApplication`, `Organization`);
  - el manifiesto de la PWA, íconos, favicons y títulos de pestaña;
  - presentaciones y demos.
- **El código:**
  - `<ConYunque />` pasa a `<ConQuvant />`: el sello "Funciona con Quvant", en claro y oscuro, para las webs de los clientes.
  - Constantes, nombres de componentes y textos, sin romper importaciones.
  - Variables de entorno con "YUNQUE": renombralas y leé las viejas como respaldo por un tiempo, documentado en `.env.example`.
  - **Los objetos de la base** (tablas, columnas, funciones), solo si su nombre se ve en pantalla. Si no, quedan como están y se anota como deuda menor.
- **El material viejo de Forja que muestra el yunque se oculta ahora y se rehace en la tanda 10:**
  - los videos `public/demo/forja.mp4` y `forja-ferremix.mp4`;
  - la sección "Yunque + Forja" del sitio;
  - la escena de Forja en `/inversores`;
  - la frase "Lo firme y lo vivo, trabajando juntos".
  
  La búsqueda de texto no ve lo que hay adentro de los videos: revisalos a mano.
- **Forja conserva su nombre** (está en el manual). Lo que cambia es su metáfora (punto 7).
- **Las rutas quedan iguales.** Si alguna incluía "yunque", la vieja redirige con 308.
- **La documentación:** `README`, `CLAUDE.md` y `docs/*` (ARQUITECTURA, SEGURIDAD, PITCH, ROADMAP), con el nombre y el alcance nuevos.
- **Al final:** buscá en todo el repo (código, `docs`, `public`, seeds y textos de la base de demo) que no quede "Yunque" ni "yunque" visible, salvo en el "antes" y en el historial.

## 4. Las cuatro empresas de la demo
El mismo Quvant en cuatro negocios de escalas distintas. Todos son ficticios y llevan el sello `DEMO`. Los nombres son propuestas: verificá que no sean ni se parezcan a marcas conocidas, y dejalos editables en `src/demo/empresas.ts`.

| Empresa (propuesta) | Rubro y escala | Lo que se ve |
|---|---|---|
| **Kiosco La Esquina** | Kiosco y almacén de barrio: 1 caja, 1 persona, unos 350 productos | Venta rápida con lector y botones de favoritos, cierre de caja con arqueo, fiado de los vecinos, pedido sugerido a los proveedores y aumento masivo de precios |
| **Ferretería Industrial Demo** | La empresa demo que ya existe: 2 negocios, 3 sucursales, unos 300 productos | Stock por sucursal, presupuestos que pasan a venta, servicio técnico, transferencias y mostrador sin conexión |
| **Distribuidora Ruta Clara** | Mayorista: 1 depósito, 12 preventistas, 400 clientes, unos 1.800 productos | Preventa en la calle, listas de precios por cliente, hoja de ruta del reparto, cobranzas y cuentas corrientes |
| **Grupo Cordal** | Empresa con 40 sucursales en 6 provincias, unos 300 usuarios y unos 25.000 productos | Consolidado de todas las sucursales, comparación entre ellas, aprobaciones de compras por niveles, permisos por rol y por sucursal, auditoría e integraciones |

- **Cada empresa tiene:**
  - **Un logo ficticio simple:** una palabra en una tipografía libre, con su color. Nada que imite marcas reales. Es la marca de esa empresa, no la de Quvant.
  - **Su color, su terminología y sus módulos.** La terminología: "Caja" y "Fiado" en el kiosco; "Preventa" y "Reparto" en la distribuidora; "Sucursales" y "Aprobaciones" en el grupo.
  - **Una densidad propia:** el kiosco, grande, simple y con pocas cosas muy claras; la empresa, densa y precisa, con tablas, comparaciones y un mapa de sucursales.
- **De dónde salen los datos:**
  - **Las cuatro empresas no se crean en la base.** Viven en `src/demo/`.
  - Sus *feature flags* copian la forma de los que ya existen en la base, así los mismos componentes los entienden.
  - **La ferretería se exporta del seed a un snapshot** (`src/demo/ferreteria-snapshot.json`, como el `ferremix-snapshot.json` de Forja).
- **Las otras tres se generan con una semilla fija,** así son siempre iguales. Todas las fechas se calculan desde una fecha ancla fija, en la configuración.
  - Por empresa: 90 días de ventas con estacionalidad verosímil (más ventas los viernes en el kiosco, picos de fin de mes en la distribuidora), stock con algunos productos críticos, clientes y cuentas corrientes, y los eventos del día.
  - **El grupo:**
    - El catálogo completo de 25.000 productos se genera cuando se elige el grupo (es barato), así funcionan la búsqueda y el orden.
    - Lo que se genera a pedido es el stock por sucursal y las líneas de venta, con `hash(semilla, producto, sucursal)`, para no tener millones de filas en memoria.
    - Las tablas son virtualizadas.
  - **Ubicaciones:** el centro de ciudades argentinas reales, nunca direcciones de comercios reales.
  - **Productos:** con nombres genéricos (sin marcas registradas) y sin fotos, con una placa neutra con el nombre.
- **Simulador del día:** en la demo, cada empresa recibe eventos verosímiles a su ritmo (una venta del kiosco cada pocos segundos; en el grupo, muchas sucursales a la vez), con la etiqueta "SIMULACIÓN" visible. Los eventos salen de una función del tiempo y de la semilla.

## 5. La demo que cambia de empresa (`/demo`)
Es lo más importante de este trabajo: la prueba de que Quvant sirve para un kiosco y para una empresa grande.

### 5.1 Acceso y datos
- **Pública, sin login,** con `noindex`.
- **No toca Supabase.** La app accede a los datos a través de una interfaz con dos implementaciones, elegida por contexto:
  - **la de Supabase** para la app real;
  - **la de demo,** que lee `src/demo/` y el simulador.
  
  Así la demo usa **los mismos componentes de la app real** y no hace falta ninguna lectura anónima de la base.
- **El estado** se guarda en el navegador con zustand y `persist`:
  - con `skipHydration`, `version` y `rehydrate()` al montar;
  - con `partialize`: solo se guarda lo que hace el visitante (ventas, fiados, caja), nunca los datos generados;
  - **la dirección manda sobre lo guardado.**
  
  Hay un botón "Reiniciar demo".
- **Las acciones que saldrían afuera** (mandar un WhatsApp, emitir una factura) están emuladas, con un aviso.

### 5.2 La barra de la demo
- **Arriba, fina y siempre presente:**
  - la firma de Quvant;
  - "Estás viendo: [empresa] · DEMO";
  - el selector de empresas;
  - "Recorrido guiado" y "Reiniciar".
- **El selector:** cuatro tarjetas sobre la grilla de puntos, de la más chica a la más grande. Cada una lleva su logo, su rubro y su escala ("1 caja", "3 sucursales", "12 preventistas", "40 sucursales").
  - **Atajos:** las teclas 1 a 4 funcionan solo si el foco no está en un campo ni en el mostrador (que usa el teclado como lector). También ⌘E o Ctrl+E.
  - **La dirección:** la empresa elegida queda en ella (`/demo?empresa=kiosco`), actualizada con `history.replaceState`, sin navegar. Así se puede mandar un link directo.

### 5.3 El cambio de empresa (el momento estrella, tanda 4)
Una coreografía de 1,2 a 1,6 s, con GSAP (Flip y una línea de tiempo):
1. **El salto:** el punto cuadrado sale de la tarjeta de la empresa actual, traza un arco punteado y cae en la tarjeta de la nueva, como en la página 11 del manual. Todo lo que sigue nace donde cae. Si el selector está cerrado, el cambio lo abre y el salto ocurre ahí.
2. **Los logos:** el de la empresa actual vuelve a su tarjeta, y el de la nueva sale de la suya y se instala en su lugar.
3. **El barrido:** un barrido circular (`clip-path`) que nace en el punto revela el estado nuevo. No pinta la pantalla con el color de la empresa: el color aparece solo donde lo indica 2.2.
4. **La barra lateral se reorganiza** con la terminología nueva: los módulos que sobran se van, los nuevos entran y los que quedan se reacomodan (Flip).
5. **Los números** del tablero ruedan de los valores viejos a los nuevos.
6. **Las tarjetas del tablero** cambian de densidad y de lugar (Flip): del tablero simple y grande del kiosco al denso del grupo, o al revés.

**Con React:**
- `Flip.getState()` antes de cambiar el estado, y `Flip.from()` en `useLayoutEffect` (o `useGSAP`).
- Los elementos que salen quedan montados hasta que termina su animación.
- `data-flip-id` estables en todo lo que se mueve.

**Sin cortes ni parpadeos:** es la misma app que se transforma. Revisala en cuadros clave (capturas) en cada vuelta.

### 5.4 Lo que se puede hacer en cada empresa
Recorridos cortos, con datos y acciones reales de la demo:
- **Kiosco:**
  - Vender con el lector (simulado con el teclado) y con los favoritos.
  - Cortar la conexión con un interruptor y seguir vendiendo.
  - Anotar un fiado.
  - Cerrar la caja: arqueo, diferencia $ 0 y el salto.
- **Ferretería:** un presupuesto que pasa a venta, una transferencia entre sucursales y una orden de servicio técnico.
- **Distribuidora:**
  - Un pedido de un preventista que llega desde la calle.
  - La hoja de ruta del reparto en un mapa.
  - Una cobranza que baja la deuda de un cliente.
- **Grupo:**
  - El consolidado de las 40 sucursales y el mapa con su actividad.
  - Una compra que espera aprobación y se aprueba en dos niveles.
  - El registro de auditoría.
- Cada función muestra el sello de su estado en el registro.

### 5.5 Recorrido guiado
- Un botón reproduce un recorrido automático por las cuatro empresas, con subtítulos breves al costado ("Este es un kiosco: una caja, una persona…"), para mostrar en una reunión sin tocar nada.
- Se pausa con la barra espaciadora y avanza con las flechas.
- Es la base del video del punto 8.

## 6. El sitio del producto (`/`)
La página pública de Quvant, en negro y blanco, sobre la grilla.
1. **Hero:**
   - la firma de Quvant y el titular de `src/config/sitio.ts`, con la bajada de la marca;
   - debajo, **la escala:** un control deslizante de "kiosco" a "empresa" que transforma en vivo una vista del tablero, en chico, con los mismos componentes y la coreografía del punto 5.3 (cada paso del control es un salto del punto);
   - los botones "Probar la demo" (a `/demo`) y "Pedir una demo".
2. **El problema:** sistemas viejos que se caen, precios que llevan un día actualizar, cada sucursal por su lado, el cuaderno del fiado. Contado para cada tamaño de negocio.
3. **Nunca se cae:** la demo interactiva del mostrador sin conexión, que ya existe, con la identidad nueva.
4. **Un sistema, cuatro negocios:** las cuatro empresas, cada una con su escena y un link directo a la demo.
5. **Los módulos:** con capturas reales de la demo en mockups, con sus sellos.
6. **Precios al día:** el aumento masivo, con la vista previa de su impacto.
7. **Forja:** la sección que hoy es "Yunque + Forja", con el video nuevo de la tanda 10. Hasta entonces, oculta.
8. **Seguridad y tus datos:** copias, datos exportables, permisos y auditoría. Contado simple y sin prometer certificaciones que no existen.
9. **Planes:** Kiosco, Comercio, Distribuidora y Empresa, desde `src/config/precios.ts` ("Consultá" donde falte).
10. **Desarrollo a medida** (del manual; BORRADOR para que Michel confirme): una sección corta para quien necesita algo propio, con el método de Michel ("se construye por fases y cada fase se prueba antes de seguir") y el botón de contacto.
11. **Socios fundadores:** el formulario de interés que ya existe, sin cupos inventados.
12. **Preguntas frecuentes** y **Pedir una demo:** el formulario que ya existe, con el campo de rubro y tamaño.
13. **Pie:** la firma y "Software a la vanguardia de cada nicho."
- **SEO** con el nombre nuevo y una imagen para redes generada con la firma sobre la grilla.

## 7. Forja, con la marca nueva (tandas 9 y 10)
- **Conserva el nombre y la función:**
  - el mapa con las sucursales;
  - la vista por dentro de una sucursal;
  - la línea de tiempo del día;
  - la sala de control;
  - toda la seguridad (canales privados por sucursal y vistas con `security_invoker`).
- **Lo que cambia:**
  - **La animación de activación:** ya no es el yunque que cae. Es una nueva, con el logo y sin deformarlo:
    - el aro se traza y el punto salta;
    - donde cae, se enciende la primera sucursal;
    - desde ahí, la grilla de puntos se convierte en el mapa con las demás.
    
    Dura como mucho 4,5 s y se puede saltar.
  - **La placa de nombre:** "Forja · by Quvant" o la que proponga el reporte, con una frase nueva en lugar de "Lo firme y lo vivo, trabajando juntos" (BORRADOR).
  - **La base visual** pasa al negro y blanco de la marca, con materiales monocromos. La escala de calor de la actividad queda solo como visualización de datos, discreta: es la única excepción a la paleta y va documentada.
  - **La vista por dentro se adapta al rubro:**
    - un kiosco (mostrador y góndolas);
    - un comercio (mostrador, depósito y taller);
    - una distribuidora (depósito con andenes y camiones);
    - una sucursal del grupo.
- **Sigue con carga diferida:** Three.js, MapLibre y deck.gl solo en sus rutas.
- **En la demo:**
  - disponible para el grupo y la distribuidora desde su barra lateral;
  - con la misma fuente de datos de la demo (5.1), sin Realtime;
  - con su sello.
- **Los videos de Forja se rehacen** con el método del punto 8.2, no con el `grabar-forja.mjs` viejo, que graba en tiempo real.

## 8. Presentaciones y videos (tanda 8)
### 8.1 Lo que ya existe, actualizado
- **`/inversores`,** con el nombre, la identidad y el alcance nuevos:
  - el problema, contado para todos los tamaños de negocio, con datos de mercado con fuente o `[COMPLETAR con dato y fuente]`, **sin inventar cifras**;
  - la demo que cambia de empresa como escena estrella;
  - el estado actual, con honestidad: el estado del piloto, `[COMPLETAR]`;
  - el modelo de negocio por plan:
    - las proyecciones, desde `src/config/precios.ts`;
    - mientras los precios sean `[COMPLETAR]`, solo la fórmula, sin números;
    - nada de los USD 290 de Yunque;
  - la hoja de ruta y el equipo (`[COMPLETAR]`);
  - transiciones entre escenas con el salto del punto y fondos con la grilla.
- **`/demo/[cliente]` y `/demo/ferremix`:** con Quvant, con el sello PROPUESTA y el co-branding del cliente que ya existe.

### 8.2 Los videos (los filma Claude Code)
- **"Quvant en 60 segundos":**
  1. La firma se arma.
  2. El kiosco vende sin conexión y cierra la caja justa.
  3. El salto lleva a la ferretería, a la distribuidora y al grupo, cada uno con su momento.
  4. "Probá la demo" con la dirección.
  5. El cierre del manual: «Quvant.», una pausa breve y «Software a la vanguardia de cada nicho.» Es lo último que se ve.
- **Las dos versiones:**
  - `public/videos/quvant-60s.mp4`: horizontal, de 1920×1080.
  - `public/videos/quvant-60s-vertical.mp4`: vertical, de 1080×1920, para Instagram y WhatsApp. Se compone para el vertical, no se recorta: texto grande y dentro de las zonas seguras (nada importante en los 250 px de arriba ni en los 420 px de abajo).
- **"El cambio de empresa":** un loop de 12 a 15 s con las cuatro transiciones, para el sitio y para mandar.
- **Cómo se filma:**
  1. Cada video es una página con una línea de tiempo maestra de GSAP, sin scroll. Los cambios de empresa y sus Flip se crean dentro de esa línea de tiempo.
  2. Con `?film=1`, la página expone `window.__ready`, `window.__duration` y `window.__seek(t)`.
  3. **`__seek(t)` solo avanza:** `gsap.globalTimeline.pause()` y después `gsap.globalTimeline.totalTime(t)`, así corren también los callbacks y las animaciones creadas en el camino. Se filma en orden, cuadro por cuadro.
  4. Antes de cada captura se esperan dos `requestAnimationFrame`.
  5. Un script con Playwright contra `next start` (nunca `next dev`) toma un JPEG por cuadro a 30 fps y lo pasa por pipe a `ffmpeg-static` con `libx264`, `-crf 18`, `-vf "scale=in_color_matrix=bt601:in_range=pc:out_color_matrix=bt709:out_range=tv,format=yuv420p"`, las etiquetas BT.709 y `+faststart`.
- **Nada de `recordVideo` de Playwright:** sale en baja calidad y con saltos.
- **El simulador y los números** van con semilla y como función del tiempo, así cada cuadro sale igual.
- **Se verifica** con `ffprobe` (de `ffprobe-static`) y mirando como mucho 3 cuadros por video.

## 9. Criterios estéticos (revisalos en cada vuelta)
- **Se siente un producto de primera:** al lado de los sistemas viejos del rubro, parece de otro planeta; al lado de los mejores productos de software, está a la altura.
- **Es Quvant, como en el manual:** negro y blanco, la Q cromada como único brillo, Michroma solo en lo corto, Plex Mono en todo lo demás, la grilla y el salto. Nada fuera de eso, salvo los colores de estado y los de cada empresa.
- **El kiosquero lo entiende sin explicación,** y el gerente de la empresa grande ve control y precisión.
- **El cambio de empresa es una transformación,** no un recargo de página: el punto salta, todo se mueve con sentido y nada parpadea.
- **Los números mandan:** los totales se leen primero, grandes y alineados.
- **Movimiento preciso y calmo:** curvas suaves, nada de rebotes exagerados, un solo reloj de animación (GSAP) y solo `transform`, `opacity` y `clip-path`.
- **Nada de "estética de IA":** ni degradés violetas, ni vidrio exagerado, ni ilustraciones genéricas, ni íconos de stock de colores. Un solo set de íconos (Lucide, el de shadcn), con el mismo trazo en todo.
- **Honesto:** los sellos `DEMO`, `SIMULACIÓN`, `PROPUESTA` y los estados del registro, siempre a la vista donde corresponden.

## 10. Tandas (una sesión nueva por pedido)

**Tanda 1 · La marca en el sistema**
1. Leer el repo y el manual. Copiar los logos y generar las versiones que falten, verificadas (2.1).
2. Los tokens de color, con los grises intermedios, los colores de estado y los modos oscuro y claro (2.2).
3. La tipografía, con sus estilos cerrados y `docs/TIPOGRAFIA.md` (2.3).
4. La grilla, el salto y las viñetas como componentes (2.4).
5. La lámina del sistema aplicado y las 3 propuestas de titular para el sitio (2.6 y punto 1).

→ **Frená.** Michel mira la lámina y elige el titular.

**Tanda 2 · El renombre y la app**
1. Guardar el titular elegido en `src/config/sitio.ts`.
2. El renombre completo, con el material viejo de Forja oculto (punto 3).
3. Los componentes base con la identidad nueva: botones, campos, tablas, números, chips de estado, barra lateral, ⌘K y `<ConQuvant />`.
4. La app completa con la identidad nueva, módulo por módulo:
   - hasta 3 vueltas solo en el tablero, el mostrador y la caja;
   - el resto, una pasada en oscuro y en claro, con una captura en oscuro.

→ **Frená.**

**Tanda 3 · Las cuatro empresas y la demo**
1. La interfaz de datos con sus dos implementaciones, los datos de las cuatro empresas, sus logos ficticios, flags y terminología (punto 4 y 5.1).
2. `/demo` con su barra, el selector y el estado guardado (5.2).
3. El tablero de cada escala, con su densidad, y el cambio de empresa por ahora con un fundido simple.

→ **Frená.** Michel revisa las empresas y sus tableros.

**Tanda 4 · El cambio de empresa**
1. La coreografía completa del punto 5.3, con el salto, con sus vueltas.
2. `build` para verificar que todo compila.

→ **Frená.** Michel prueba el cambio de empresa.

**Tanda 5 · El kiosco y la ferretería por dentro**
1. El mostrador del kiosco, grande y táctil en su diseño (aunque se pruebe en escritorio), con el fiado, el corte de conexión y el cierre de caja con el salto.
2. Los recorridos de la ferretería (5.4).

→ **Frená.**

**Tanda 6 · La distribuidora, el grupo y el recorrido guiado**
1. La preventa, la hoja de ruta del reparto y las cobranzas de la distribuidora.
2. Las vistas densas del grupo: consolidado, comparación, mapa, aprobaciones y auditoría.
3. El recorrido guiado (5.5).

→ **Frená.**

**Tanda 7 · El sitio del producto**
1. El hero con la escala.
2. Las secciones del punto 6, con capturas reales de la demo.
3. Los planes, desde la configuración, y el formulario.

→ **Frená.**

**Tanda 8 · Presentaciones y videos**
1. `/inversores` y `/demo/ferremix`, actualizadas (8.1).
2. `build`, y los videos de 60 s (horizontal y vertical) y el loop del cambio de empresa, filmados (8.2).

→ **Frená.**

**Tanda 9 · Forja: la base y la activación**
1. La base visual en negro y blanco, la escala de actividad y la placa de nombre (punto 7).
2. La animación de activación nueva.
3. Forja dentro de la demo, para el grupo y la distribuidora.

→ **Frená.**

**Tanda 10 · Forja por rubro y el final**
1. La vista por dentro según el rubro.
2. `/demo/ferremix/forja` con la marca nueva.
3. Los videos de Forja, rehechos con el método del punto 8.2, y la sección de Forja del sitio y la escena de `/inversores`, de nuevo a la vista.
4. `build` y `lint` limpios, `docs/PENDIENTE-CIERRE.md` al día y el reporte final.

→ **Frená.** Después viene `PROMPT-QUVANT-CIERRE.md`.

## 11. Al terminar cada tanda
- `typecheck` sin errores, más `build` donde la tanda lo pide.
- Las capturas de lo terminado, en `docs/capturas/quvant/tanda-N/`.
- En `docs/REPORTE.md`: qué se hizo, las decisiones y "Para Michel", con lo que tiene que elegir o completar.
- `docs/PENDIENTE-CIERRE.md` con lo que quedó para el cierre.
- `src/showcase/features.ts` y `docs/ROADMAP.md` al día (regla del `CLAUDE.md`).
- Las líneas de `docs/BITACORA.md` y los commits.
- Un resumen corto en el chat. Y frená.
