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

## Tanda 5 · El kiosco y la ferretería por dentro (`docs/capturas/quvant/tanda-5/`)

**Vuelta 1**
- El mostrador del kiosco se lee de lejos: favoritos de 92 px de alto, el total grande y "Cobrar" de 64 px. Cortar la conexión pinta el interruptor de alerta y la venta avisa que quedó en el equipo. La sincronización salta desde el interruptor.
- El cierre de caja con diferencia $ 0 lanza el salto con su mensaje.
- Quedaba: debajo de los favoritos había un vacío grande, y la caja cerrada era una tarjeta sola. En presupuestos, los nombres de los clientes se cortaban demasiado. El fiado sumaba un número sospechosamente redondo.

**Vuelta 2**
- Debajo de los favoritos va "Lo último que vendiste": lo del visitante (en cola o sincronizado) y la simulación.
- La caja cerrada suma "El día" (ventas, efectivo, otros medios y el fondo para mañana).
- La lista de presupuestos gana ancho. El fiado pasa a $ 148.950.

## Tanda 6 · La distribuidora, el grupo y el recorrido (`docs/capturas/quvant/tanda-6/`)

**Vuelta 1**
- El reparto se lee como un mapa sin serlo: el depósito es un cuadrado blanco al centro y las rutas usan el lenguaje de la grilla (cuadrados, no pines). El camión elegido va en el color de la empresa; los otros, en gris punteado.
- Las aprobaciones muestran los dos niveles como una escalera de casillas. La segunda firma lanza el salto desde el botón.
- Quedaba:
  - en la preventa, pedidos repetidos;
  - en el reparto, el rótulo "DEPÓSITO" pisaba la ruta;
  - en la comparación, los nombres de las sucursales se cortaban y los números sobraban de ancho;
  - en permisos, "Ver todo el grupo" se pegaba con "Gestionar usuarios";
  - en la auditoría, la misma frase diez veces.

**Vuelta 2**
- El rótulo del depósito pasa arriba del cuadrado, centrado. La ruta del camión elegido se dibuja como trazo SVG (quieta si se pidió menos movimiento).
- Las columnas numéricas de la comparación quedan fijas en 96 px y la sucursal gana el resto. Los permisos se acortan ("Precios", "Aprobar", "Todo el grupo", "Usuarios").
- El panel del recorrido pasa a 500 px para que el rótulo no se parta. El último subtítulo repetía la bajada, que ya está en la firma: ahora invita a probar.

## Tanda 7 · El sitio (`docs/capturas/quvant/tanda-7/`)

**Vuelta 1**
- El hero se lee en dos columnas: el titular grande a la izquierda y la bajada con los botones a la derecha. Debajo, la escala con sus cuatro paradas sobre una línea; el punto es el cursor.
- Las secciones comparten un lenguaje: tablas de celdas separadas por una línea de 1 px (no tarjetas sueltas con sombra), esquinas de 4 px, títulos en `.t-titulo-lg`.
- Las capturas van en un marco sobrio con tres cuadrados (no los círculos de macOS) y la ruta en la demo.
- Quedaba:
  - a 1280 px de base, las tarjetas del grupo cortaban sus rótulos ("OBJETIVO DEL…");
  - el foco del control era un recuadro blanco enorme;
  - en "Un sistema, cuatro negocios", el pie de cada tarjeta se partía en dos renglones;
  - la bajada de los planes decía "Cotizada aparte…" sin sujeto;
  - en el formulario, dos rótulos salían más grandes que el resto (una variable pisada);
  - el estado real era una pared de notas.

**Vuelta 2**
- La escala dibuja a 1440 × 852, como la demo, y se achica: entra todo, en chico.
- El foco del control pasa a un contorno fino de 1 px.
- El pie de las empresas dice solo "N módulos encendidos".
- "La implementación, cotizada aparte…".
- Los rótulos del formulario, todos iguales; "Sistema actual (opcional)" ya no se parte.
- En el estado real, cada nota se abre con un clic ("Nota"): la lista se lee de un vistazo y la aclaración sigue a mano.

## Tanda 8 · Presentaciones y videos (`docs/capturas/quvant/tanda-8/`)

**Vuelta 1**
- `/inversores` sobre la grilla de puntos, con el índice de escenas abajo a la izquierda (el punto salta de una escena a la otra). La escena estrella es la escala del sitio, grande. El modelo de negocio sin números lo dice en un recuadro punteado, sin esconderlo.
- Los videos: la firma se arma (la Q se dibuja, el logotipo aparece de izquierda a derecha y después la bajada), la demo a 1,2× con un subtítulo abajo y el cierre del manual en blanco sobre negro.
- Quedaba:
  - el mensaje "Cola sincronizada" se cortaba contra el borde derecho (el interruptor está pegado al borde);
  - en el vertical, la demo dibujada a 1280 px cortaba la columna del cobro del mostrador;
  - el gráfico de la inversión usaba cuatro colores ajenos al manual.

**Vuelta 2**
- El salto arranca un poco antes cuando está cerca del borde derecho: el mensaje entra en la pantalla.
- En el vertical, la demo se dibuja a 1440 × 1200 y se achica a 0,75: entra todo y queda entre las zonas seguras.
- La inversión, en la escala de grises: blanco, acero y dos grises.

## Tanda 9 · Forja (`docs/capturas/quvant/tanda-9/`)

**Vuelta 1**
- La activación se lee como la marca: el aro blanco que se traza, el punto cuadrado que salta con su trazo punteado y la grilla que se enciende en onda alrededor de las sucursales. Termina con la placa y la frase.
- El taller y el mapa en grises: el negro de la marca de fondo, el calor como única nota tibia.
- Quedaba:
  - en el mapa del grupo, 40 nombres pisados;
  - los arcos de las transferencias seguían naranjas (los dibuja deck.gl con colores propios);
  - la activación no terminaba dentro de la demo (ver la bitácora).

**Vuelta 2**
- El nombre solo en las 8 sucursales que más venden; el resto, al pasar o con el foco.
- Los arcos, las estelas y los bultos en blanco.
- La activación toma los puntos una vez y termina en 4,5 s.

## Tanda 10 · Forja por rubro (`docs/capturas/quvant/tanda-10/`)

**Vuelta 1**
- La sucursal del grupo se lee como un local de cadena: el salón con sus racks al fondo, una fila larga de cajas y la carga al costado. La distribuidora, como un depósito: racks al fondo y una fila de andenes al frente.
- Quedaba:
  - los racks ralos (uno por categoría, perdidos en secciones anchas);
  - la nota "Sin entregas pendientes" encima de los andenes;
  - con todos los camiones en la calle a las 17:30, los andenes vacíos no contaban nada.

**Vuelta 2**
- Cuatro racks por categoría.
- La nota solo cuando no hay ni entregas ni camiones.
- Dos camiones que cargan los pedidos de mañana: un andén ocupado al lado de los vacíos cuenta el reparto de un vistazo.

