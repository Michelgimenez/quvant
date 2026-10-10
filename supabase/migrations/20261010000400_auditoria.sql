-- ════════════════════════════════════════════════════════════════════
-- Yunque · 0004 · Registro de auditoría y libros de solo-agregar
--
--  * Cada INSERT/UPDATE/DELETE en tablas de negocio deja una fila en
--    public.auditoria con usuario (auth.uid()), tabla, fila, cambios y la
--    operación de sincronización que lo causó (app.op_id / app.op_tipo).
--  * auditoria, movimientos_stock, movimientos_cuenta y operaciones son
--    de solo-agregar: UPDATE, DELETE y TRUNCATE se rechazan por trigger,
--    también para el dueño de la tabla.
-- ════════════════════════════════════════════════════════════════════

create table public.auditoria (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  fecha timestamptz not null default now(),
  usuario_id uuid,
  tabla text not null,
  accion text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  fila_id text,
  op_id uuid,
  op_tipo text,
  antes jsonb,
  despues jsonb
);
create index auditoria_org_fecha_idx on public.auditoria (org_id, fecha desc);

alter table public.auditoria enable row level security;
alter table public.auditoria force row level security;
grant select on public.auditoria to authenticated;
create policy auditoria_select on public.auditoria for select to authenticated
  using (org_id in (select app.orgs_con_permiso('auditoria.ver')));

create or replace function app.auditar()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_antes jsonb;
  v_despues jsonb;
  v_org uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_antes := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_despues := to_jsonb(new); end if;

  v_org := coalesce(
    (coalesce(v_despues, v_antes) ->> 'org_id')::uuid,
    case when tg_table_name = 'organizaciones' then (coalesce(v_despues, v_antes) ->> 'id')::uuid end
  );

  -- En UPDATE se guardan solo las columnas que cambiaron.
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(d.key, d.value) into v_despues
    from jsonb_each(to_jsonb(new)) d
    where d.value is distinct from (v_antes -> d.key);
    if v_despues is null then
      return null; -- sin cambios reales
    end if;
    select jsonb_object_agg(a.key, a.value) into v_antes
    from jsonb_each(to_jsonb(old)) a
    where v_despues ? a.key;
  end if;

  insert into public.auditoria (org_id, usuario_id, tabla, accion, fila_id, op_id, op_tipo, antes, despues)
  values (
    v_org,
    auth.uid(),
    tg_table_name,
    tg_op,
    coalesce(v_despues ->> 'id', v_antes ->> 'id', coalesce(v_despues, v_antes) ->> 'producto_id'),
    nullif(current_setting('app.op_id', true), '')::uuid,
    nullif(current_setting('app.op_tipo', true), ''),
    v_antes,
    v_despues
  );
  return null;
end
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizaciones', 'miembros', 'negocios', 'sucursales', 'categorias', 'marcas', 'proveedores',
    'productos', 'listas_precios', 'precios', 'clientes', 'ventas', 'presupuestos', 'ordenes_servicio',
    'ordenes_compra', 'entregas', 'sesiones_caja', 'movimientos_caja', 'conteos', 'aumentos_precio'
  ] loop
    execute format(
      'create trigger auditar after insert or update or delete on public.%I for each row execute function app.auditar()',
      t
    );
  end loop;
end
$$;

-- ───────────── Solo-agregar ─────────────

create or replace function app.solo_agregar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'tabla_solo_agregar: % no admite %', tg_table_name, tg_op using errcode = '42501';
end
$$;

do $$
declare t text;
begin
  foreach t in array array['auditoria', 'movimientos_stock', 'movimientos_cuenta'] loop
    execute format(
      'create trigger solo_agregar before update or delete on public.%I for each row execute function app.solo_agregar()',
      t
    );
    execute format(
      'create trigger solo_agregar_truncate before truncate on public.%I for each statement execute function app.solo_agregar()',
      t
    );
  end loop;
end
$$;
