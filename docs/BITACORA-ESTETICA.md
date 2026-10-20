# Bitácora estética

Hasta 3 vueltas por pantalla clave, revisadas contra los criterios del punto 9 de `PROMPT-QUVANT.md`. Por vuelta: qué se vio y qué cambió. Las capturas de cada vuelta están en `docs/capturas/quvant/tanda-N/`.

## Tanda 1 · La lámina del sistema aplicado (`/marca/sistema`)

Se compone a 1600×1000 y se captura a 1,5× (2400×1500). Así los estilos de texto se ven a su tamaño real dentro de la lámina y la imagen queda nítida.

**Vuelta 1** (`lamina-vuelta-1.png`)
- Tres columnas que se apilaban hacia abajo: el contenido pasaba los 1000 px y se cortaban la tipografía, las extensiones y el pie.
- Las tarjetas de caja eran angostas: el total se partía en dos renglones ("$" arriba, el número abajo) y el botón "Movimientos" se salía de la tarjeta.
- Las muestras `.t-hero` y `.t-texto` quedaban truncadas ("Vend…") porque la especificación de dos líneas comía el ancho.
- Dentro de los cuadros del salto, la grilla casi no se veía: a esa escala, el punto de 1,2 px en gris profundo desaparecía.

**Vuelta 2** (`lamina-vuelta-2.png`)
- Dos filas de tres columnas: arriba la firma, el color y el salto; abajo la tipografía, la app y las extensiones. Entra todo, con el pie a la vista.
- Principal y negativa, una al lado de la otra; la Q en sus tintas, el ícono y el favicon en una fila; los mínimos a tamaño real (16 px y 96 px).
- Tarjetas de 260 px con un total de kiosco más corto ($ 284.350) y botones "Cerrar caja" y "Detalle".
- **Cambio de sistema:** las clases `.t-numero*` ahora llevan `white-space: nowrap`, para que un total nunca se parta.
- Los puntos de la grilla en los cuadros del salto pasan de 0,045 a 0,06 del paso.
- Quedaba: las especificaciones tipográficas se salían por la derecha y algunas etiquetas se partían en dos renglones ("Arqueo sin diferencias", la de la escala, "Cae adelante", "16 · 96 px").

**Vuelta 3** (`lamina-vuelta-3.png`)
- Especificaciones en una línea, sin repetir la familia en cada fila. La familia queda dicha una vez al pie: "Michroma: una o dos palabras · IBM Plex Mono: todo lo demás".
- Etiquetas cortas que entran en un renglón ("Sin diferencias", "Aterriza", "Mínimos"). En la escala, los cuatro anclajes (0, 3, 9, 13) en blanco y los interpolados en gris.
- El "antes" de Yunque, con su rótulo arriba y alineado al pie de la columna, en vez de flotar.
- Resultado: la jerarquía se lee de arriba abajo (encabezado → seis secciones numeradas → pie con la bajada), nada se corta y lo único con brillo es la Q cromada.

**Decisión de estilo de la tanda:** `--radius` baja de 10 px (Yunque) a 4 px. El manual no tiene esquinas redondeadas (las placas, las muestras y el recuadro de la firma son rectos) y el punto es un cuadrado: los bordes casi rectos se sienten más precisos.
