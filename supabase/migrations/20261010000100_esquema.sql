-- ════════════════════════════════════════════════════════════════════
-- Yunque · 0001 · Esquema multiempresa
--
-- Reglas:
--  * Toda tabla de negocio tiene org_id.
--  * Las relaciones usan claves foráneas COMPUESTAS (org_id, id): una fila
--    nunca puede apuntar a datos de otra organización, aunque el código falle.
--  * Importes en centavos (bigint). Cantidades numeric(14,3).
--  * Los clientes NO escriben directo en estas tablas: todas las escrituras
--    pasan por app.aplicar_operacion() (ver 0005), que valida permisos.
-- ════════════════════════════════════════════════════════════════════

create schema if not exists app;

-- ───────────── Organizaciones, negocios, sucursales ─────────────

create table public.organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(nombre) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  logo_url text check (logo_url is null or length(logo_url) <= 2048),
  logo_negativo_url text check (logo_negativo_url is null or length(logo_negativo_url) <= 2048),
  color_acento text not null default '#3466F0' check (color_acento ~ '^#[0-9A-Fa-f]{6}$'),
  modulos jsonb not null default '{"inventario":true,"precios":true,"mostrador":true,"presupuestos":true,"servicio":true,"clientes":true,"compras":true,"entregas":true,"reportes":true}',
  es_demo boolean not null default false,
  creada_en timestamptz not null default now()
);

create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 120),
  rubro text not null default '',
  cuit text not null default '' check (cuit = '' or cuit ~ '^\d{2}-\d{8}-\d$'),
  unique (org_id, id)
);

create table public.sucursales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  negocio_id uuid not null,
  nombre text not null check (length(nombre) between 1 and 120),
  codigo text not null check (codigo ~ '^[A-Z0-9]{2,4}$'),
  direccion text not null default '',
  puestos smallint not null default 1 check (puestos between 1 and 50),
  unique (org_id, id),
  unique (org_id, codigo),
  foreign key (org_id, negocio_id) references public.negocios (org_id, id) on delete cascade
);

-- ───────────── Miembros (usuarios de cada organización) ─────────────

create table public.miembros (
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 120),
  email text not null,
  rol text not null check (rol in ('dueno', 'administracion', 'mostrador', 'deposito', 'tecnico', 'compras')),
  -- null = todas las sucursales
  sucursales uuid[],
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index miembros_user_idx on public.miembros (user_id) where activo;

-- ───────────── Catálogo ─────────────

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 80),
  ilustracion text not null default 'tornillo',
  unique (org_id, id),
  unique (org_id, nombre)
);

create table public.marcas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 80),
  unique (org_id, id),
  unique (org_id, nombre)
);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 120),
  cuit text not null default '',
  contacto text not null default '',
  telefono text not null default '',
  email text not null default '',
  dias_entrega smallint not null default 3 check (dias_entrega between 0 and 365),
  unique (org_id, id)
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sku text not null check (length(sku) between 1 and 40),
  codigo_barras text not null default '' check (codigo_barras ~ '^[0-9]{0,14}$'),
  nombre text not null check (length(nombre) between 1 and 200),
  categoria_id uuid not null,
  marca_id uuid not null,
  proveedor_id uuid not null,
  unidad text not null default 'u' check (unidad in ('u', 'm', 'kg', 'l', 'caja')),
  -- Costo de reposición sin IVA. Columna protegida: no se otorga SELECT a authenticated (ver 0003).
  costo bigint not null default 0 check (costo >= 0),
  iva numeric(4, 1) not null default 21 check (iva in (21, 10.5)),
  ilustracion text not null default 'tornillo',
  activo boolean not null default true,
  actualizado_en timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, sku),
  foreign key (org_id) references public.organizaciones (id) on delete cascade,
  foreign key (org_id, categoria_id) references public.categorias (org_id, id),
  foreign key (org_id, marca_id) references public.marcas (org_id, id),
  foreign key (org_id, proveedor_id) references public.proveedores (org_id, id)
);
create index productos_codigo_barras_idx on public.productos (org_id, codigo_barras) where codigo_barras <> '';

create table public.listas_precios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 60),
  margen_sugerido numeric(6, 2) not null default 40,
  es_default boolean not null default false,
  unique (org_id, id)
);
create unique index listas_precios_default_idx on public.listas_precios (org_id) where es_default;

create table public.precios (
  org_id uuid not null,
  producto_id uuid not null,
  lista_id uuid not null,
  -- Precio final IVA incluido, en centavos.
  precio bigint not null check (precio >= 0),
  actualizado_en timestamptz not null default now(),
  primary key (lista_id, producto_id),
  foreign key (org_id, producto_id) references public.productos (org_id, id) on delete cascade,
  foreign key (org_id, lista_id) references public.listas_precios (org_id, id) on delete cascade
);

-- ───────────── Stock ─────────────

create table public.stock (
  org_id uuid not null,
  sucursal_id uuid not null,
  producto_id uuid not null,
  cantidad numeric(14, 3) not null default 0,
  minimo numeric(14, 3) not null default 0 check (minimo >= 0),
  ubicacion text not null default '',
  actualizado_en timestamptz not null default now(),
  primary key (sucursal_id, producto_id),
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id) on delete cascade,
  foreign key (org_id, producto_id) references public.productos (org_id, id) on delete cascade
);

create table public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sucursal_id uuid not null,
  producto_id uuid not null,
  tipo text not null check (tipo in ('venta', 'anulacion', 'compra', 'ajuste', 'conteo', 'transferencia_salida', 'transferencia_entrada', 'servicio', 'inicial')),
  cantidad numeric(14, 3) not null,
  ref_id uuid,
  motivo text not null default '',
  usuario_id uuid,
  fecha timestamptz not null default now(),
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id) on delete cascade,
  foreign key (org_id, producto_id) references public.productos (org_id, id) on delete cascade
);
create index movimientos_stock_producto_idx on public.movimientos_stock (sucursal_id, producto_id, fecha desc);

-- ───────────── Clientes y cuentas corrientes ─────────────

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  nombre text not null check (length(nombre) between 1 and 160),
  cuit text not null default '',
  condicion_iva text not null default 'CF' check (condicion_iva in ('RI', 'MT', 'CF', 'EX')),
  telefono text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  direccion text not null default '',
  lista_id uuid not null,
  limite_credito bigint not null default 0 check (limite_credito >= 0),
  notas text not null default '',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id) references public.organizaciones (id) on delete cascade,
  foreign key (org_id, lista_id) references public.listas_precios (org_id, id)
);

create table public.movimientos_cuenta (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  cliente_id uuid not null,
  fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('venta', 'pago', 'nota_credito', 'ajuste')),
  -- Positivo = debe; negativo = haber.
  importe bigint not null,
  ref_id uuid,
  descripcion text not null default '',
  foreign key (org_id, cliente_id) references public.clientes (org_id, id) on delete cascade
);
create index movimientos_cuenta_cliente_idx on public.movimientos_cuenta (cliente_id, fecha desc);

-- ───────────── Ventas ─────────────

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  negocio_id uuid not null,
  sucursal_id uuid not null,
  puesto smallint not null default 1,
  numero bigint,
  numero_local text not null,
  fecha timestamptz not null,
  cliente_id uuid,
  lista_id uuid not null,
  total bigint not null check (total >= 0),
  estado text not null default 'confirmada' check (estado in ('confirmada', 'anulada')),
  comprobante jsonb not null default '{"tipo":"X","cae":null,"emulado":true}',
  presupuesto_id uuid,
  vendedor_id uuid not null,
  origen text not null default 'en_linea' check (origen in ('en_linea', 'sin_conexion')),
  entrega boolean not null default false,
  advertencias text[] not null default '{}',
  unique (org_id, id),
  unique (sucursal_id, numero),
  foreign key (org_id, negocio_id) references public.negocios (org_id, id),
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id),
  foreign key (org_id, cliente_id) references public.clientes (org_id, id),
  foreign key (org_id, lista_id) references public.listas_precios (org_id, id)
);
create index ventas_sucursal_fecha_idx on public.ventas (sucursal_id, fecha desc);

create table public.venta_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  venta_id uuid not null,
  producto_id uuid not null,
  descripcion text not null,
  cantidad numeric(14, 3) not null check (cantidad > 0),
  precio_unitario bigint not null check (precio_unitario >= 0),
  descuento_pct numeric(5, 2) not null default 0 check (descuento_pct between 0 and 100),
  -- Costo al momento de la venta (lo completa el servidor). Columna protegida.
  costo_unitario bigint not null default 0,
  foreign key (org_id, venta_id) references public.ventas (org_id, id) on delete cascade,
  foreign key (org_id, producto_id) references public.productos (org_id, id)
);
create index venta_items_venta_idx on public.venta_items (venta_id);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  venta_id uuid not null,
  medio text not null check (medio in ('efectivo', 'debito', 'credito', 'transferencia', 'mercadopago', 'cuenta_corriente')),
  importe bigint not null check (importe >= 0),
  referencia text not null default '',
  foreign key (org_id, venta_id) references public.ventas (org_id, id) on delete cascade
);
create index pagos_venta_idx on public.pagos (venta_id);

-- ───────────── Presupuestos ─────────────

create table public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  negocio_id uuid not null,
  sucursal_id uuid not null,
  numero bigint,
  numero_local text not null,
  fecha timestamptz not null,
  vencimiento timestamptz not null,
  cliente_id uuid,
  cliente_nombre text not null default '',
  lista_id uuid not null,
  total bigint not null check (total >= 0),
  estado text not null default 'borrador' check (estado in ('borrador', 'enviado', 'aceptado', 'rechazado', 'vencido', 'convertido')),
  venta_id uuid,
  notas text not null default '',
  vendedor_id uuid not null,
  actualizado_en timestamptz not null default now(),
  unique (org_id, id),
  unique (sucursal_id, numero),
  foreign key (org_id, negocio_id) references public.negocios (org_id, id),
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id),
  foreign key (org_id, cliente_id) references public.clientes (org_id, id),
  foreign key (org_id, venta_id) references public.ventas (org_id, id)
);

create table public.presupuesto_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  presupuesto_id uuid not null,
  producto_id uuid not null,
  descripcion text not null,
  cantidad numeric(14, 3) not null check (cantidad > 0),
  precio_unitario bigint not null check (precio_unitario >= 0),
  descuento_pct numeric(5, 2) not null default 0 check (descuento_pct between 0 and 100),
  foreign key (org_id, presupuesto_id) references public.presupuestos (org_id, id) on delete cascade,
  foreign key (org_id, producto_id) references public.productos (org_id, id)
);
create index presupuesto_items_presupuesto_idx on public.presupuesto_items (presupuesto_id);

-- ───────────── Servicio técnico ─────────────

create table public.ordenes_servicio (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sucursal_id uuid not null,
  numero bigint,
  numero_local text not null,
  fecha_ingreso timestamptz not null,
  fecha_prometida timestamptz not null,
  cliente_id uuid not null,
  equipo jsonb not null,
  falla text not null default '',
  accesorios text not null default '',
  diagnostico text not null default '',
  estado text not null default 'ingresado' check (estado in ('ingresado', 'diagnostico', 'esperando_aprobacion', 'en_reparacion', 'listo', 'entregado', 'sin_reparacion')),
  prioridad text not null default 'normal' check (prioridad in ('normal', 'urgente')),
  tecnico_id uuid,
  presupuesto_reparacion bigint,
  repuestos jsonb not null default '[]',
  eventos jsonb not null default '[]',
  actualizado_en timestamptz not null default now(),
  unique (org_id, id),
  unique (sucursal_id, numero),
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id),
  foreign key (org_id, cliente_id) references public.clientes (org_id, id)
);

-- ───────────── Compras ─────────────

create table public.ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sucursal_id uuid not null,
  proveedor_id uuid not null,
  numero bigint,
  numero_local text not null,
  fecha timestamptz not null,
  estado text not null default 'borrador' check (estado in ('borrador', 'enviada', 'recibida_parcial', 'recibida', 'cancelada')),
  items jsonb not null default '[]',
  total bigint not null default 0,
  notas text not null default '',
  actualizado_en timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id),
  foreign key (org_id, proveedor_id) references public.proveedores (org_id, id)
);

-- ───────────── Entregas ─────────────

create table public.entregas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sucursal_id uuid not null,
  venta_id uuid not null,
  cliente_id uuid,
  destinatario text not null,
  direccion text not null,
  telefono text not null default '',
  fecha_programada timestamptz not null,
  franja text not null default 'mañana' check (franja in ('mañana', 'tarde')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_camino', 'entregada', 'fallida')),
  chofer text not null default '',
  orden smallint not null default 0,
  notas text not null default '',
  actualizado_en timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id),
  foreign key (org_id, venta_id) references public.ventas (org_id, id),
  foreign key (org_id, cliente_id) references public.clientes (org_id, id)
);

-- ───────────── Caja ─────────────

create table public.sesiones_caja (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sucursal_id uuid not null,
  puesto smallint not null,
  abierta_por uuid not null,
  apertura timestamptz not null,
  monto_inicial bigint not null default 0,
  cerrada_por uuid,
  cierre timestamptz,
  monto_contado bigint,
  esperado bigint,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  unique (org_id, id),
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id)
);
create unique index sesiones_caja_abierta_idx on public.sesiones_caja (sucursal_id, puesto) where estado = 'abierta';

create table public.movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sucursal_id uuid not null,
  sesion_id uuid not null,
  fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('ingreso', 'retiro', 'gasto')),
  importe bigint not null check (importe > 0),
  motivo text not null default '',
  usuario_id uuid not null,
  foreign key (org_id, sesion_id) references public.sesiones_caja (org_id, id) on delete cascade,
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id)
);

-- ───────────── Conteos ─────────────

create table public.conteos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  sucursal_id uuid not null,
  fecha timestamptz not null,
  nombre text not null,
  estado text not null default 'en_curso' check (estado in ('en_curso', 'cerrado')),
  items jsonb not null default '[]',
  usuario_id uuid not null,
  cerrado_en timestamptz,
  unique (org_id, id),
  foreign key (org_id, sucursal_id) references public.sucursales (org_id, id)
);

-- ───────────── Aumentos de precios ─────────────

create table public.aumentos_precio (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  fecha timestamptz not null default now(),
  usuario_id uuid not null,
  descripcion text not null,
  filtro jsonb not null default '{}',
  porcentaje numeric(7, 3) not null,
  lista_ids uuid[] not null,
  redondeo text not null default 'ninguno',
  cambios jsonb not null default '[]',
  revertido boolean not null default false,
  unique (org_id, id)
);

-- ───────────── Numeradores (números definitivos por sucursal) ─────────────

create table public.numeradores (
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  clave text not null,
  ultimo bigint not null default 0,
  primary key (org_id, clave)
);

-- Referencia circular venta ↔ presupuesto (se agrega cuando ambas existen).
alter table public.ventas
  add constraint ventas_presupuesto_fk foreign key (org_id, presupuesto_id) references public.presupuestos (org_id, id);
