# Quvant · Cierre
## Celular, respaldos, accesibilidad, rendimiento, seguridad y salida (por fases)

## 0. Cómo trabajar
- **Se corre cuando `PROMPT-QUVANT.md` terminó** sus 10 tandas y Michel aprobó la interfaz.
- **Seguí el punto 0 de `PROMPT-QUVANT.md`** en lo que aplica: la rama `quvant`, un solo OK para las instalaciones y las notas de Windows.
- **Leé antes:** este prompt, `docs/PENDIENTE-CIERRE.md` (el checklist que dejó el boceto), `docs/REPORTE.md` y los últimos commits.
- **Una fase por sesión.** Cada una termina en "frená", con commit, reporte y el pendiente actualizado.
- **No cambies la estética aprobada.** Si una regla obliga a tocar un efecto, usá la alternativa más parecida y anotala.
- **Verificación completa:** `typecheck`, `lint`, `build` y tests en cada fase.
- **Límites:**
  - Sin deploy, sin `git push` y sin secretos en el código.
  - La base, sin cambios destructivos.
  - Nunca dos sesiones sobre el repo a la vez.
- **Bitácora:** 5 a 10 líneas por fase en `docs/BITACORA.md`.
- Decime en pocas líneas cómo lo vas a encarar y avanzá.

## Fase 1 · Celular y tablet
- **El mostrador del kiosco en el celular y en la tablet,** como se usa de verdad:
  - botones de al menos 44 px;
  - lector de códigos por cámara, con búsqueda manual si no hay cámara;
  - teclado numérico propio para montos;
  - una mano.
- **La app del preventista** de la distribuidora, pensada para la calle: pedidos rápidos, clientes del día y modo sin conexión.
- **El dueño en el celular:** su tablero, las ventas del día y las aprobaciones pendientes.
- **`/demo` en el celular:** el selector de empresas como hoja que sube desde abajo, y el cambio de empresa con su salto, adaptado.
- **El sitio en el celular:** el hero con la escala (se desliza con el dedo) y todas las secciones.
- **Base técnica:** `svh` y `dvh`, áreas seguras, campos de 16 px (iOS) y un equivalente táctil para cada hover.
- Probalo con los perfiles de Playwright de iPhone 13, Pixel 7, un Android chico (360×740) y una tablet (820×1180).

## Fase 2 · Respaldos y movimiento
- **`prefers-reduced-motion`,** con una versión quieta igual de cuidada:
  - el salto pasa a ser un fundido;
  - los números aparecen sin rodar;
  - el cambio de empresa es un fundido cruzado;
  - el logo aparece ya armado.
- **Forja:** que la versión 2D esté completa para hardware bajo y movimiento reducido.
- **Videos:** muted, autoplay, loop y `playsInline`, con el póster siempre visible y carga diferida.
- **Un solo `requestAnimationFrame`** (el de GSAP), que se pausa fuera de pantalla y con la pestaña oculta.

## Fase 3 · Accesibilidad
- AA con axe en todas las rutas: sitio, app, `/demo`, `/inversores` y Forja.
- **Contraste:** en los dos modos, sobre la grilla de puntos y en las etiquetas chicas en mayúsculas. En claro, el texto secundario no va en `--acero`.
- **Teclado:**
  - todo se usa con el teclado y con foco visible;
  - el selector de empresas, con flechas y Enter;
  - las tablas, navegables;
  - en ⌘K, el foco queda atrapado y vuelve al botón al cerrar.
- **Anuncios `aria-live`** al cambiar de empresa, al cerrar la caja y al sincronizar la cola sin conexión.
- **Textos alternativos reales,** y un resumen textual de los gráficos y del mapa.

## Fase 4 · Rendimiento
- **Medí con Lighthouse en local,** sobre `next start`: 3 corridas en una ventana de incógnito, sin otros procesos pesados, y la mediana. PageSpeed Insights solo si Michel te da una dirección publicada y una clave de la API.
- **Para visitantes sin sesión, Supabase no se carga en el navegador:** el sitio y `/demo` no lo necesitan.
- **Los datos de cada empresa de la demo** se cargan cuando se elige esa empresa, no todos de entrada.
- **Forja, Three.js, MapLibre y deck.gl,** solo en sus rutas y después del `load`.
- **Fuentes:** Michroma e IBM Plex Mono autohospedadas, con precarga solo de lo que pinta la primera pantalla.
- **El LCP:** el titular del hero no arranca en `opacity: 0`.
- **Metas:** 90 o más en escritorio y 80 o más en celular en el sitio. Los números, en el reporte tal como salen.

## Fase 5 · Seguridad
- **Los tests de aislamiento entre organizaciones (RLS),** al día con todo lo nuevo de la app real. Las empresas de la demo no están en la base: verificá que siga así.
- **Las demos públicas** (`/demo`, `/demo/ferremix`) no leen ni escriben la base: verificalo en el código y en la red del navegador.
- **Variables de entorno:** las nuevas, sin restos de las viejas cuando termine el período de respaldo; nada secreto en el cliente; sin `service_role` fuera del servidor.
- **Formularios** (pedir una demo, socios fundadores): validación con zod en el servidor y límite de envíos.
- **Redirecciones** solo a rutas internas. Cabeceras de seguridad (CSP y `frame-ancestors` donde haga falta embeber).
- **`docs/SEGURIDAD.md`,** actualizado con lo que hay, lo que falta y la lista para una auditoría profesional.

## Fase 6 · Navegadores y tamaños
- Playwright con Chromium, WebKit y Firefox.
- El navegador interno de Instagram no se puede correr con Playwright: emulá su *user agent* y su tamaño, y dejá en el reporte que la prueba real la hace Michel en su teléfono, abriendo el link desde Instagram.
- Anchos de 320, 360, 390, 414, 768, 1024, 1280, 1440, 1920 y 2560 px.
- Sin desbordes horizontales, sin textos cortados y sin barras de scroll de más.

## Fase 7 · SEO, íconos y honestidad
- Metadatos por página, el sitemap y `robots.txt` (`noindex` en `/demo`, `/inversores` y el área privada).
- JSON-LD de `SoftwareApplication` y `Organization`, solo con datos reales.
- Imágenes para redes con la firma sobre la grilla.
- Favicon, ícono de la app y manifiesto de la PWA, con la Q en su tamaño mínimo verificado.
- **Honestidad:** buscá en todo el texto visible `[COMPLETAR]`, "ejemplo", "a confirmar", "Yunque" y Lorem. Lo que falte se oculta.
  - Los sellos `DEMO`, `SIMULACIÓN` y `PROPUESTA`, donde corresponden.
  - El registro de funciones, al día.

## Fase 8 · Salida
- **Los videos y las capturas finales,** regenerados con la versión aprobada (el script de filmación de la tanda 6), verificados con `ffprobe`.
- **La documentación final:** `README`, `docs/ARQUITECTURA.md`, `docs/ROADMAP.md` y `docs/PITCH.md`.
- **Un recorrido completo con Playwright,** en escritorio y celular:
  - el sitio;
  - la demo con las cuatro empresas;
  - una venta sin conexión y su sincronización;
  - el cierre de caja;
  - una aprobación en el grupo.
- **Al principio de `docs/REPORTE.md`,** un resumen de una página: qué está listo, qué está en demo, qué falta, las variables de entorno y los `[COMPLETAR]` para Michel.
