-- ════════════════════════════════════════════════════════════════════════════
-- Forja: la extensión visual de Yunque (el taller conectado).
--
-- 1. Sucursales con ubicación y tipo (sucursal / depósito) y marca de ficticia.
-- 2. Permisos extra por persona (p. ej. ver Forja de su sucursal).
-- 3. Transferencias con estado: en tránsito → recibida.
-- 4. Extensiones por organización y preferencias por persona.
-- 5. Operaciones nuevas, por un punto de extensión de aplicar_operacion.
-- 6. Lecturas de Forja (security invoker: respetan RLS) con control explícito
--    de organización, sucursal y permiso `forja.ver`.
-- 7. Eventos en vivo por Broadcast a canales PRIVADOS POR SUCURSAL
--    (org:{org_id}:suc:{sucursal_id}) con RLS sobre realtime.messages.
-- ════════════════════════════════════════════════════════════════════════════

-- ───────────── 1. Sucursales ─────────────
alter table public.sucursales
  add column tipo text not null default 'sucursal' check (tipo in ('sucursal', 'deposito')),
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180),
  add column demo boolean not null default false;

-- ───────────── 2. Permisos extra por persona ─────────────
alter table public.miembros add column permisos_extra text[] not null default '{}';

create or replace function app.orgs_con_permiso(p_permiso text)
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select m.org_id
  from app.membresias() m
  where p_permiso = any (m.permisos_extra)
     or exists (select 1 from public.permisos_rol pr where pr.rol = m.rol and pr.permiso = p_permiso)
$$;

create or replace function app.sucursales_con_permiso(p_permiso text)
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select s.id
  from app.membresias() m
  join public.sucursales s on s.org_id = m.org_id
  where (m.sucursales is null or s.id = any (m.sucursales))
    and (p_permiso = any (m.permisos_extra)
         or exists (select 1 from public.permisos_rol pr where pr.rol = m.rol and pr.permiso = p_permiso))
$$;

insert into public.permisos_rol (rol, permiso)
select r.rol, p.permiso
from (values ('dueno'), ('administracion')) as r (rol)
cross join unnest(array['extensiones.gestionar', 'forja.ver']) as p (permiso)
union all
select r.rol, 'perfil.editar'
from (values ('dueno'), ('administracion'), ('mostrador'), ('deposito'), ('tecnico'), ('compras')) as r (rol);

-- ───────────── 3. Transferencias ─────────────
create table public.transferencias (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  desde_id uuid not null,
  hacia_id uuid not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 200),
  estado text not null default 'en_transito' check (estado in ('en_transito', 'recibida')),
  motivo text not null default '' check (length(motivo) <= 200),
  despachada_en timestamptz not null default now(),
  llegada_estimada timestamptz not null,
  recibida_en timestamptz,
  usuario_id uuid not null,
  unique (org_id, id),
  check (desde_id <> hacia_id),
  check ((estado = 'recibida') = (recibida_en is not null)),
  foreign key (org_id, desde_id) references public.sucursales (org_id, id),
  foreign key (org_id, hacia_id) references public.sucursales (org_id, id)
);
create index transferencias_transito_idx on public.transferencias (org_id, estado) where estado = 'en_transito';
alter table public.transferencias enable row level security;
alter table public.transferencias force row level security;
create policy transferencias_ver on public.transferencias for select to authenticated
  using (app.puede_sucursal(org_id, desde_id, 'inventario.ver') or app.puede_sucursal(org_id, hacia_id, 'inventario.ver'));
grant select on public.transferencias to authenticated;
create trigger auditar after insert or update or delete on public.transferencias for each row execute function app.auditar();

-- ───────────── 4. Extensiones y preferencias ─────────────
create table public.extensiones_org (
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  extension text not null check (extension in ('forja')),
  activa boolean not null default false,
  activada_en timestamptz,
  activada_por uuid,
  primary key (org_id, extension)
);
alter table public.extensiones_org enable row level security;
alter table public.extensiones_org force row level security;
create policy extensiones_ver on public.extensiones_org for select to authenticated
  using (org_id in (select app.mis_orgs()));
grant select on public.extensiones_org to authenticated;
create trigger auditar after insert or update or delete on public.extensiones_org for each row execute function app.auditar();

-- Preferencias de cada persona (p. ej. "ya vio la animación de Forja"): solo las propias.
create table public.preferencias_usuario (
  org_id uuid not null references public.organizaciones (id) on delete cascade,
  user_id uuid not null,
  clave text not null check (clave ~ '^[a-z0-9._-]{1,60}$'),
  valor jsonb not null check (jsonb_typeof(valor) in ('string', 'number', 'boolean', 'null') and length(valor::text) <= 210),
  actualizada_en timestamptz not null default now(),
  primary key (org_id, user_id, clave)
);
alter table public.preferencias_usuario enable row level security;
alter table public.preferencias_usuario force row level security;
create policy preferencias_propias on public.preferencias_usuario for select to authenticated
  using (user_id = auth.uid() and org_id in (select app.mis_orgs()));
grant select on public.preferencias_usuario to authenticated;

-- ───────────── 5. Operaciones nuevas ─────────────
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
    when 'sucursal.guardar' then 'config.editar'
    when 'lista.guardar' then 'precios.editar'
    when 'transferencia.despachar' then 'stock.transferir'
    when 'transferencia.recibir' then 'stock.transferir'
    when 'extension.activar' then 'extensiones.gestionar'
    when 'usuario.preferencia' then 'perfil.editar'
    else '__desconocida__'
  end
$$;

/**
 * Punto de extensión de aplicar_operacion: operaciones agregadas después de la
 * 0500 (hoy, las de Forja). Devuelve null si el tipo no está implementado en SQL
 * (error temporal: la operación queda en la cola del dispositivo).
 * Una extensión futura agrega sus casos acá con `create or replace`.
 */
create or replace function app.op_extendida(p_tipo text, p_org uuid, p_usuario uuid, p_sin_conexion boolean, d jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_desde uuid;
  v_hacia uuid;
  v_llegada timestamptz;
  v_t public.transferencias;
  v_it jsonb;
  v_queda numeric;
  v_avisos text[] := '{}';
  v_clave text;
begin
  case p_tipo
  when 'transferencia.despachar' then
    v_id := (d ->> 'transferenciaId')::uuid;
    v_desde := (d ->> 'desdeId')::uuid;
    v_hacia := (d ->> 'haciaId')::uuid;
    v_llegada := (d ->> 'llegadaEstimada')::timestamptz;
    if not app.puede_sucursal(p_org, v_desde, 'stock.transferir') then perform app.rechazar('sucursal', 'No tenés permiso en la sucursal de origen'); end if;
    if not exists (select 1 from public.sucursales where org_id = p_org and id = v_hacia) then perform app.rechazar('no_existe', 'La sucursal de destino no existe'); end if;
    if v_desde = v_hacia then perform app.rechazar('invalida', 'Origen y destino son la misma sucursal'); end if;
    if exists (select 1 from public.transferencias where id = v_id) then perform app.rechazar('duplicada', 'La transferencia ya existe'); end if;
    if v_llegada is null or v_llegada < now() - interval '1 minute' then perform app.rechazar('invalida', 'La llegada estimada tiene que ser posterior al despacho'); end if;
    if jsonb_typeof(d -> 'items') <> 'array' or jsonb_array_length(d -> 'items') = 0 then perform app.rechazar('invalida', 'La transferencia no tiene productos'); end if;
    insert into public.transferencias (id, org_id, desde_id, hacia_id, items, estado, motivo, llegada_estimada, usuario_id)
    values (v_id, p_org, v_desde, v_hacia, d -> 'items', 'en_transito', left(coalesce(d ->> 'motivo', ''), 200), v_llegada, p_usuario);
    for v_it in select * from jsonb_array_elements(d -> 'items') loop
      if not exists (select 1 from public.productos where org_id = p_org and id = (v_it ->> 'productoId')::uuid) then perform app.rechazar('no_existe', 'Producto inexistente'); end if;
      if coalesce((v_it ->> 'cantidad')::numeric, 0) <= 0 then perform app.rechazar('invalida', 'Cantidad inválida'); end if;
      v_queda := app.mover_stock(p_org, v_desde, (v_it ->> 'productoId')::uuid, -(v_it ->> 'cantidad')::numeric, 'transferencia_salida', v_id, 'Transferencia (en tránsito)', p_usuario);
      if v_queda < 0 then v_avisos := v_avisos || ('stock_negativo: ' || (v_it ->> 'productoId')); end if;
    end loop;
    return jsonb_build_object('ok', true, 'avisos', to_jsonb(v_avisos));

  when 'transferencia.recibir' then
    v_id := (d ->> 'transferenciaId')::uuid;
    select * into v_t from public.transferencias where id = v_id and org_id = p_org for update;
    if not found then perform app.rechazar('no_existe', 'La transferencia no existe'); end if;
    if v_t.estado <> 'en_transito' then perform app.rechazar('estado', 'La transferencia ya se recibió'); end if;
    if not app.puede_sucursal(p_org, v_t.hacia_id, 'stock.transferir') then perform app.rechazar('sucursal', 'No tenés permiso en la sucursal de destino'); end if;
    for v_it in select * from jsonb_array_elements(v_t.items) loop
      perform app.mover_stock(p_org, v_t.hacia_id, (v_it ->> 'productoId')::uuid, (v_it ->> 'cantidad')::numeric, 'transferencia_entrada', v_id, 'Transferencia recibida', p_usuario);
    end loop;
    update public.transferencias set estado = 'recibida', recibida_en = now() where id = v_id;
    return jsonb_build_object('ok', true, 'avisos', '[]'::jsonb);

  when 'extension.activar' then
    if coalesce(d ->> 'extension', '') not in ('forja') then perform app.rechazar('invalida', 'Extensión desconocida'); end if;
    insert into public.extensiones_org (org_id, extension, activa, activada_en, activada_por)
    values (p_org, d ->> 'extension', (d ->> 'activa')::boolean, case when (d ->> 'activa')::boolean then now() end, p_usuario)
    on conflict (org_id, extension) do update
      set activa = excluded.activa,
          activada_en = case when excluded.activa and not public.extensiones_org.activa then now() else public.extensiones_org.activada_en end,
          activada_por = excluded.activada_por;
    return jsonb_build_object('ok', true, 'avisos', '[]'::jsonb);

  when 'usuario.preferencia' then
    v_clave := d ->> 'clave';
    if v_clave is null or v_clave !~ '^[a-z0-9._-]{1,60}$' then perform app.rechazar('invalida', 'Clave de preferencia inválida'); end if;
    if jsonb_typeof(d -> 'valor') not in ('string', 'number', 'boolean', 'null') or length((d -> 'valor')::text) > 210 then perform app.rechazar('invalida', 'Valor de preferencia inválido'); end if;
    insert into public.preferencias_usuario (org_id, user_id, clave, valor)
    values (p_org, p_usuario, v_clave, d -> 'valor')
    on conflict (org_id, user_id, clave) do update set valor = excluded.valor, actualizada_en = now();
    return jsonb_build_object('ok', true, 'avisos', '[]'::jsonb);

  else
    return null;
  end case;
end
$$;

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
      else app.op_extendida(v_tipo, v_org, v_usuario, v_sin_conexion, v_datos)
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

  select jsonb_build_object('id', m.user_id, 'rol', m.rol, 'sucursalIds', to_jsonb(m.sucursales), 'permisosExtra', to_jsonb(m.permisos_extra)) into v_autor
  from public.miembros m where m.org_id = v_org and m.user_id = v_usuario;

  insert into public.operaciones (id, org_id, sucursal_id, usuario_id, tipo, op, resultado, autor)
  values (v_id, v_org, v_suc, v_usuario, v_tipo, op, v_res, v_autor)
  returning seq into v_seq;
  return jsonb_build_object('id', v_id, 'seq', v_seq, 'resultado', v_res);
end
$$;

revoke all on function public.aplicar_operacion(jsonb) from public, anon;
grant execute on function public.aplicar_operacion(jsonb) to authenticated;
revoke all on function app.op_extendida(text, uuid, uuid, boolean, jsonb) from public, anon, authenticated;

-- ───────────── 6. Lecturas de Forja ─────────────
-- security invoker: corren con los permisos de quien consulta, así que RLS de
-- cada tabla aplica igual; además cada lectura exige `forja.ver` en la sucursal.

-- Calor relativo: ventas de la última hora contra el promedio por hora hábil de
-- la sucursal en los últimos 28 días (0 = frío, 1 = promedio, ≥ 2 = muy caliente).
create or replace function public.forja_red(p_desde timestamptz default date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires') at time zone 'America/Argentina/Buenos_Aires')
returns table (
  sucursal_id uuid, nombre text, codigo text, tipo text, lat double precision, lng double precision, demo boolean,
  ventas_hoy bigint, importe_hoy bigint, ventas_ultima_hora bigint, promedio_hora numeric, calor numeric,
  presupuestos_abiertos bigint, stock_critico bigint, sin_stock bigint, ordenes jsonb
)
language sql stable security invoker
set search_path = ''
as $$
  select
    s.id, s.nombre, s.codigo, s.tipo, s.lat, s.lng, s.demo,
    (select count(*) from public.ventas v where v.sucursal_id = s.id and v.estado = 'confirmada' and v.fecha >= p_desde),
    (select coalesce(sum(v.total), 0)::bigint from public.ventas v where v.sucursal_id = s.id and v.estado = 'confirmada' and v.fecha >= p_desde),
    (select count(*) from public.ventas v where v.sucursal_id = s.id and v.estado = 'confirmada' and v.fecha >= now() - interval '1 hour'),
    h.promedio,
    case when h.promedio > 0 then round((select count(*) from public.ventas v where v.sucursal_id = s.id and v.estado = 'confirmada' and v.fecha >= now() - interval '1 hour') / h.promedio, 2) else 0 end,
    (select count(*) from public.presupuestos p where p.sucursal_id = s.id and p.estado in ('borrador', 'enviado', 'aceptado') and p.venta_id is null),
    (select count(*) from public.stock st where st.sucursal_id = s.id and st.minimo > 0 and st.cantidad > 0 and st.cantidad <= st.minimo),
    (select count(*) from public.stock st where st.sucursal_id = s.id and st.minimo > 0 and st.cantidad <= 0),
    coalesce((select jsonb_object_agg(o.estado, o.n) from (select os.estado, count(*) n from public.ordenes_servicio os where os.sucursal_id = s.id and os.estado <> 'entregado' group by os.estado) o), '{}'::jsonb)
  from public.sucursales s
  cross join lateral (
    select round(count(*)::numeric / (28 * 10), 3) as promedio
    from public.ventas v
    where v.sucursal_id = s.id and v.estado = 'confirmada' and v.fecha >= now() - interval '28 days'
  ) h
  where app.puede_sucursal(s.org_id, s.id, 'forja.ver')
$$;

-- El interior de una sucursal: racks por ubicación, puestos, bancos de servicio y muelle.
create or replace function public.forja_sucursal(p_sucursal uuid)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.sucursales where id = p_sucursal;
  if v_org is null or not app.puede_sucursal(v_org, p_sucursal, 'forja.ver') then
    raise exception 'permiso_denegado: forja.ver en sucursal' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'racks', coalesce((
      select jsonb_agg(jsonb_build_object('rack', r.rack, 'productos', r.productos, 'unidades', r.unidades, 'criticos', r.criticos, 'sin_stock', r.sin_stock) order by r.rack)
      from (
        select split_part(st.ubicacion, '-', 1) || '-' || left(split_part(st.ubicacion, '-', 2), 1) as rack,
               count(*) as productos, sum(greatest(st.cantidad, 0)) as unidades,
               count(*) filter (where st.minimo > 0 and st.cantidad > 0 and st.cantidad <= st.minimo) as criticos,
               count(*) filter (where st.minimo > 0 and st.cantidad <= 0) as sin_stock
        from public.stock st
        where st.sucursal_id = p_sucursal and st.ubicacion <> ''
        group by 1
      ) r), '[]'::jsonb),
    'puestos', coalesce((
      select jsonb_agg(jsonb_build_object('puesto', v.puesto, 'ventas', v.n, 'sin_conexion', v.sin_conexion) order by v.puesto)
      from (
        select v.puesto, count(*) n, count(*) filter (where v.origen = 'sin_conexion') sin_conexion
        from public.ventas v
        where v.sucursal_id = p_sucursal and v.fecha >= date_trunc('day', now())
        group by v.puesto
      ) v), '[]'::jsonb),
    'bancos', coalesce((
      select jsonb_agg(jsonb_build_object('id', os.id, 'numero', os.numero, 'estado', os.estado, 'equipo', os.equipo ->> 'tipo', 'desde', os.fecha_ingreso) order by os.fecha_ingreso)
      from public.ordenes_servicio os
      where os.sucursal_id = p_sucursal and os.estado <> 'entregado'), '[]'::jsonb),
    'muelle', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'estado', e.estado, 'franja', e.franja) order by e.orden)
      from public.entregas e
      where e.sucursal_id = p_sucursal and e.fecha_programada >= date_trunc('day', now()) and e.fecha_programada < date_trunc('day', now()) + interval '1 day'), '[]'::jsonb)
  );
end
$$;

-- El recorrido de un producto por las sucursales que la persona puede ver en Forja.
create or replace function public.forja_pieza(p_producto uuid, p_dias int default 60)
returns table (fecha timestamptz, sucursal_id uuid, tipo text, cantidad numeric, ref_id uuid)
language sql stable security invoker
set search_path = ''
as $$
  select m.fecha, m.sucursal_id, m.tipo, m.cantidad, m.ref_id
  from public.movimientos_stock m
  where m.producto_id = p_producto
    and m.fecha >= now() - make_interval(days => least(greatest(p_dias, 1), 365))
    and app.puede_sucursal(m.org_id, m.sucursal_id, 'forja.ver')
  order by m.fecha
$$;

-- Transferencias en tránsito: la vista corre con los permisos de quien consulta (RLS de transferencias).
create view public.forja_transferencias_en_transito with (security_invoker = true) as
  select t.id, t.org_id, t.desde_id, t.hacia_id, t.items, t.motivo, t.despachada_en, t.llegada_estimada, t.usuario_id
  from public.transferencias t
  where t.estado = 'en_transito';
grant select on public.forja_transferencias_en_transito to authenticated;

revoke all on function public.forja_red(timestamptz), public.forja_sucursal(uuid), public.forja_pieza(uuid, int) from public, anon;
grant execute on function public.forja_red(timestamptz), public.forja_sucursal(uuid), public.forja_pieza(uuid, int) to authenticated;

-- ───────────── 7. Tiempo real: Broadcast a canales privados por sucursal ─────────────
-- Un canal por sucursal: org:{org_id}:suc:{sucursal_id}. Nunca uno por organización
-- entera (filtraría eventos de otras sucursales a quien no debe verlos).

-- ¿Puede la persona actual escuchar este canal? Solo topics bien formados y con forja.ver.
create or replace function app.puede_escuchar_forja(p_topic text)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_partes text[];
begin
  if p_topic is null then return false; end if;
  v_partes := regexp_match(p_topic, '^org:([0-9a-f-]{36}):suc:([0-9a-f-]{36})$');
  if v_partes is null then return false; end if;
  return app.puede_sucursal(v_partes[1]::uuid, v_partes[2]::uuid, 'forja.ver');
end
$$;
revoke all on function app.puede_escuchar_forja(text) from public, anon;
grant execute on function app.puede_escuchar_forja(text) to authenticated;

create policy forja_escuchar on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and app.puede_escuchar_forja(realtime.topic()));
-- Sin política de INSERT: los clientes no emiten en estos canales; solo la base, por triggers.

create or replace function app.forja_emitir(p_org uuid, p_sucursal uuid, p_evento text, p_payload jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_sucursal is null then return; end if;
  if not exists (select 1 from public.extensiones_org e where e.org_id = p_org and e.extension = 'forja' and e.activa) then return; end if;
  perform realtime.send(p_payload || jsonb_build_object('sucursal_id', p_sucursal, 'en', now()), p_evento, 'org:' || p_org || ':suc:' || p_sucursal, true);
end
$$;
revoke all on function app.forja_emitir(uuid, uuid, text, jsonb) from public, anon, authenticated;

create or replace function app.forja_trigger()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_st public.stock;
begin
  case tg_table_name
  when 'ventas' then
    perform app.forja_emitir(new.org_id, new.sucursal_id, 'venta',
      jsonb_build_object('id', new.id, 'numero', new.numero, 'puesto', new.puesto, 'total', new.total, 'sin_conexion', new.origen = 'sin_conexion'));
  when 'movimientos_stock' then
    select * into v_st from public.stock where sucursal_id = new.sucursal_id and producto_id = new.producto_id;
    perform app.forja_emitir(new.org_id, new.sucursal_id, 'stock',
      jsonb_build_object('producto_id', new.producto_id, 'tipo', new.tipo, 'cantidad', new.cantidad, 'queda', v_st.cantidad, 'minimo', v_st.minimo, 'ubicacion', v_st.ubicacion));
  when 'transferencias' then
    perform app.forja_emitir(new.org_id, new.desde_id, 'transferencia',
      jsonb_build_object('id', new.id, 'estado', new.estado, 'desde_id', new.desde_id, 'hacia_id', new.hacia_id, 'llegada_estimada', new.llegada_estimada, 'items', jsonb_array_length(new.items)));
    perform app.forja_emitir(new.org_id, new.hacia_id, 'transferencia',
      jsonb_build_object('id', new.id, 'estado', new.estado, 'desde_id', new.desde_id, 'hacia_id', new.hacia_id, 'llegada_estimada', new.llegada_estimada, 'items', jsonb_array_length(new.items)));
  when 'ordenes_servicio' then
    if tg_op = 'INSERT' or new.estado is distinct from old.estado then
      perform app.forja_emitir(new.org_id, new.sucursal_id, 'servicio',
        jsonb_build_object('id', new.id, 'numero', new.numero, 'estado', new.estado, 'equipo', new.equipo ->> 'tipo'));
    end if;
  else
    null;
  end case;
  return null;
end
$$;
revoke all on function app.forja_trigger() from public, anon, authenticated;

create trigger forja_en_vivo after insert on public.ventas for each row execute function app.forja_trigger();
create trigger forja_en_vivo after insert on public.movimientos_stock for each row execute function app.forja_trigger();
create trigger forja_en_vivo after insert or update on public.transferencias for each row execute function app.forja_trigger();
create trigger forja_en_vivo after insert or update of estado on public.ordenes_servicio for each row execute function app.forja_trigger();
