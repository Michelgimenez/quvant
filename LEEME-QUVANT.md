# Yunque pasa a ser Quvant · Leeme
Esto es para vos, Michel, no para Claude Code.

## Qué hace
1. **Le cambia el nombre al sistema:** Yunque pasa a llamarse Quvant en todo lo que se ve (sitio, app, mails, presentaciones, demos y documentación).
2. **Aplica tu manual de identidad tal cual:**
   - la Q cromada;
   - negro y blanco;
   - Michroma para el logotipo y lo muy corto, IBM Plex Mono para todo lo demás;
   - la grilla de puntos y el salto del punto.
3. **Abre el alcance:** el sistema sirve para un kiosco de barrio, un comercio, una distribuidora y una empresa con 40 sucursales. Es el mismo Quvant, con los módulos que cada uno necesita.
4. **Arma la demo estrella, `/demo`:** cuatro empresas ficticias y un selector para pasar de una a otra. Al cambiar, el punto del logo salta de una empresa a la otra y toda la app se transforma: el logo de la empresa, su color, los módulos, los números y la densidad del tablero.
5. **Rehace el sitio** con la escala (un control que va de "kiosco" a "empresa"), actualiza `/inversores` y `/demo/ferremix`, y **filma los videos**: Quvant en 60 segundos (horizontal y vertical) y un loop del cambio de empresa.
6. **Le da a Forja la marca nueva,** con una animación de activación hecha con la Q.

**Nada inventado:** ni clientes, ni métricas, ni testimonios. Las empresas de la demo son ficticias y llevan el sello DEMO. Ferremix aparece solo como propuesta.

## Antes de correrlo
1. **Copiá el kit en la carpeta del repo de Yunque:** `PROMPT-QUVANT.md`, `PROMPT-QUVANT-CIERRE.md`, este leeme y las carpetas `marca/` y `referencias/`.
2. **Poné los archivos del logo de Quvant en `marca/`** (leé `marca/LEEME.md`): la Q cromada y la firma horizontal, en SVG si los tenés, o en PNG grande.
3. **El manual ya está en `referencias/`.** Si cambiás algo del manual, reemplazá el PDF.
4. **Cerrá cualquier otra sesión** de Claude Code sobre ese repo y abrí una nueva en la carpeta, con esfuerzo high.

## Los pedidos
Cada tanda va en una sesión nueva. Desde la tanda 2, el pedido arranca así: `Leé PROMPT-QUVANT.md, docs/REPORTE.md y los últimos commits, y hacé la tanda N.`

1. `Leé PROMPT-QUVANT.md y hacé la tanda 1.`
   - **Al empezar,** te lista lo que necesita instalar y te pide un solo OK.
   - **Qué hace:** pone la marca dentro del sistema:
     - los logos en todas las versiones que necesita la web;
     - los colores como tokens, en oscuro y en claro;
     - las dos tipografías con sus estilos;
     - la grilla y el salto como componentes;
     - una lámina con todo aplicado y 3 titulares para el sitio.
   - **Qué revisás:**
     - que la lámina respete tu manual (la Q, los colores y las letras);
     - las "extensiones del prompt", que son lo que el manual no decía y se agregó (por ejemplo, los colores de estado y el modo claro);
     - cuál de los 3 titulares te gusta.
2. `… y hacé la tanda 2. Titular: [el que elegiste].`
   - **Qué hace:** el cambio de nombre en todo el proyecto y la app completa con la identidad nueva, en oscuro y en claro. Esconde por ahora lo viejo de Forja que muestra el yunque.
   - **Qué revisás:** que no quede nada de Yunque a la vista y que el tablero, el mostrador y la caja se vean como Quvant.
3. `… y hacé la tanda 3.`
   - **Qué hace:** las cuatro empresas de la demo (con sus datos, logos ficticios, colores y módulos), la página `/demo` con el selector y el tablero de cada una. El cambio de empresa, por ahora, es un fundido simple.
   - **Qué revisás:**
     - los nombres de las empresas (si alguno no te gusta, decíselo);
     - que cada tablero se sienta de su tamaño: el kiosco simple y el grupo denso.
4. `… y hacé la tanda 4.`
   - **Qué hace:** el momento estrella, el cambio de empresa. El punto salta de una empresa a otra y la app se transforma: logo, módulos, números y tablero.
   - **Qué revisás:** probalo vos con las teclas 1 a 4. Tiene que sentirse como una transformación, no como recargar la página.
5. `… y hacé la tanda 5.`
   - **Qué hace:**
     - el kiosco por dentro: vender, cortar la conexión, anotar un fiado y cerrar la caja con diferencia cero;
     - la ferretería por dentro: un presupuesto que pasa a venta, una transferencia y servicio técnico.
   - **Qué revisás:** recorrelos como si fueras el dueño. ¿Se entiende sin explicación?
6. `… y hacé la tanda 6.`
   - **Qué hace:**
     - la distribuidora: preventa, reparto y cobranzas;
     - el grupo: consolidado, mapa, aprobaciones y auditoría;
     - el recorrido guiado para mostrar en reuniones.
   - **Qué revisás:** el recorrido guiado de punta a punta, como si lo vieras en una reunión.
7. `… y hacé la tanda 7.`
   - **Qué hace:** el sitio nuevo, con la escala en el hero, las cuatro empresas, los planes, la sección de desarrollo a medida y el formulario.
   - **Qué revisás:**
     - el sitio de punta a punta;
     - el texto de desarrollo a medida;
     - los planes (completá los precios en `src/config/precios.ts`, o quedan como "Consultá").
8. `… y hacé la tanda 8.`
   - **Qué hace:** `/inversores` y `/demo/ferremix` con Quvant, y los videos filmados: Quvant en 60 segundos (horizontal y vertical) y el loop del cambio de empresa.
   - **Qué revisás:**
     - los videos, en `public/videos/`;
     - los `[COMPLETAR]` de `/inversores` (estado del piloto, precios, equipo).
9. `… y hacé la tanda 9.`
   - **Qué hace:** Forja con la marca nueva: negro y blanco, la activación con la Q y el punto, y Forja dentro de la demo.
   - **Qué revisás:** la animación de activación y el nombre y la frase que te propone.
10. `… y hacé la tanda 10.`
    - **Qué hace:**
      - la vista por dentro de cada rubro en Forja;
      - `/demo/ferremix/forja`;
      - los videos de Forja rehechos;
      - el cierre del boceto, con todo compilando limpio.
    - **Qué revisás:** el reporte final y Forja en la demo del grupo.

**Entre tandas, si querés pulir algo:** `Leé PROMPT-QUVANT.md y docs/REPORTE.md. En [la pantalla], cambiá esto: [lo que viste]. No toques nada más.`

## El cierre (cuando la interfaz esté aprobada)
Una fase por sesión: `Leé PROMPT-QUVANT-CIERRE.md, docs/PENDIENTE-CIERRE.md y los últimos commits, y hacé la fase N.`

| Fase | Qué hace | Qué revisás |
|---|---|---|
| 1 · Celular y tablet | El mostrador del kiosco táctil con lector por cámara, la app del preventista, el dueño en el celular, la demo y el sitio en el celular | Probalo en tu teléfono |
| 2 · Respaldos y movimiento | La versión quieta para quien desactiva las animaciones, el 2D de Forja y los videos con su portada | Que nada se vea pobre sin animación |
| 3 · Accesibilidad | Contraste, teclado y lectores de pantalla en todo | El informe en el reporte |
| 4 · Rendimiento | Velocidad del sitio y de la demo | Los números en el reporte (si querés PageSpeed, pasale la dirección publicada y una clave de la API) |
| 5 · Seguridad | Aislamiento entre empresas, demos sin acceso a la base, formularios y documentación de seguridad | `docs/SEGURIDAD.md` |
| 6 · Navegadores y tamaños | De 320 a 2560 px, en Chrome, Safari y Firefox | Abrí el link desde Instagram en tu teléfono: eso no se puede probar en la compu |
| 7 · SEO, íconos y honestidad | Metadatos, imágenes para redes, ícono de la app y que no quede nada de ejemplo a la vista | Los `[COMPLETAR]` que te deja |
| 8 · Salida | Los videos finales, la documentación y un recorrido completo | El resumen de una página |

## Lo que tenés que saber
- **El nombre:** en una búsqueda web no apareció ninguna empresa llamada exactamente Quvant, pero hay nombres parecidos en software (Qvantel, Qvantum). Registrá la marca y el dominio cuanto antes.
- **El manual manda:** si algo del prompt contradice tu manual, Claude Code sigue el manual y te lo anota.
- **El nombre Forja se queda,** porque está en el manual. Lo que cambia es la animación del yunque, que ya no tiene sentido.
- **La base de datos no se toca de forma destructiva,** y la demo pública no la usa.
- **No sube nada ni hace deploy:** eso lo hacés vos.
