# Bitácora para aprender

Una idea por tanda, en pocas líneas y con un ejemplo del código.

## Tanda 1 · Tokens en capas: cambiar la marca entera sin tocar los componentes

Un *token* es un nombre para una decisión de diseño ("el fondo", "el texto secundario") en vez de un color suelto. En `src/app/globals.css` hay tres capas:

1. **La marca**, fija: `--negro: #0d0d0f`, `--acero: #9c9ca3`.
2. **Lo semántico**, que cambia con el tema: en `.dark`, `--muted-foreground: var(--acero)`; en claro, `--muted-foreground: var(--gris-6)`, porque el acero sobre blanco no llega a AA.
3. **Tailwind** los expone como clases: `--color-muted-foreground: var(--muted-foreground)` → `text-muted-foreground`.

Un componente escribe `className="text-muted-foreground"` y nunca sabe si es acero o gris-6. Por eso Yunque pudo pasar a Quvant en esta tanda cambiando un solo archivo. Los tokens viejos quedaron como alias (`--temple: var(--blanco)` en oscuro) para que nada se rompa, y en la tanda 2 se reemplazan componente por componente.

El mismo truco tiene una trampa, y vale la pena saberla. Si `--serie-1: var(--marca)` se define en `<html>`, el navegador lo resuelve ahí, con el `--marca` de `<html>`. Cuando el AppShell cambia `--marca` en un elemento de más abajo, `--serie-1` no se entera: ya llegó resuelto. Para que un token siga a otro, hay que definirlo en el mismo elemento donde cambia el de origen (queda para la tanda 2).
