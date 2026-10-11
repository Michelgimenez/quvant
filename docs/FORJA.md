# Forja — la extensión visual de Yunque

Forja convierte los datos de Yunque en un universo que se puede recorrer: la red de sucursales en un mapa, cada sucursal por dentro y la historia de una pieza. Es una **extensión**: se activa por empresa en `/app/extensiones` y lee lo mismo que la app, con los mismos permisos.

Estado: **demo**. Funciona completa con la empresa de demostración (en la app y en `/forja`) y con la propuesta para un prospecto (`/demo/ferremix/forja`). Las lecturas y el tiempo real en Supabase están escritos y probados con RLS, pero la app todavía corre en modo demo (ver "Qué falta").

---

## Recorrido

| Nivel | Qué se ve | Motor |
|---|---|---|
| **Activación** | El yunque se convierte en forja (4,5 s, se puede saltar, una vez por persona). | React Three Fiber + DOM |
| **1 · Red** | Las sucursales en el mapa con el calor de sus ventas, el anillo de stock crítico y las transferencias viajando. Vista Constelación. Línea de tiempo del día (1×, 60×, 600×, 1200×). Sala de control para una TV. | MapLibre + deck.gl (2D: SVG) |
| **2 · Taller** | Corte isométrico de una sucursal: mostrador (puestos, ventas, cola sin conexión), depósito (racks y stock por producto), servicio técnico (bancos y retiro) y muelle. Panel lateral con enlaces a cada módulo. | React Three Fiber (2D: plano SVG) |
| **3 · Pieza** | El recorrido de un SKU por las sucursales o la historia de una máquina por número de serie. | Sobre el mapa |

Las transiciones: el mapa vuela al nodo, el brillo del nodo cubre la escena y se funde mientras la cámara del taller baja; la vuelta es el camino inverso.

---

## Código

```
src/forja/
  dominio/            Puro (sin React ni IO), con tests en tests/unit/forja.test.ts
    calor.ts          Escala de calor (OKLab) y calor relativo de una sucursal
    modelo.ts         Red, taller y eventos del día desde el estado de Yunque (a cualquier hora)
    plano.ts          Plano de planta de una sucursal (lo usan el 3D y el 2D)
    pieza.ts          Recorrido de un SKU e historia de una máquina
    repeticion.ts     Tramo del día, velocidades, titulares de la sala de control
    activacion.ts     Cronograma de la activación y cuándo mostrarla
    geo.ts, constelacion.ts, simulador.ts, simulacion-operaciones.ts
  datos/
    fuente.ts         FuenteForja: lo que necesita la escena, venga de donde venga
    usar-forja-app.ts La fuente dentro de la app (réplica local + simulador si la empresa es demo)
    mundo-demo.ts     La fuente de las demos públicas (snapshot + reloj de demo + simulador)
  ui/
    universo.tsx      La escena: niveles, transiciones, encabezado, sala, repetición
    red/              Mapa 3D (MapLibre + deck.gl) y 2D (SVG), nodos, tarjetas, transferencias
    taller/           Taller 3D (R3F), plano 2D, panel lateral, barra de zonas, etiquetas
    pieza/            Panel del nivel 3 y cómo se marca el mapa
    activacion/       Escena 3D de la activación, capa del DOM y sonido (Web Audio)
    linea-tiempo.tsx, sala-control.tsx, modo-2d.ts, store.ts (zustand)
```

**Una sola interfaz, varias fuentes.** `FuenteForja` trae la red, la red a otra hora (repetición), los eventos del día, el taller de una sucursal, la pieza, los sellos y los enlaces. La app la arma desde la réplica local de Yunque (`universo-app.tsx`); las demos públicas, desde un snapshot (`demo-publica.tsx`). La escena no sabe de dónde vienen los datos.

**Los mismos datos en 3D y en 2D.** El modelo (`modelo.ts`), el plano (`plano.ts`) y la pieza (`pieza.ts`) son puros; la versión 3D y la 2D los dibujan igual y comparten nodos, tarjetas, paneles y barra de zonas.

---

## Datos, permisos y tiempo real

- **Quién ve qué**: dueño y administración ven toda la red; otra persona, si tiene el permiso extra `forja.ver`, solo sus sucursales. El modelo recibe las sucursales permitidas y no arma nada fuera de ellas.
- **Lecturas en Supabase** (migración `20261010000900_forja.sql`): `forja_red`, `forja_sucursal` y `forja_pieza` son funciones `security invoker` que además exigen `forja.ver` en cada sucursal; la vista de transferencias en tránsito tiene `security_invoker = true`.
- **Tiempo real**: triggers sobre ventas, movimientos de stock, transferencias y órdenes de servicio emiten por **Broadcast** a canales privados **por sucursal** (`org:{org_id}:suc:{sucursal_id}`), solo si la empresa tiene Forja activa. Una política RLS sobre `realtime.messages` autoriza cada canal solo a quien tiene `forja.ver` en esa sucursal. Nunca hay un canal por organización.
- **Tests de aislamiento** (`tests/rls/forja.test.ts`): otra organización y otra sucursal sin permiso no ven nada, ni por las funciones, ni por la vista, ni por los canales; con control negativo.
- **Operaciones nuevas** (las de Forja pasan por el mismo motor que el resto): `transferencia.despachar`, `transferencia.recibir`, `extension.activar`, `usuario.preferencia`.

## Demos públicas

- `/forja` (empresa de demostración, sello DEMO) y `/demo/<prospecto>/forja` (sello PROPUESTA): sin sesión ni base. Un **snapshot del seed** (`npm run snapshot-forja` → `src/demo/*.json`) en memoria, un **reloj de demo** que arranca en el momento del snapshot y el **simulador en el navegador** aplicando operaciones con el reductor de Yunque.
- Los snapshots de prospectos no guardan nombres: los pone su configuración (`src/config/clientes/<prospecto>.ts` → `forja`), que también define sus sucursales (reales o DEMO), lo que falta (`[COMPLETAR]`) y desde qué orígenes se puede embeber.
- **Embebible solo esa ruta**: `frame-ancestors 'self'` + los orígenes de la configuración, sin `X-Frame-Options`. El resto del sitio, `frame-ancestors 'none'`.
- **Sumar un prospecto**: agregar `forja` a su configuración, correr `npm run snapshot-forja` y `npm run grabar-forja -- <slug>`.

## Videos

`npm run build && npm run grabar-forja`: Chromium con GPU, cuadro a cuadro con el reloj de la página en pausa (60 fps exactos), H.264 con `ffmpeg-static`. En modo `?grabar` el simulador se detiene y el guion pide los eventos: las tomas salen siempre iguales.

- `public/demo/forja.mp4` — genérica (sitio e `/inversores`).
- `public/demo/forja-<prospecto>.mp4` — para la presentación de cada prospecto.

---

## Rendimiento

- Three.js, MapLibre y deck.gl se cargan **solo en Forja** y por separado: el mapa al entrar, el taller 3D al entrar a una sucursal, la escena de activación al acercarse a "Activar". En 2D no se descarga nada de eso (verificado en e2e).
- Instancing para racks, bloques de stock y chispas (un solo dibujo); partículas de polvo en un solo `points`.
- El taller dibuja **a demanda** (`frameloop="demand"`): solo mientras algo se mueve (cámara, chispas, golpes, bultos, la baliza de un puesto sin conexión).
- `dpr` adaptativo según el rendimiento medido; el mapa con `pixelRatio` acotado.
- Con la pestaña oculta no se anima ni se simula.
- **Pérdida del contexto WebGL**: el taller pasa al plano 2D, el mapa a la versión 2D y la activación a su versión quieta, sin trabar nada.

## Versión 2D

Automática con `prefers-reduced-motion`, menos de 4 núcleos, ahorro de datos o sin WebGL2; también a mano con el interruptor 2D/3D (se recuerda en el navegador). Mapa SVG y plano de planta con los mismos datos e interacciones.

## Accesibilidad

- Nodos, zonas, transferencias y filas de los paneles son botones o enlaces reales: se recorren con Tab y con las flechas (nodos de la red y barra de zonas), con contorno `--temple` en el foco.
- Cada nodo tiene una descripción completa (calor, ventas de hoy, stock crítico); cada zona, su resumen; la línea de tiempo es un control deslizante con la hora como texto.
- Los eventos importantes del día se anuncian a lectores de pantalla (región en vivo, sin saturar).
- Esc cierra el panel y después vuelve un nivel. La activación se salta con Esc o Enter.
- Movimiento reducido: versión 2D, activación quieta, sin pulsos ni estelas.

## Qué falta

- **Conectar a Supabase**: la app corre en modo demo; las funciones `forja_*` y los canales están listos y probados, falta el adaptador de la fuente que los use.
- **Números de serie en compras y ventas** (hoy la historia de una máquina tiene sus reparaciones y las ventas que coinciden por cliente, marca y tipo).
- **Datos reales del prospecto**: sucursales, direcciones y negocios (`[COMPLETAR]` en su configuración).
- **Precio** de la extensión (`src/config/precios.ts`, se muestra "Consultá").
