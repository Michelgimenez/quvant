# Quvant — hoja de ruta: de demo a producción

> Fuente de las etapas: `src/config/hoja-de-ruta.ts` (la usan también la presentación para inversores y la
> demo comercial). Estado de cada función: `src/showcase/features.ts`. Al terminar o cambiar una función,
> actualizar los tres (regla de `CLAUDE.md`).

## Dónde estamos (octubre 2026)

**Demo funcional / piloto. Primer piloto en negociación. Sin clientes pagando.**

- **Disponible** (funciona en la demo con el motor real): inventario multisucursal, escaneo con cámara, conteos, transferencias, compras, importador Excel/CSV, mostrador con y sin conexión, presupuestos y conversión a venta, clientes y cuentas corrientes, entregas, caja, listas de precios, aumento masivo de precios, servicio técnico, tablero multinegocio, reportes, co-branding ("tu marca adentro"), módulos a medida, roles y permisos, auditoría, aislamiento entre empresas, página de estado.
- **En demo** (se ve completo, con una parte emulada): cobro con Mercado Pago, avisos por WhatsApp, doble factor (autenticador emulado), copias y exportación (la exportación funciona; faltan copias de producción y restauración probada).
- **Próximamente**: factura electrónica ARCA, Mercado Libre, app de depósito, migración asistida.

## Quvant: el renombre y la identidad nueva (en curso, rama `quvant`)

El sistema que se llamaba Yunque pasa a llamarse **Quvant** y se abre del kiosco a la empresa grande, con la identidad del manual (`referencias/Quvant-manual-de-identidad.pdf`). Son 10 tandas (`PROMPT-QUVANT.md`). No cambia ninguna funcionalidad: los estados de `src/showcase/features.ts` siguen iguales.

- **Tanda 1 · La marca en el sistema — hecha (20/10/2026).** Logos y sus versiones, tokens de color con modo claro y estados, Michroma e IBM Plex Mono con estilos cerrados, la grilla, el salto (que reemplaza a la chispa como recompensa) y la lámina del sistema aplicado. Logotipo QUVANT provisorio hasta el archivo oficial.
- **Tanda 2 · El renombre y la app — hecha.** Quvant en todo lo visible, el titular A por defecto, los componentes base y la app con la identidad nueva; el material viejo de Forja, oculto.
- **Tanda 3 · Las cuatro empresas y la demo — hecha.** `/demo` con el kiosco, la ferretería, la distribuidora y el grupo: datos con semilla, simulador del día, tableros por escala y el selector.
- **Tanda 4 · El cambio de empresa — hecha.** El salto entre tarjetas, los logos, el barrido circular, Flip en la barra lateral y los números que ruedan.
- **Tanda 5 · El kiosco y la ferretería por dentro — hecha.** Mostrador táctil con favoritos y lector, sin conexión, fiado, cierre de caja con el salto; presupuesto → venta, transferencias y servicio técnico.
- Tandas 6 a 10: la distribuidora, el grupo y el recorrido guiado; el sitio; las presentaciones y los videos; Forja con la marca nueva.

## Etapas

### 1 · Arquitectura y seguridad auditadas — *siguiente*
Revisión externa de arquitectura, RLS, secretos, backups con restauración probada y pruebas de penetración. Conexión real a Supabase en un entorno de staging.
- Completar `public.aplicar_operacion()` con los 26 tipos de operación que faltan (hoy 7 de 33) y una cuarentena para operaciones que nunca se aceptan.
- Adaptador `ServidorSupabase` en el cliente y carga inicial desde la base.
- Correr los tests de RLS contra la instancia real; CI con `npm run verificar` + e2e.
- CSP con nonces o hashes; revocación de sesiones; códigos de recuperación del 2FA; borrar datos locales al salir en equipos compartidos.
- Backups + PITR y **restauración probada**. Ver la lista completa en [`SEGURIDAD.md`](SEGURIDAD.md).

### 2 · Facturación electrónica con ARCA
Certificado, WSFE, facturas A y B, notas de crédito y contingencia sin conexión (la venta sin conexión ya existe: falta autorizar el comprobante al volver). Se implementa detrás de la interfaz `Facturador` que hoy usa el emulado.

### 3 · Migraciones
Conectores para los sistemas más usados del rubro, sobre el importador de Excel/CSV que ya existe (detección de columnas, números argentinos, validación por fila, vista previa).

### 4 · App de depósito
Picking, recepción y conteos con lector, pensada para el celular del depósito. Hoy el depósito usa la app web adaptada al celular.

### 5 · Integraciones
Mercado Pago, Mercado Libre y WhatsApp Business conectados de verdad (hoy emulados detrás de interfaces en `src/integraciones/`).

## Forja (extensión visual): lista en demo

Forja convierte los datos de Quvant en un taller conectado: las sucursales en un mapa, cada una por dentro en 3D, y la jornada que se puede reproducir. Hecha por fases (detalle en [`docs/FORJA.md`](FORJA.md)):

1. **Base** ✔︎ — token `--superficie`, paleta de calor, modelo de datos (ubicación de sucursales, transferencias en tránsito, extensiones por empresa, preferencias, permisos extra por persona), lecturas SQL con RLS, canales en vivo por sucursal, simulador para la demo y tests de aislamiento.
2. **Red en el mapa** ✔︎ — MapLibre + deck.gl, nodos con calor y stock crítico, transferencias animadas, tarjetas y constelación.
3. **Taller isométrico 3D por sucursal** ✔︎ — mostrador, depósito, servicio técnico y muelle desde los datos de Quvant, panel lateral con enlaces a cada módulo y transición de cámara desde el mapa.
4. **Línea de tiempo del día y modo sala de control** ✔︎ — repetición a 1×, 60×, 600× o 1200× con la red reconstruida a cada hora, y recorrido de 20 s por sucursal con titulares para una TV.
5. **Animación de activación y página de extensiones** ✔︎ — el yunque se convierte en forja (4,5 s, se puede saltar, queda guardada por persona) y versión quieta para movimiento reducido.
6. **Recorrido de una pieza** ✔︎ — el camino de un SKU por las sucursales (arcos, stock y movimientos con saldo) y la historia de una máquina por número de serie, desde el buscador ⌘K o el taller.
7. **Versión 2D completa** ✔︎ — mapa SVG y plano de planta con los mismos datos e interacciones, automática con movimiento reducido o equipos modestos y elegible a mano; no descarga nada de 3D.
8. **Demo pública, videos, sitio y presentación** ✔︎ — `/forja` y la propuesta embebible para Ferremix (sin base: snapshot del seed y simulador en el navegador), dos videos de 46 s, la sección del sitio y la escena de `/inversores`.
9. **Rendimiento, accesibilidad y documentación** ✔︎ — taller a demanda, `dpr` adaptativo, pérdida de contexto WebGL resuelta, teclado entre nodos y zonas, anuncios para lectores de pantalla y `docs/FORJA.md`.

Lo que sigue con Forja: conectarla a Supabase (las funciones `forja_*` y los canales por sucursal ya están), los datos reales del prospecto y el precio de la extensión.

## Cómo empieza un negocio (implementación)

1. **Relevamiento** — cómo trabajan hoy: sistema, precios, stock y sucursales.
2. **Migración** — productos, precios, clientes y saldos desde su sistema o planillas.
3. **Piloto en una sucursal** — mostrador y stock en paralelo, con acompañamiento.
4. **Puesta en marcha** — todas las sucursales y módulos, con capacitación.

## Pendientes del producto que no son una etapa

- Performance del sitio en celular (Lighthouse simulado 77–89; objetivo ≥ 90).
- Completar los `[COMPLETAR]` de la presentación (mercado con fuente, hallazgos del terreno, monto, equipo, contacto) y de la demo de Ferremix (categorías, problemas, sucursales).
- Comparar con el proyecto de Ferremix cuando haya acceso e integrar lo mejor de ese código.
- Aprobación intermedia en el cierre de conteos si un cliente la pide.
- Registrar el número de serie en compras y ventas de máquinas: hoy la historia de una máquina (Forja, nivel 3) solo tiene reparaciones y ventas que coinciden por cliente, marca y tipo.
- Panel interno (`/panel`): usuarios individuales del equipo en lugar de una clave compartida, registro de quién contactó cada solicitud y aviso de privacidad en el formulario "Pedir una demo".
