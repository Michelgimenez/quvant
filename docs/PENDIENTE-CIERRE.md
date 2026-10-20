# Pendiente para el cierre (`PROMPT-QUVANT-CIERRE.md`)

Lo que el modo boceto deja para después: celular, respaldos, accesibilidad fina, rendimiento y auditorías. Se suma una sección por tanda.

## De la tanda 1 · La marca en el sistema

**Respaldos y movimiento (fase 2)**
- `<IsotipoAnimado />` y el salto de recompensa no tienen versión quieta todavía. Con `prefers-reduced-motion` habría que mostrar la Q armada y un aviso sin vuelo.
- La regla global de `prefers-reduced-motion` en `globals.css` frena las animaciones CSS, pero no las de GSAP. Hace falta un `gsap.matchMedia()` o leer la preferencia en cada componente.

**Accesibilidad (fase 3)**
- Los bordes de los campos no llegan al 3:1 que pide WCAG 1.4.11 para componentes, en ningún modo: en claro, `--gris-10` sobre blanco da 1,75:1, y en oscuro, `--gris-4` sobre negro da 1,44:1. Evaluar pasos más contrastados o reforzar el foco.
- `--gris-7` no pasa AA como texto en ningún modo: hoy se usa solo para rótulos decorativos de la lámina. Revisar que nadie lo use para información.
- El foco es un contorno de 2 px en `--ring` (blanco o negro): verificarlo sobre las superficies y sobre el color de cada empresa.

**SEO, íconos y honestidad (fase 7)**
- Faltan un `favicon.svg` y un ícono vectorial para la PWA: solo hay PNG de la Q, porque el original es un PNG.
- La imagen para redes (`public/marca/quvant-og.png`, 1200×630) está generada, pero no conectada todavía (la conecta la tanda 2 en los metadatos). Revisar cómo se ve en WhatsApp, X y LinkedIn.
- Cuando llegue el logotipo oficial: reemplazar `marca/quvant-logotipo-provisorio.svg`, correr `node scripts/marca/generar-marca.mjs` y volver a capturar la lámina.

**Rendimiento (fase 4)**
- `quvant-firma.svg` pesa 280 kB porque lleva la Q incrustada a 1024 px. Para documentos sirve; en la web la firma se arma con dos `<img>` livianos. Evaluar WebP o AVIF para los PNG de la Q.
- Las 8 variantes de Plex Mono (4 pesos × 2 estilos) se descargan todas. Medir cuánto se usan las itálicas y, si no se usan, sacarlas.

## De la tanda 2 · El renombre y la app

- **Tamaños sueltos en módulos secundarios:** los textos chicos ya usan `.t-texto-sm`, pero quedan tamaños de Tailwind en títulos y números de inventario, compras, reportes, configuración y presupuestos. Hay que pasarlos a las clases cerradas, revisando cada pantalla.
- **Tests de punta a punta:** se pusieron al día en la tanda 8 (ver el reporte).
- **Claves de almacenamiento:** pasaron de `yunque:` a `quvant:` sin migración. En producción habría que leer las viejas como respaldo.
- **El manifiesto:** no hay ícono vectorial porque la Q es PNG.

## De la tanda 3 · Las cuatro empresas y la demo

- **Celular (fase 1):** `/demo` está pensada para escritorio (1440×900). En el celular, la barra lateral tiene que pasar a un menú y los tableros densos (grupo, distribuidora), a una sola columna.
- **Accesibilidad (fase 3):** el selector de empresas es un diálogo sin trampa de foco. Las tablas del grupo se ordenan con botones, pero el orden no se anuncia. El mapa necesita una alternativa en tabla (la comparación cumple ese papel, pero falta enlazarlas).
- **Rendimiento (fase 4):** el snapshot de la ferretería (129 kB) y los catálogos generados viajan en el paquete de `/demo`. Medir y, si hace falta, cargar cada empresa recién al elegirla.
- **Movimiento reducido (fase 2):** el fundido y el simulador no miran `prefers-reduced-motion`.

## De la tanda 4 · El cambio de empresa

- **Movimiento reducido (fase 2):** con `prefers-reduced-motion` el cambio tiene que ser un corte limpio (o un fundido corto), sin salto ni barrido.
- **Accesibilidad (fase 3):** anunciar el cambio a lectores de pantalla ("Estás viendo Grupo Cordal") con una región en vivo, y mover el foco al título del tablero nuevo.
- **La foto del estado viejo** duplica por un instante los `id` de las máscaras SVG del clon. Hoy no se nota; en el cierre conviene limpiar los `id` del clon.
- **Rendimiento (fase 4):** medir el cambio hacia el grupo en una máquina de 4 núcleos (es el que más DOM monta).

## De la tanda 5 · El kiosco y la ferretería por dentro

- **Celular y tablet (fase 1):** el mostrador del kiosco está diseñado para pantalla táctil pero probado en escritorio. Falta el lector con la cámara del celular, y que los favoritos y el carrito se reacomoden en una tablet vertical.
- **Accesibilidad (fase 3):** el interruptor de conexión es un botón con `aria-pressed`; revisar que se anuncie como interruptor. Las columnas del servicio técnico necesitan títulos de región.
- **La app real:** la pantalla de fiado y el mostrador con favoritos existen solo en la demo (estado `demo` en el registro). Para pasarlos a la app hay que conectarlos al motor de operaciones (`cuenta.pago`, `venta.crear`).

## De la tanda 6 · La distribuidora, el grupo y el recorrido

- **Celular (fase 1):** la app del preventista (el pedido cargado desde el celular) es justamente la pantalla que falta: hoy solo se simula desde el escritorio. El reparto y la comparación necesitan una versión de una columna.
- **Movimiento reducido (fase 2):** el recorrido guiado no tiene versión quieta. Con `prefers-reduced-motion`, los cambios de empresa del recorrido tienen que ser cortes.
- **Accesibilidad (fase 3):** el mapa del reparto es un SVG con `role="img"`; sus paradas se pueden tocar pero no se alcanzan con el teclado (la lista de la derecha cumple ese papel). En el recorrido, la barra espaciadora también puede activar el botón que tiene el foco: conviene sacar el foco de los botones al empezar.
- **El recorrido en otra resolución:** el panel está ubicado para 1440 px (al lado de la barra lateral). Revisarlo en 1280 y en 1920.

## De la tanda 7 · El sitio

- **Celular (fase 1):** la escala achicada a 360 px queda muy chica (≈0,25). En el celular conviene otra vista: el control arriba y una tarjeta por empresa, o la vista con zoom en una parte del tablero. El titular a 64 px se parte en cuatro renglones.
- **Rendimiento (fase 4):** la escala trae el paquete de la demo (los datos de las cuatro empresas se generan cuando el navegador está libre). Medir el LCP (la imagen de la escala quieta tiene `priority`) y el peso del bloque de JavaScript del hero.
- **Movimiento reducido (fase 2):** con `prefers-reduced-motion`, la escala cambia de empresa sin coreografía y no avanza sola. Revisarlo con el lector de pantalla.
- **Accesibilidad (fase 3):** la vista achicada es `inert` (es una representación); el control anuncia la empresa con `aria-valuetext`. Probar con NVDA y VoiceOver.
- **El tamaño en el formulario:** hoy viaja dentro del rubro ("Ferretería · 2 a 5 cajas"). Si se quiere una columna propia, es una migración nueva y reversible (`alter table public.solicitudes_demo add column tamano text` y el `grant insert` de esa columna), aplicada en Supabase **antes** de publicar.
- **SEO (fase 7):** el título para redes es «Quvant · Del kiosco a la empresa.» y la imagen sigue siendo la firma sobre la grilla. Revisar cómo se ve compartido.

## De la tanda 8 · Presentaciones y videos

- **Videos (fase 8):** hay que volver a filmarlos cuando estén el dominio y los precios. Falta una portada (póster) para cada video, y subtítulos en un archivo aparte (`.vtt`) para quien los mira sin sonido en el sitio.
- **Movimiento reducido (fase 2):** el índice de escenas y el fundido respetan `prefers-reduced-motion`; la escala de la escena estrella también. Revisar la película del producto de la demo comercial.
- **El paquete `motion`:** quedó sin uso. Desinstalarlo (`npm uninstall motion`) y verificar el build.
- **Rendimiento (fase 4):** `/inversores` monta la demo de las cuatro empresas en la escena estrella. Medir la memoria en una notebook modesta.
- **Peso del repositorio:** los videos viven en `public/videos/`. Si crecen, conviene un almacenamiento aparte (CDN) en lugar del repositorio.

## De la tanda 9 · Forja

- **La vista por dentro sigue siendo la de la ferretería** (mostrador, depósito, servicio técnico y muelle), aun en el grupo y en la distribuidora. La adaptación por rubro es de la tanda 10.
- **Movimiento reducido (fase 2):** la activación quieta muestra la composición final; revisar que el fundido corto también se respete.
- **Celular (fase 1):** la activación se ve entera en vertical (el escenario se encaja), pero la grilla queda chica. Probarla en un teléfono.
- **Rendimiento (fase 4):** Forja del grupo arma ~2.500 eventos del día. Medir el tiempo de la repetición y del mapa con 40 nodos en una máquina modesta.
- **Accesibilidad (fase 3):** con 40 sucursales, los nombres ocultos siguen en el `aria-label` de cada nodo. Verificarlo con un lector de pantalla.

## De la tanda 10 · Forja por rubro y el final

- **Forja por rubro:** el kiosco tiene su vista pero ningún kiosco de la demo abre Forja. Con un cliente real, probarla con sus datos. La vista de la zona de reparto (el depósito con los camiones hacia esa zona) es una aproximación: revisarla con una distribuidora real.
- **Los videos de Forja (fase 8):** volver a filmarlos con el logo oficial. Revisar el póster (se toma en el segundo 14).
- **El paquete `motion`** sigue instalado sin uso (de la tanda 8).
- **El proceso de `next start`:** en Windows, detener la tarea no siempre mata el proceso hijo. Si un puerto queda ocupado, cerrarlo antes de volver a filmar (un servidor viejo sirve un build viejo).
- **Lint:** limpio en `src`, `scripts` y `tests` al cierre de la tanda 10.

