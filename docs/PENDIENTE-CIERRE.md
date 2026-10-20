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
