-- ════════════════════════════════════════════════════════════════════
-- Yunque · 0005 · Operaciones de sincronización (servidor de producción)
--
-- La app guarda cada escritura como una operación con id único y la envía
-- a public.aplicar_operacion(op). Esta función:
--   1. es idempotente (reenviar el mismo id devuelve el mismo resultado),
--   2. valida que el usuario sea el autor, su permiso y su sucursal,
--   3. aplica la operación en una subtransacción (todo o nada),
--   4. la agrega al log `operaciones` (orden global = seq) o, si la rechaza,
--      a `operaciones_rechazadas` con el motivo.
-- Las reglas de conflicto son las mismas que src/sync/reductores.ts.
--
-- Operaciones implementadas en SQL hoy: venta.crear, presupuesto.guardar,
-- presupuesto.convertir, stock.ajustar, stock.transferir, caja.cerrar,
-- cuenta.pago. El resto devuelve error temporal (la operación queda en la
-- cola del dispositivo, no se pierde). Deuda documentada en ARQUITECTURA.md.
-- ════════════════════════════════════════════════════════════════════

create table public.operaciones (
  seq bigint generated always as identity primary key,
  id uuid not null unique,
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  sucursal_id uuid,
  usuario_id uuid not null,
  tipo text not null,
  op jsonb not null,
  resultado jsonb not null,
  autor jsonb not null,
  recibida_en timestamptz not null default now()
);
create index operaciones_org_seq_idx on public.operaciones (org_id, seq);

create table public.operaciones_rechazadas (
  id uuid primary key,
  org_id uuid not null,
  usuario_id uuid not null,
  tipo text not null,
  resultado jsonb not null,
  recibida_en timestamptz not null default now()
);

alter table public.operaciones enable row level security;
alter table public.operaciones force row level security;
alter table public.operaciones_rechazadas enable row level security;
alter table public.operaciones_rechazadas force row level security;

create trigger solo_agregar before update or delete on public.operaciones
  for each row execute function app.solo_agregar();

-- Permiso requerido por tipo de operación (igual que PERMISO_OPERACION en src/sync/tipos.ts).
create or replace function app.permiso_operacion(p_tipo text)
returns text
language sql immutable
set search_path = ''
as $$
  select case p_tipo
    when 'venta.crear' then 'mostrador.vender'
    when 'venta.anular' then 'ventas.anular'
    when 'presupuesto.guardar' then 'presupuestos.editar'
    when 'presupuesto.estado' then 'presupuestos.editar'
    when 'presupuesto.convertir' then 'mostrador.vender'
    when 'stock.ajustar' then 'stock.ajustar'
    when 'stock.transferir' then 'stock.transferir'
    when 'stock.minimo' then 'inventario.editar'
    when 'conteo.crear' then 'conteo.realizar'
    when 'conteo.registrar' then 'conteo.realizar'
    when 'conteo.cerrar' then 'conteo.realizar'
    when 'precios.aumento' then 'precios.editar'
    when 'precios.revertir' then 'precios.editar'
    when 'precio.editar' then 'precios.editar'
    when 'producto.guardar' then 'inventario.editar'
    when 'cliente.guardar' then 'clientes.editar'
    when 'cuenta.pago' then 'cuentas.cobrar'
    when 'servicio.crear' then 'servicio.editar'
    when 'servicio.estado' then 'servicio.editar'
    when 'servicio.asignar' then 'servicio.editar'
    when 'compra.guardar' then 'compras.editar'
    when 'compra.enviar' then 'compras.editar'
    when 'compra.recibir' then 'compras.recibir'
    when 'entrega.estado' then 'entregas.editar'
    when 'entrega.orden' then 'entregas.editar'
    when 'caja.abrir' then 'caja.operar'
    when 'caja.movimiento' then 'caja.operar'
    when 'caja.cerrar' then 'caja.operar'
    when 'org.config' then 'config.editar'
    when 'usuario.guardar' then 'usuarios.gestionar'
    when 'importar.productos' then 'importar.datos'
    else '__desconocida__'
  end
$$;

grant select on public.operaciones to authenticated;
create policy operaciones_select on public.operaciones for select to authenticated
  using (
    org_id in (select app.orgs_con_permiso(app.permiso_operacion(tipo)))
    and (sucursal_id is null or sucursal_id in (select app.sucursales_con_permiso(app.permiso_operacion(tipo))))
  );

grant select on public.operaciones_rechazadas to authenticated;
create policy operaciones_rechazadas_select on public.operaciones_rechazadas for select to authenticated
  using (usuario_id = auth.uid());

-- ───────────── Utilidades ─────────────

-- Rechazo de negocio: SQLSTATE propio YQ001, código en DETAIL y mensaje en HINT.
create or replace function app.rechazar(p_codigo text, p_mensaje text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'rechazo' using errcode = 'YQ001', detail = p_codigo, hint = p_mensaje;
end
$$;

create or replace function app.siguiente_numero(p_org uuid, p_clave text)
returns bigint
language sql
set search_path = ''
as $$
  insert into public.numeradores (org_id, clave, ultimo) values (p_org, p_clave, 1)
  on conflict (org_id, clave) do update set ultimo = public.numeradores.ultimo + 1
  returning ultimo
$$;

create or replace function app.formato_pesos(p_centavos bigint)
returns text
language sql immutable
set search_path = ''
as $$
  select '$ ' || to_char(p_centavos / 100.0, 'FM999G999G999G990D00')
$$;

-- Mueve stock (delta) y registra el movimiento. Devuelve la cantidad resultante.
create or replace function app.mover_stock(
  p_org uuid, p_sucursal uuid, p_producto uuid, p_cantidad numeric, p_tipo text, p_ref uuid, p_motivo text, p_usuario uuid
)
returns numeric
language plpgsql
set search_path = ''
as $$
declare
  v_queda numeric;
begin
  insert into public.stock (org_id, sucursal_id, producto_id, cantidad)
  values (p_org, p_sucursal, p_producto, p_cantidad)
  on conflict (sucursal_id, producto_id) do update
    set cantidad = public.stock.cantidad + excluded.cantidad, actualizado_en = now()
  returning cantidad into v_queda;
  insert into public.movimientos_stock (org_id, sucursal_id, producto_id, tipo, cantidad, ref_id, motivo, usuario_id)
  values (p_org, p_sucursal, p_producto, p_tipo, p_cantidad, p_ref, p_motivo, p_usuario);
  return v_queda;
end
$$;

-- ───────────── Ventas ─────────────

create or replace function app.crear_venta(p_org uuid, p_usuario uuid, p_sin_conexion boolean, v jsonb, p_presupuesto uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := (v ->> 'id')::uuid;
  v_suc public.sucursales;
  v_cliente public.clientes;
  v_lista uuid := (v ->> 'listaId')::uuid;
  v_puesto int := (v ->> 'puesto')::int;
  v_item jsonb;
  v_pago jsonb;
  v_total bigint := 0;
  v_pagado bigint := 0;
  v_en_cuenta bigint := 0;
  v_numero bigint;
  v_avisos text[] := '{}';
  v_queda numeric;
  v_precio_lista bigint;
  v_saldo bigint;
  v_prod public.productos;
  v_sku text;
begin
  -- ── validación (antes de escribir nada) ──
  select * into v_suc from public.sucursales where id = (v ->> 'sucursalId')::uuid and org_id = p_org;
  if not found then perform app.rechazar('no_existe', 'La sucursal no existe'); end if;
  if exists (select 1 from public.ventas where id = v_id) then perform app.rechazar('duplicada', 'La venta ya existe'); end if;
  if not exists (select 1 from public.listas_precios where id = v_lista and org_id = p_org) then perform app.rechazar('no_existe', 'Lista de precios inexistente'); end if;
  if v ->> 'clienteId' is not null then
    select * into v_cliente from public.clientes where id = (v ->> 'clienteId')::uuid and org_id = p_org;
    if not found then perform app.rechazar('no_existe', 'Cliente inexistente'); end if;
  end if;
  if v_puesto is null or v_puesto < 1 or v_puesto > v_suc.puestos then perform app.rechazar('invalida', 'Puesto de mostrador inválido'); end if;
  if jsonb_array_length(coalesce(v -> 'items', '[]')) = 0 then perform app.rechazar('invalida', 'La operación no tiene ítems'); end if;
  for v_item in select * from jsonb_array_elements(v -> 'items') loop
    if not exists (select 1 from public.productos where id = (v_item ->> 'productoId')::uuid and org_id = p_org) then
      perform app.rechazar('no_existe', 'Producto inexistente: ' || coalesce(v_item ->> 'descripcion', ''));
    end if;
    if (v_item ->> 'cantidad')::numeric <= 0 then perform app.rechazar('invalida', 'Cantidad inválida'); end if;
    if (v_item ->> 'precioUnitario')::bigint < 0 then perform app.rechazar('invalida', 'Precio inválido'); end if;
    if (v_item ->> 'descuentoPct')::numeric not between 0 and 100 then perform app.rechazar('invalida', 'Descuento inválido'); end if;
    v_total := v_total + round((v_item ->> 'cantidad')::numeric * (v_item ->> 'precioUnitario')::bigint * (1 - (v_item ->> 'descuentoPct')::numeric / 100));
  end loop;
  for v_pago in select * from jsonb_array_elements(v -> 'pagos') loop
    if v_pago ->> 'medio' not in ('efectivo', 'debito', 'credito', 'transferencia', 'mercadopago', 'cuenta_corriente') then
      perform app.rechazar('invalida', 'Medio de pago inválido');
    end if;
    v_pagado := v_pagado + (v_pago ->> 'importe')::bigint;
    if v_pago ->> 'medio' = 'cuenta_corriente' then v_en_cuenta := v_en_cuenta + (v_pago ->> 'importe')::bigint; end if;
  end loop;
  if v_pagado <> v_total then
    perform app.rechazar('invalida', 'Los pagos (' || app.formato_pesos(v_pagado) || ') no coinciden con el total (' || app.formato_pesos(v_total) || ')');
  end if;
  if v_en_cuenta > 0 and v_cliente.id is null then perform app.rechazar('invalida', 'Cuenta corriente requiere un cliente'); end if;

  -- ── aplicación (las ventas se aceptan: lo raro queda como advertencia) ──
  v_numero := app.siguiente_numero(p_org, 'venta:' || v_suc.codigo);

  for v_item in select * from jsonb_array_elements(v -> 'items') loop
    select precio into v_precio_lista from public.precios where lista_id = v_lista and producto_id = (v_item ->> 'productoId')::uuid;
    select sku into v_sku from public.productos where id = (v_item ->> 'productoId')::uuid;
    if v_precio_lista is not null and v_precio_lista <> (v_item ->> 'precioUnitario')::bigint then
      v_avisos := v_avisos || ('precio_distinto: ' || v_sku || ' vendido a ' || app.formato_pesos((v_item ->> 'precioUnitario')::bigint) || ', lista ' || app.formato_pesos(v_precio_lista));
    end if;
  end loop;
  if v_en_cuenta > 0 then
    select coalesce(sum(importe), 0) into v_saldo from public.movimientos_cuenta where cliente_id = v_cliente.id;
    if v_saldo + v_en_cuenta > v_cliente.limite_credito then
      v_avisos := v_avisos || ('limite_excedido: ' || v_cliente.nombre || ' supera su límite en ' || app.formato_pesos(v_saldo + v_en_cuenta - v_cliente.limite_credito));
    end if;
  end if;
  if not exists (select 1 from public.sesiones_caja where sucursal_id = v_suc.id and puesto = v_puesto and estado = 'abierta') then
    v_avisos := v_avisos || ('caja_cerrada: no había caja abierta en el puesto ' || v_puesto);
  end if;

  insert into public.ventas (id, org_id, negocio_id, sucursal_id, puesto, numero, numero_local, fecha, cliente_id, lista_id, total, estado,
                             comprobante, presupuesto_id, vendedor_id, origen, entrega, advertencias)
  values (v_id, p_org, v_suc.negocio_id, v_suc.id, v_puesto, v_numero, v ->> 'numeroLocal', (v ->> 'fecha')::timestamptz, v_cliente.id, v_lista,
          v_total, 'confirmada',
          jsonb_build_object('tipo', case when v_cliente.condicion_iva = 'RI' then 'FA' else 'FB' end, 'cae', null, 'emulado', true),
          p_presupuesto, p_usuario, case when p_sin_conexion then 'sin_conexion' else 'en_linea' end,
          (v -> 'entrega') is not null and jsonb_typeof(v -> 'entrega') = 'object', '{}');

  for v_item in select * from jsonb_array_elements(v -> 'items') loop
    select * into v_prod from public.productos where id = (v_item ->> 'productoId')::uuid;
    insert into public.venta_items (org_id, venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento_pct, costo_unitario)
    values (p_org, v_id, v_prod.id, v_item ->> 'descripcion', (v_item ->> 'cantidad')::numeric, (v_item ->> 'precioUnitario')::bigint,
            (v_item ->> 'descuentoPct')::numeric, v_prod.costo);
    v_queda := app.mover_stock(p_org, v_suc.id, v_prod.id, -(v_item ->> 'cantidad')::numeric, 'venta', v_id, 'Venta #' || v_numero, p_usuario);
    if v_queda < 0 then
      v_avisos := v_avisos || ('stock_negativo: ' || v_prod.sku || ' queda en ' || v_queda::text || ' en ' || v_suc.nombre);
    end if;
  end loop;
  for v_pago in select * from jsonb_array_elements(v -> 'pagos') loop
    insert into public.pagos (org_id, venta_id, medio, importe, referencia)
    values (p_org, v_id, v_pago ->> 'medio', (v_pago ->> 'importe')::bigint, coalesce(v_pago ->> 'referencia', ''));
  end loop;
  if v_en_cuenta > 0 then
    insert into public.movimientos_cuenta (org_id, cliente_id, fecha, tipo, importe, ref_id, descripcion)
    values (p_org, v_cliente.id, (v ->> 'fecha')::timestamptz, 'venta', v_en_cuenta, v_id, 'Venta #' || v_numero);
  end if;
  if jsonb_typeof(v -> 'entrega') = 'object' then
    insert into public.entregas (id, org_id, sucursal_id, venta_id, cliente_id, destinatario, direccion, telefono, fecha_programada, franja, notas)
    values ((v -> 'entrega' ->> 'id')::uuid, p_org, v_suc.id, v_id, v_cliente.id, v -> 'entrega' ->> 'destinatario', v -> 'entrega' ->> 'direccion',
            coalesce(v -> 'entrega' ->> 'telefono', ''), (v -> 'entrega' ->> 'fechaProgramada')::timestamptz, coalesce(v -> 'entrega' ->> 'franja', 'mañana'),
            coalesce(v -> 'entrega' ->> 'notas', ''));
  end if;
  update public.ventas set advertencias = v_avisos where id = v_id;
  return jsonb_build_object('ok', true, 'avisos', to_jsonb(v_avisos), 'asignado', jsonb_build_object('numero', v_numero));
end
$$;

-- ───────────── Manejadores por tipo ─────────────

create or replace function app.op_presupuesto_guardar(p_org uuid, p_usuario uuid, d jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  p jsonb := d -> 'presupuesto';
  v_id uuid := (p ->> 'id')::uuid;
  v_suc public.sucursales;
  v_existente public.presupuestos;
  v_numero bigint;
  v_item jsonb;
  v_total bigint := 0;
  v_cliente_nombre text := p ->> 'clienteNombre';
begin
  select * into v_suc from public.sucursales where id = (p ->> 'sucursalId')::uuid and org_id = p_org;
  if not found then perform app.rechazar('no_existe', 'La sucursal no existe'); end if;
  select * into v_existente from public.presupuestos where id = v_id for update;
  if found and v_existente.estado = 'convertido' then perform app.rechazar('estado', 'El presupuesto ya se convirtió en venta'); end if;
  if p ->> 'clienteId' is not null then
    select nombre into v_cliente_nombre from public.clientes where id = (p ->> 'clienteId')::uuid and org_id = p_org;
    if not found then perform app.rechazar('no_existe', 'Cliente inexistente'); end if;
  end if;
  if jsonb_array_length(coalesce(p -> 'items', '[]')) = 0 then perform app.rechazar('invalida', 'La operación no tiene ítems'); end if;
  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    if not exists (select 1 from public.productos where id = (v_item ->> 'productoId')::uuid and org_id = p_org) then
      perform app.rechazar('no_existe', 'Producto inexistente');
    end if;
    v_total := v_total + round((v_item ->> 'cantidad')::numeric * (v_item ->> 'precioUnitario')::bigint * (1 - (v_item ->> 'descuentoPct')::numeric / 100));
  end loop;

  if v_existente.id is null then
    v_numero := app.siguiente_numero(p_org, 'presupuesto:' || v_suc.codigo);
    insert into public.presupuestos (id, org_id, negocio_id, sucursal_id, numero, numero_local, fecha, vencimiento, cliente_id, cliente_nombre,
                                     lista_id, total, estado, notas, vendedor_id)
    values (v_id, p_org, v_suc.negocio_id, v_suc.id, v_numero, p ->> 'numeroLocal', (p ->> 'fecha')::timestamptz, (p ->> 'vencimiento')::timestamptz,
            (p ->> 'clienteId')::uuid, trim(v_cliente_nombre), (p ->> 'listaId')::uuid, v_total, p ->> 'estado', coalesce(p ->> 'notas', ''), p_usuario);
  else
    v_numero := v_existente.numero;
    update public.presupuestos
      set vencimiento = (p ->> 'vencimiento')::timestamptz, cliente_id = (p ->> 'clienteId')::uuid, cliente_nombre = trim(v_cliente_nombre),
          lista_id = (p ->> 'listaId')::uuid, total = v_total, estado = p ->> 'estado', notas = coalesce(p ->> 'notas', ''), actualizado_en = now()
      where id = v_id;
    delete from public.presupuesto_items where presupuesto_id = v_id;
  end if;
  insert into public.presupuesto_items (org_id, presupuesto_id, producto_id, descripcion, cantidad, precio_unitario, descuento_pct)
  select p_org, v_id, (i ->> 'productoId')::uuid, i ->> 'descripcion', (i ->> 'cantidad')::numeric, (i ->> 'precioUnitario')::bigint, (i ->> 'descuentoPct')::numeric
  from jsonb_array_elements(p -> 'items') i;
  return jsonb_build_object('ok', true, 'avisos', '[]'::jsonb, 'asignado', jsonb_build_object('numero', v_numero));
end
$$;

create or replace function app.op_presupuesto_convertir(p_org uuid, p_usuario uuid, p_sin_conexion boolean, d jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_pre public.presupuestos;
  v_venta public.ventas;
  v_res jsonb;
begin
  -- FOR UPDATE: dos conversiones simultáneas se serializan; gana la primera.
  select * into v_pre from public.presupuestos where id = (d ->> 'presupuestoId')::uuid and org_id = p_org for update;
  if not found then perform app.rechazar('no_existe', 'El presupuesto no existe'); end if;
  if v_pre.estado = 'convertido' then
    select * into v_venta from public.ventas where id = v_pre.venta_id;
    perform app.rechazar('ya_convertido', 'El presupuesto #' || coalesce(v_pre.numero::text, v_pre.numero_local) || ' ya se convirtió en la venta #' || coalesce(v_venta.numero::text, '') || ' desde otro puesto');
  end if;
  if v_pre.estado = 'rechazado' then perform app.rechazar('estado', 'El presupuesto está rechazado'); end if;
  v_res := app.crear_venta(p_org, p_usuario, p_sin_conexion, d -> 'venta', v_pre.id);
  update public.presupuestos set estado = 'convertido', venta_id = (d -> 'venta' ->> 'id')::uuid, actualizado_en = now() where id = v_pre.id;
  if v_pre.vencimiento < now() then
    v_res := jsonb_set(v_res, '{avisos}', (v_res -> 'avisos') || to_jsonb('presupuesto_vencido: se convirtió un presupuesto vencido'::text));
  end if;
  return v_res;
end
$$;

create or replace function app.op_stock_ajustar(p_org uuid, p_usuario uuid, d jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_queda numeric;
  v_sku text;
begin
  if not exists (select 1 from public.sucursales where id = (d ->> 'sucursalId')::uuid and org_id = p_org) then perform app.rechazar('no_existe', 'La sucursal no existe'); end if;
  select sku into v_sku from public.productos where id = (d ->> 'productoId')::uuid and org_id = p_org;
  if not found then perform app.rechazar('no_existe', 'El producto no existe'); end if;
  if coalesce((d ->> 'cantidad')::numeric, 0) = 0 then perform app.rechazar('invalida', 'Cantidad inválida'); end if;
  if length(trim(coalesce(d ->> 'motivo', ''))) < 3 then perform app.rechazar('invalida', 'Indicá el motivo del ajuste'); end if;
  v_queda := app.mover_stock(p_org, (d ->> 'sucursalId')::uuid, (d ->> 'productoId')::uuid, (d ->> 'cantidad')::numeric, 'ajuste', null, trim(d ->> 'motivo'), p_usuario);
  return jsonb_build_object('ok', true, 'avisos', case when v_queda < 0 then jsonb_build_array('stock_negativo: ' || v_sku || ' queda en ' || v_queda) else '[]'::jsonb end);
end
$$;

create or replace function app.op_stock_transferir(p_org uuid, p_usuario uuid, d jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_desde uuid := (d ->> 'desdeId')::uuid;
  v_hacia uuid := (d ->> 'haciaId')::uuid;
  v_item jsonb;
begin
  if v_desde = v_hacia then perform app.rechazar('invalida', 'Origen y destino son la misma sucursal'); end if;
  if (select count(*) from public.sucursales where id in (v_desde, v_hacia) and org_id = p_org) <> 2 then perform app.rechazar('no_existe', 'Sucursal inexistente'); end if;
  -- El permiso también tiene que valer en la sucursal de destino.
  if not app.puede_sucursal(p_org, v_hacia, 'stock.transferir') then perform app.rechazar('sucursal', 'No tenés permiso en la sucursal de destino'); end if;
  for v_item in select * from jsonb_array_elements(d -> 'items') loop
    perform app.mover_stock(p_org, v_desde, (v_item ->> 'productoId')::uuid, -(v_item ->> 'cantidad')::numeric, 'transferencia_salida', (d ->> 'transferenciaId')::uuid, 'Transferencia', p_usuario);
    perform app.mover_stock(p_org, v_hacia, (v_item ->> 'productoId')::uuid, (v_item ->> 'cantidad')::numeric, 'transferencia_entrada', (d ->> 'transferenciaId')::uuid, 'Transferencia', p_usuario);
  end loop;
  return jsonb_build_object('ok', true, 'avisos', '[]'::jsonb);
end
$$;

create or replace function app.op_caja_cerrar(p_org uuid, p_usuario uuid, d jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_caja public.sesiones_caja;
  v_esperado bigint;
  v_contado bigint := (d ->> 'montoContado')::bigint;
begin
  select * into v_caja from public.sesiones_caja where id = (d ->> 'sesionId')::uuid and org_id = p_org for update;
  if not found then perform app.rechazar('no_existe', 'La caja no existe'); end if;
  if not app.puede_sucursal(p_org, v_caja.sucursal_id, 'caja.operar') then perform app.rechazar('sucursal', 'No tenés permiso en esa sucursal'); end if;
  if v_caja.estado <> 'abierta' then perform app.rechazar('estado', 'La caja ya fue cerrada desde otro puesto'); end if;
  if v_contado is null or v_contado < 0 then perform app.rechazar('invalida', 'Monto contado inválido'); end if;
  select v_caja.monto_inicial
         + coalesce((select sum(pg.importe) from public.pagos pg join public.ventas v on v.id = pg.venta_id
                     where v.sucursal_id = v_caja.sucursal_id and v.puesto = v_caja.puesto and v.estado = 'confirmada'
                       and v.fecha between v_caja.apertura and now() and pg.medio = 'efectivo'), 0)
         + coalesce((select sum(case when m.tipo = 'ingreso' then m.importe else -m.importe end) from public.movimientos_caja m where m.sesion_id = v_caja.id), 0)
    into v_esperado;
  update public.sesiones_caja
    set estado = 'cerrada', cierre = now(), cerrada_por = p_usuario, esperado = v_esperado, monto_contado = v_contado
    where id = v_caja.id;
  return jsonb_build_object('ok', true, 'avisos', '[]'::jsonb, 'asignado', jsonb_build_object('diferencia', v_contado - v_esperado, 'esperado', v_esperado));
end
$$;

create or replace function app.op_cuenta_pago(p_org uuid, p_usuario uuid, d jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.clientes where id = (d ->> 'clienteId')::uuid and org_id = p_org) then perform app.rechazar('no_existe', 'El cliente no existe'); end if;
  if coalesce((d ->> 'importe')::bigint, 0) <= 0 then perform app.rechazar('invalida', 'Importe inválido'); end if;
  if d ->> 'medio' not in ('efectivo', 'debito', 'credito', 'transferencia', 'mercadopago') then perform app.rechazar('invalida', 'Medio de pago inválido'); end if;
  insert into public.movimientos_cuenta (id, org_id, cliente_id, tipo, importe, descripcion)
  values ((d ->> 'movimientoId')::uuid, p_org, (d ->> 'clienteId')::uuid, 'pago', -(d ->> 'importe')::bigint,
          'Pago ' || (d ->> 'medio') || case when coalesce(d ->> 'referencia', '') <> '' then ' · ' || (d ->> 'referencia') else '' end);
  return jsonb_build_object('ok', true, 'avisos', '[]'::jsonb);
end
$$;

-- ───────────── Punto de entrada (RPC) ─────────────

create or replace function public.aplicar_operacion(op jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid := (op ->> 'id')::uuid;
  v_org uuid := (op ->> 'orgId')::uuid;
  v_tipo text := op ->> 'tipo';
  v_suc uuid := nullif(op ->> 'sucursalId', '')::uuid;
  v_usuario uuid := auth.uid();
  v_sin_conexion boolean := coalesce((op ->> 'sinConexion')::boolean, false);
  v_datos jsonb := op -> 'datos';
  v_permiso text := app.permiso_operacion(op ->> 'tipo');
  v_previa record;
  v_res jsonb;
  v_codigo text;
  v_mensaje text;
  v_seq bigint;
  v_autor jsonb;
begin
  if v_usuario is null then raise exception 'no_autenticado' using errcode = '28000'; end if;
  if v_id is null or v_org is null or v_tipo is null then raise exception 'operacion_malformada' using errcode = '22023'; end if;

  -- Idempotencia: el mismo id devuelve siempre el mismo resultado.
  select seq, resultado into v_previa from public.operaciones where id = v_id;
  if found then return jsonb_build_object('id', v_id, 'seq', v_previa.seq, 'resultado', v_previa.resultado); end if;
  select resultado into v_previa from public.operaciones_rechazadas where id = v_id;
  if found then return jsonb_build_object('id', v_id, 'seq', null, 'resultado', v_previa.resultado); end if;

  begin
    if (op ->> 'usuarioId')::uuid is distinct from v_usuario then perform app.rechazar('permiso', 'La operación pertenece a otro usuario'); end if;
    if v_permiso = '__desconocida__' then perform app.rechazar('invalida', 'Operación desconocida: ' || v_tipo); end if;
    if not app.tiene_permiso(v_org, v_permiso) then perform app.rechazar('permiso', 'Tu rol no permite esta acción'); end if;
    if v_suc is not null and not app.puede_sucursal(v_org, v_suc, v_permiso) then perform app.rechazar('sucursal', 'No tenés permiso en esa sucursal'); end if;

    -- La auditoría por triggers registra qué operación causó cada cambio.
    perform set_config('app.op_id', v_id::text, true);
    perform set_config('app.op_tipo', v_tipo, true);

    v_res := case v_tipo
      when 'venta.crear' then app.crear_venta(v_org, v_usuario, v_sin_conexion, v_datos -> 'venta', null)
      when 'presupuesto.guardar' then app.op_presupuesto_guardar(v_org, v_usuario, v_datos)
      when 'presupuesto.convertir' then app.op_presupuesto_convertir(v_org, v_usuario, v_sin_conexion, v_datos)
      when 'stock.ajustar' then app.op_stock_ajustar(v_org, v_usuario, v_datos)
      when 'stock.transferir' then app.op_stock_transferir(v_org, v_usuario, v_datos)
      when 'caja.cerrar' then app.op_caja_cerrar(v_org, v_usuario, v_datos)
      when 'cuenta.pago' then app.op_cuenta_pago(v_org, v_usuario, v_datos)
      else null
    end;
  exception when sqlstate 'YQ001' then
    get stacked diagnostics v_codigo = pg_exception_detail, v_mensaje = pg_exception_hint;
    v_res := jsonb_build_object('ok', false, 'codigo', v_codigo, 'error', v_mensaje);
    insert into public.operaciones_rechazadas (id, org_id, usuario_id, tipo, resultado) values (v_id, v_org, v_usuario, v_tipo, v_res);
    return jsonb_build_object('id', v_id, 'seq', null, 'resultado', v_res);
  end;

  if v_res is null then
    -- Error temporal (no rechazo): la operación queda en la cola del dispositivo.
    raise exception 'operacion_no_soportada: %', v_tipo using errcode = '0A000';
  end if;

  select jsonb_build_object('id', m.user_id, 'rol', m.rol, 'sucursalIds', to_jsonb(m.sucursales)) into v_autor
  from public.miembros m where m.org_id = v_org and m.user_id = v_usuario;

  insert into public.operaciones (id, org_id, sucursal_id, usuario_id, tipo, op, resultado, autor)
  values (v_id, v_org, v_suc, v_usuario, v_tipo, op, v_res, v_autor)
  returning seq into v_seq;
  return jsonb_build_object('id', v_id, 'seq', v_seq, 'resultado', v_res);
end
$$;

revoke all on function public.aplicar_operacion(jsonb) from public, anon;
grant execute on function public.aplicar_operacion(jsonb) to authenticated;

-- Las funciones internas no se llaman directo: solo a través de aplicar_operacion.
revoke all on function
  app.rechazar(text, text), app.siguiente_numero(uuid, text), app.formato_pesos(bigint),
  app.mover_stock(uuid, uuid, uuid, numeric, text, uuid, text, uuid),
  app.crear_venta(uuid, uuid, boolean, jsonb, uuid),
  app.op_presupuesto_guardar(uuid, uuid, jsonb), app.op_presupuesto_convertir(uuid, uuid, boolean, jsonb),
  app.op_stock_ajustar(uuid, uuid, jsonb), app.op_stock_transferir(uuid, uuid, jsonb),
  app.op_caja_cerrar(uuid, uuid, jsonb), app.op_cuenta_pago(uuid, uuid, jsonb)
from public, anon, authenticated;
revoke all on function app.permiso_operacion(text) from public, anon;
grant execute on function app.permiso_operacion(text) to authenticated;
