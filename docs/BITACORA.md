# Bitácora para aprender

Una idea por tanda, en pocas líneas y con un ejemplo del código.

## Tanda 1 · Tokens en capas: cambiar la marca entera sin tocar los componentes

Un *token* es un nombre para una decisión de diseño ("el fondo", "el texto secundario") en vez de un color suelto. En `src/app/globals.css` hay tres capas:

1. **La marca**, fija: `--negro: #0d0d0f`, `--acero: #9c9ca3`.
2. **Lo semántico**, que cambia con el tema: en `.dark`, `--muted-foreground: var(--acero)`; en claro, `--muted-foreground: var(--gris-6)`, porque el acero sobre blanco no llega a AA.
3. **Tailwind** los expone como clases: `--color-muted-foreground: var(--muted-foreground)` → `text-muted-foreground`.

Un componente escribe `className="text-muted-foreground"` y nunca sabe si es acero o gris-6. Por eso Yunque pudo pasar a Quvant en esta tanda cambiando un solo archivo. Los tokens viejos quedaron como alias (`--temple: var(--blanco)` en oscuro) para que nada se rompa, y en la tanda 2 se reemplazan componente por componente.

El mismo truco tiene una trampa, y vale la pena saberla. Si `--serie-1: var(--marca)` se define en `<html>`, el navegador lo resuelve ahí, con el `--marca` de `<html>`. Cuando el AppShell cambia `--marca` en un elemento de más abajo, `--serie-1` no se entera: ya llegó resuelto. Para que un token siga a otro, hay que definirlo en el mismo elemento donde cambia el de origen (queda para la tanda 2).

## Tanda 2 · Un renombre que no rompe nada: textos, claves y lo que no se toca

Cambiar el nombre de un producto tiene tres capas, y cada una pide un cuidado distinto:

1. **Lo que ve la gente** (títulos, metadatos, mails): se cambia sin miedo.
2. **Las claves internas** (`localStorage`, cookies, nombres de base local): si cambian, el navegador "olvida" lo guardado. En una demo es aceptable, así que pasaron a `quvant:`. En producción, lo prudente es leer la clave vieja como respaldo un tiempo, como se hizo con la variable de entorno:

   ```ts
   (process.env.QUVANT_PERMITIR_SECRETO_DEV ?? process.env.YUNQUE_PERMITIR_SECRETO_DEV) !== "1"
   ```

3. **Lo que ya está aplicado afuera** (las migraciones de la base): no se edita nunca. Una migración aplicada es historia; cambiarla hace que la base real y el repo dejen de coincidir.

El reemplazo automático tuvo un efecto inesperado que vale recordar: `yunque-app` también transformó `yunque-app-icon` en `quvant-app-icon`, un archivo que no existe. Por eso, después de un reemplazo masivo, conviene comprobar que cada ruta a un archivo siga existiendo (eso se hizo y se corrigió).

## Tanda 3 · Un simulador que es una función del tiempo

La demo tiene que verse viva (una venta del kiosco cada pocos segundos) y, a la vez, salir **siempre igual**, para poder filmarla cuadro por cuadro. La solución es no "tirar dados" en cada tic del reloj: el tiempo desde la ancla se parte en ranuras, y cada ranura decide con un hash si hay evento y de qué tipo.

```ts
const k = Math.floor((t - ANCLA_MS) / ritmo.cada)        // la ranura de este momento
if (u01(semilla, "hay", k) > 0.86) return null            // ¿hay evento en esta ranura?
const tipo = elegirPonderado(u01(semilla, "tipo", k), ritmo.tipos)
```

Así, `eventosEntre(desde, hasta)` devuelve lo mismo si se lo pide en vivo, al volver a una empresa o en el cuadro 1.234 de un video. No hay estado escondido: el tablero es una función de (datos generados, momento, lo que hizo el visitante). El mismo truco sirve para el stock del grupo: `stockGrupo(producto, sucursal)` es un hash, así 25.000 productos × 40 sucursales no ocupan un millón de filas en memoria.

## Tanda 4 · Flip: animar un cambio de layout que React ya hizo

La técnica FLIP (First, Last, Invert, Play) anima algo que en realidad cambió de golpe:

1. **First:** antes del cambio se guarda dónde estaba cada cosa: `Flip.getState(elementos)`.
2. **Last:** React cambia el estado (con `flushSync`, para que el DOM nuevo exista ya).
3. **Invert y Play:** a cada elemento nuevo con el mismo `data-flip-id` se le aplica una transformación que lo devuelve a su lugar viejo, y se la anima hasta cero.

```ts
const antes = Flip.getState(escena.querySelectorAll("[data-flip-id^='nav-']"))
flushSync(() => elegirEmpresa(id))                       // React cambia la barra lateral
Flip.from(antes, { targets: escena.querySelectorAll("[data-flip-id^='nav-']"), duration: 0.6,
  onEnter: (nuevos) => gsap.fromTo(nuevos, { opacity: 0, x: -10 }, { opacity: 1, x: 0 }) })
```

El ojo ve que "Inventario" se movió de lugar, aunque React lo borró y lo volvió a dibujar. Lo que sale no tiene contra qué compararse: por eso se saca una foto del estado viejo (un clon del DOM) y se lo deja debajo, apagándose, mientras el barrido revela lo nuevo.

Una trampa que apareció: los pasos que se agregan a una línea de tiempo *mientras corre* (en la caída del punto) se ubicaban al final de la línea, que ya estaba estirada por un paso de limpieza. Por eso, adentro de esos callbacks las posiciones van en tiempos absolutos (`t0 = tl.time()`).
