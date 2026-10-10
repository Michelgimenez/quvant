# Yunque — hoja de ruta: de demo a producción

> Fuente de las etapas: `src/config/hoja-de-ruta.ts` (la usan también la presentación para inversores y la
> demo comercial). Estado de cada función: `src/showcase/features.ts`. Al terminar o cambiar una función,
> actualizar los tres (regla de `CLAUDE.md`).

## Dónde estamos (octubre 2026)

**Demo funcional / piloto. Primer piloto en negociación. Sin clientes pagando.**

- **Disponible** (funciona en la demo con el motor real): inventario multisucursal, escaneo con cámara, conteos, transferencias, compras, importador Excel/CSV, mostrador con y sin conexión, presupuestos y conversión a venta, clientes y cuentas corrientes, entregas, caja, listas de precios, aumento masivo de precios, servicio técnico, tablero multinegocio, reportes, co-branding ("tu marca adentro"), módulos a medida, roles y permisos, auditoría, aislamiento entre empresas, página de estado.
- **En demo** (se ve completo, con una parte emulada): cobro con Mercado Pago, avisos por WhatsApp, doble factor (autenticador emulado), copias y exportación (la exportación funciona; faltan copias de producción y restauración probada).
- **Próximamente**: factura electrónica ARCA, Mercado Libre, app de depósito, migración asistida.

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

## Forja (extensión visual): en construcción

Forja convierte los datos de Yunque en un taller conectado: las sucursales en un mapa, cada una por dentro en 3D, y la jornada que se puede reproducir. Plan por fases (detalle en `docs/FORJA.md` cuando esté completa):

1. **Base** ✔︎ — token `--superficie`, paleta de calor, modelo de datos (ubicación de sucursales, transferencias en tránsito, extensiones por empresa, preferencias, permisos extra por persona), lecturas SQL con RLS, canales en vivo por sucursal, simulador para la demo y tests de aislamiento.
2. Red en el mapa (MapLibre + deck.gl) y constelación.
3. Taller isométrico 3D por sucursal.
4. Línea de tiempo del día y modo sala de control.
5. Animación de activación y página de extensiones.
6. Recorrido de una pieza (SKU o máquina).
7. Versión 2D completa (movimiento reducido y equipos modestos).
8. Demo pública para Ferremix, videos, sitio y presentación.
9. Rendimiento, accesibilidad y documentación.

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
- Panel interno (`/panel`): usuarios individuales del equipo en lugar de una clave compartida, registro de quién contactó cada solicitud y aviso de privacidad en el formulario "Pedir una demo".
