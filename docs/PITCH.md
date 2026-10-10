# Yunque — guion de la presentación para inversores

> Para quien presenta. Acompaña a `/inversores` (12 escenas). Todo lo que dice `[COMPLETAR]` también aparece
> así, resaltado, en la presentación: completarlo en `src/config/` antes de mostrarla.
> Regla: ningún número sin fuente, ningún cliente que no lo sea.

**Cómo usarla.** Entrar a `/inversores` con la clave (`INVERSORES_KEY`). Avanzar con → o la rueda; **P** reproduce
sola (2 min 26 s a 1×), **H** oculta controles y cursor, **R** reinicia, **1/2/3** cambia la velocidad
(0,75× / 1× / 1,25×), **F** pantalla completa, `#N` en la URL va a la escena N. Hablando, la presentación
dura unos **10 minutos**; conviene pausar (P) en las escenas 5 y 6, que son demos en vivo.

---

## 1 · Apertura (6 s)
**En pantalla:** el yunque se arma, salta la chispa, "yunque", "Presentación para inversores · 2026".
**Decir:** "Yunque es el sistema de gestión para negocios con stock complejo que no se cae. Firme, aunque todo se mueva."

## 2 · El problema (11 s)
**En pantalla:** "Miles de negocios en Argentina gestionan millones en stock con sistemas antiguos." Tres datos de mercado y cinco dolores.
**Decir:** "Ferreterías industriales, corralones, distribuidores de maquinaria: manejan miles de artículos y varias sucursales con sistemas de escritorio instalados en una PC. Si se corta internet o se cae el servidor, se frena la venta. Actualizar precios lleva un día. Los presupuestos se pierden en WhatsApp."
**Completar:** `src/config/inversores.ts` → `MERCADO.datos`:
- `[COMPLETAR con dato y fuente]` ferreterías, corralones y casas de repuestos en Argentina.
- `[COMPLETAR con dato y fuente]` distribuidores de maquinaria y herramientas.
- `[COMPLETAR con dato y fuente]` negocios del rubro con sistemas de escritorio o planillas.

## 3 · Lo que vimos en el terreno (11 s)
**En pantalla:** "Ferretería industrial, zona oeste de Buenos Aires" (anonimizada) y cinco hallazgos.
**Decir:** "No lo imaginamos: lo vimos. Relevamos el sitio y el sistema de una ferretería industrial de zona oeste."
**Completar:** `TERRENO.hallazgos` (sistema de gestión, precios y listas, stock y sucursales, presupuestos y clientes, sitio web) y `TERRENO.conclusion`. Sin nombre del negocio.

## 4 · La solución (11 s)
**En pantalla:** "Yunque: el sistema de gestión en la nube para negocios con stock complejo, que sigue vendiendo aunque se corte internet." Cinco pilares —stock, ventas, precios, servicio técnico, multinegocio— con la cantidad de funciones **disponibles** de cada uno (sale del registro `src/showcase/features.ts`).
**Decir:** "Todo lo que hoy está en cinco lugares distintos, en uno. En la nube, pero el mostrador no depende de internet."

## 5 · Demo del producto (24 s, pausar)
**En pantalla:** la app real sobre la empresa demo (sello DEMO), con un cursor que vende en el mostrador, escanea una máquina con el celular (stock por sucursal) y convierte un presupuesto en venta (chispa).
**Decir:** "Esto no es un video: es el producto corriendo. La venta recibe su número definitivo cuando se sincroniza; el presupuesto aceptado pasa a venta con un clic."

## 6 · El diferencial (15 s, pausar)
**En pantalla:** el mostrador y "la nube" lado a lado. Se corta internet, el mostrador sigue vendiendo con su cola, vuelve la conexión y todo se sincroniza solo.
**Decir:** "Este es el diferencial. Cada puesto tiene su base local. Sin internet se sigue vendiendo; al volver, se sincroniza con reglas claras para los conflictos: una venta nunca se pierde, el stock se mueve por diferencias, un presupuesto no se convierte dos veces."

## 7 · Modelo de negocio (13 s)
**En pantalla:** licencia mensual por negocio (USD 290, desde `src/config/precios.ts`) + implementación cotizada por negocio. Barras de un **escenario ilustrativo** calculado con `proyectar(SUPUESTOS)` de `src/config/proyecciones.ts`, con sus supuestos a la vista.
**Decir:** "Ingreso recurrente: negocios activos por licencia. Esto es un escenario con supuestos editables, no un pronóstico; los supuestos están en pantalla."
**Completar:** validar `SUPUESTOS.implementacionPromedioUSD` (hoy `[COMPLETAR: validar con el primer piloto]`), la tasa de bajas y el ritmo de negocios nuevos.

## 8 · Estado actual (12 s)
**En pantalla:** "Demo funcional. Primer piloto en negociación." "Todavía no hay clientes pagando." Funciones por estado (disponible / en demo / próximamente) desde el registro.
**Decir:** "Con honestidad: hoy es una demo funcional completa. Las integraciones de pago, facturación y WhatsApp están emuladas detrás de interfaces. El primer piloto está en negociación."

## 9 · Hoja de ruta (12 s)
**En pantalla:** cinco etapas de demo a producción (de `src/config/hoja-de-ruta.ts`): arquitectura y seguridad auditadas → facturación electrónica ARCA → migraciones → app de depósito → integraciones reales.
**Decir:** "Lo primero no es sumar funciones: es auditar arquitectura y seguridad y conectar la base real. Después, lo que exige el mercado argentino: facturación con ARCA."

## 10 · Para qué es la inversión (12 s)
**En pantalla:** "Buscamos `[COMPLETAR monto]`" y el destino: seguridad y arquitectura 25 %, equipo de desarrollo 40 %, implementación de pilotos 20 %, ventas 15 % (preliminar).
**Completar:** `src/config/inversion.ts` → `montoTexto`, porcentajes definitivos y `nota`.

## 11 · Equipo (9 s)
**En pantalla:** tarjetas con foto, rol y bio.
**Completar:** `EQUIPO` en `src/config/inversion.ts`: `[COMPLETAR: Michel y socio, roles y fotos]` — rol de Michel, nombre y rol del socio, bios cortas y fotos (en `public/`).

## 12 · Cierre (10 s)
**En pantalla:** el yunque, "Firme, aunque todo se mueva." y el contacto.
**Decir:** "Gracias. Si quieren verlo funcionando en su negocio, lo armamos con su marca."
**Completar:** `CONTACTO_INVERSORES` en `src/config/inversion.ts` (nombre, email, teléfono).

---

## Preguntas probables (respuestas honestas)

- **¿Cuántos clientes tienen?** Ninguno pagando. Un piloto en negociación.
- **¿Qué está listo?** La escena 8 lo muestra en vivo desde el registro de funciones.
- **¿Qué pasa con la facturación electrónica?** Hoy está emulada detrás de una interfaz; ARCA es la etapa 2.
- **¿Es seguro?** Aislamiento entre empresas con RLS probado con tests, escrituras solo por una función con permisos, auditoría de solo agregar y doble factor exigido en la base. Falta la auditoría externa (etapa 1). Detalle en `docs/SEGURIDAD.md`.
- **¿Por qué no se cae?** Local-first: cada mostrador vende contra su base local y sincroniza operaciones. Detalle en `docs/ARQUITECTURA.md`.

## Anexo · demo comercial para un prospecto

`/demo/<cliente>` (hoy `/demo/ferremix`): 7 escenas, unos 6 minutos a 1×, con la marca del prospecto y el sello
`PROPUESTA`. Guion: su problema (del relevamiento) → su marca en la app → un día en su negocio → el corte de
conexión → cómo empezamos → socio fundador. Siempre "así se vería Yunque en …", nunca como cliente.
Para sumar un prospecto: `src/config/clientes/_plantilla.ts`.
