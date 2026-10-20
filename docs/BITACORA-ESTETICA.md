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

## Tanda 2 · Tablero, mostrador y caja (`docs/capturas/quvant/tanda-2/vuelta-N/`)

**Vuelta 1**
- Ya en negro y blanco con Plex Mono. El color de la empresa (verde de la demo) queda en su logo, en el indicador activo y en la serie principal del gráfico.
- Las etiquetas mezclaban estilos: "Ventas de hoy · todos los negocios" iba en texto común y "POR NEGOCIO", en etiqueta.
- La barra "Caja abierta" del mostrador se partía en tres renglones (la mono ocupa más ancho).
- Los avisos (toasts) salían con otra letra.
- El diálogo de cierre tenía un desenfoque fuerte, tipo vidrio.

**Vuelta 2**
- Las etiquetas pasan a `.t-etiqueta`; el total del día, a `.t-numero-xl`; las cifras, a `.t-numero-lg`. Los diálogos pasan a negro al 70 % sin desenfoque, y los avisos, a Plex Mono.
- El mapa automático de tamaños agrandó el sello DEMO y la hora de la barra de caja se metía debajo de "Retiro / gasto".

**Vuelta 3**
- El sello vuelve a `.t-etiqueta`. El botón de retiro queda solo con su ícono (con su nombre accesible) y el estado de la caja se recorta con puntos suspensivos si no entra.
- En oscuro y en claro: los totales se leen primero, nada se parte y el claro queda plano y prolijo, sin grilla.

## Tanda 3 · Los tableros de las cuatro escalas (`docs/capturas/quvant/tanda-3/`)

**Vuelta 1**
- Se nota la escala: el kiosco tiene números grandes y pocas tarjetas; el grupo, seis cifras, el mapa, una tabla de 40 filas y la auditoría. El selector, con sus cuatro tarjetas sobre la grilla, se lee de un vistazo, y los logos ficticios se distinguen sin competir con la Q.
- El color de cada empresa no llegaba a sus gráficos: `--serie-1` no estaba definido en la escena.
- La comparación "vs el viernes pasado" daba −35 % en el kiosco porque comparaba media tarde contra un día entero.
- "Las últimas ventas" y "Actividad" arrancaban vacías hasta el primer evento simulado.
- En el grupo, las etiquetas de las cifras se cortaban, el stock valorizado salía como "$ 11 mil M" y la columna "Hoy" de la comparación se partía en tres renglones.

**Vuelta 2**
- El color de la empresa se define en la escena (`--marca`, `--serie-1`): verde en la ferretería, frambuesa en el grupo, tomate en la hora en curso del kiosco.
- El kiosco, la distribuidora y el grupo se comparan con el viernes pasado a la misma hora. La ferretería, cuyo seed reparte el día completo, contra el día entero.
- Las listas arrancan con lo que pasó hoy antes de las 17:30.
- El grupo pasa a etiquetas cortas, a una tabla con anchos fijos (números sin cortes) y a cifras grandes del tipo "$ 11.012 M". En la ferretería, el taller pasa de una grilla 2×2 apretada a una lista.

## Tanda 4 · El cambio de empresa (`docs/capturas/quvant/tanda-4/`: una hoja de contacto por vuelta y los cuadros de la tercera)

**Vuelta 1**
- El salto se veía, pero el arco entre la primera y la última tarjeta subía 450 px y se salía de la pantalla.
- La escena no cambiaba a tiempo: el barrido arrancaba recién al final, porque los pasos agregados en la caída se ubicaban al final de la línea de tiempo.

**Vuelta 2**
- El arco tiene un tope de ~70 px de alto: es un salto entre tarjetas, no un vuelo.
- Los pasos de la caída van en tiempos absolutos. El barrido, Flip, los logos y los números ya corren juntos.
- Quedaban dos cosas. A mitad del barrido, las tarjetas semitransparentes dejaban ver la foto vieja por debajo y se superponían los textos. Y con el reloj pausado (modo filmación), el selector se veía abierto en el primer cuadro.

**Vuelta 3**
- La escena viva tiene fondo opaco: el barrido es limpio, y afuera del círculo queda solo el estado viejo.
- El selector arranca oculto por CSS y GSAP solo lo anima al abrir y cerrar: no hay parpadeo en ningún modo.
- Los tiempos se ajustan: apertura 0,27 s, salto 0,48 s y barrido 0,7 s. Son ~1,5 s con el selector cerrado y ~1,2 s si estaba abierto.
- Resultado: el punto despega, cruza en arco y cae; los logos se cruzan; el barrido nace en la caída; la barra lateral se reacomoda y los números ruedan. Se siente una transformación, no una recarga.
