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
- **Tests de punta a punta:** no se corrieron en esta tanda. Cambiaron los usuarios de prueba (`@demo.quvant.app`), el testid del salto y la cantidad de escenas de `/inversores` (12 mientras Forja esté oculta). Correr `npm run build && npm run test:e2e` y ajustar.
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
