-- ════════════════════════════════════════════════════════════════════
-- Yunque · 0002 · Permisos por rol y funciones auxiliares de RLS
--
-- La matriz es la misma que src/dominio/permisos.ts (tests/rls verifica
-- que coincidan). Dueño y Administración exigen doble factor: si el JWT no
-- trae aal = 'aal2', esos roles no tienen ningún permiso.
-- ════════════════════════════════════════════════════════════════════

create table public.permisos_rol (
  rol text not null check (rol in ('dueno', 'administracion', 'mostrador', 'deposito', 'tecnico', 'compras')),
  permiso text not null,
  primary key (rol, permiso)
);

insert into public.permisos_rol (rol, permiso)
select r.rol, p.permiso
from (values ('dueno'), ('administracion')) as r (rol)
cross join unnest(array[
  'tablero.ver', 'inventario.ver', 'inventario.editar', 'stock.ajustar', 'stock.transferir', 'conteo.realizar',
  'costos.ver', 'precios.ver', 'precios.editar', 'mostrador.vender', 'caja.operar', 'ventas.ver', 'ventas.anular',
  'presupuestos.ver', 'presupuestos.editar', 'servicio.ver', 'servicio.editar', 'clientes.ver', 'clientes.editar',
  'cuentas.cobrar', 'compras.ver', 'compras.editar', 'compras.recibir', 'entregas.ver', 'entregas.editar',
  'reportes.ver', 'usuarios.gestionar', 'config.editar', 'auditoria.ver', 'importar.datos'
]) as p (permiso);

insert into public.permisos_rol (rol, permiso)
select 'mostrador', unnest(array[
  'tablero.ver', 'inventario.ver', 'precios.ver', 'mostrador.vender', 'caja.operar', 'ventas.ver',
  'presupuestos.ver', 'presupuestos.editar', 'servicio.ver', 'servicio.editar', 'clientes.ver', 'clientes.editar',
  'cuentas.cobrar', 'entregas.ver'
])
union all
select 'deposito', unnest(array[
  'tablero.ver', 'inventario.ver', 'inventario.editar', 'stock.ajustar', 'stock.transferir', 'conteo.realizar',
  'precios.ver', 'compras.ver', 'compras.recibir', 'entregas.ver', 'entregas.editar'
])
union all
select 'tecnico', unnest(array[
  'tablero.ver', 'inventario.ver', 'precios.ver', 'servicio.ver', 'servicio.editar', 'clientes.ver'
])
union all
select 'compras', unnest(array[
  'tablero.ver', 'inventario.ver', 'inventario.editar', 'costos.ver', 'precios.ver', 'precios.editar',
  'compras.ver', 'compras.editar', 'compras.recibir', 'reportes.ver', 'importar.datos'
]);

-- ───────────── Funciones auxiliares (security definer, search_path vacío) ─────────────

-- ¿El JWT actual tiene doble factor verificado?
create or replace function app.aal2()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

-- Membresías activas y válidas del usuario actual (respeta la regla de 2FA).
create or replace function app.membresias()
returns setof public.miembros
language sql stable security definer
set search_path = ''
as $$
  select m.*
  from public.miembros m
  where m.user_id = auth.uid()
    and m.activo
    and (m.rol not in ('dueno', 'administracion') or app.aal2())
$$;

-- Organizaciones donde el usuario es miembro válido.
create or replace function app.mis_orgs()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select m.org_id from app.membresias() m
$$;

-- Organizaciones donde el usuario tiene un permiso.
create or replace function app.orgs_con_permiso(p_permiso text)
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select m.org_id
  from app.membresias() m
  join public.permisos_rol pr on pr.rol = m.rol and pr.permiso = p_permiso
$$;

-- Sucursales donde el usuario tiene un permiso (todas si su alcance es null).
create or replace function app.sucursales_con_permiso(p_permiso text)
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select s.id
  from app.membresias() m
  join public.permisos_rol pr on pr.rol = m.rol and pr.permiso = p_permiso
  join public.sucursales s on s.org_id = m.org_id
  where m.sucursales is null or s.id = any (m.sucursales)
$$;

create or replace function app.tiene_permiso(p_org uuid, p_permiso text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from app.orgs_con_permiso(p_permiso) as o (id) where o.id = p_org)
$$;

create or replace function app.puede_sucursal(p_org uuid, p_sucursal uuid, p_permiso text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.sucursales_con_permiso(p_permiso) as s (id)
    join public.sucursales su on su.id = s.id
    where s.id = p_sucursal and su.org_id = p_org
  )
$$;

-- Lanza error si falta el permiso (para usar dentro de funciones de escritura).
create or replace function app.exigir_permiso(p_org uuid, p_permiso text, p_sucursal uuid default null)
returns void
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'no_autenticado' using errcode = '28000';
  end if;
  if p_sucursal is null then
    if not app.tiene_permiso(p_org, p_permiso) then
      raise exception 'permiso_denegado: %', p_permiso using errcode = '42501';
    end if;
  elsif not app.puede_sucursal(p_org, p_sucursal, p_permiso) then
    raise exception 'permiso_denegado: % en sucursal', p_permiso using errcode = '42501';
  end if;
end
$$;

-- Costos: columna protegida. Solo quien tiene costos.ver los obtiene.
create or replace function app.costos_productos(p_org uuid)
returns table (producto_id uuid, costo bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform app.exigir_permiso(p_org, 'costos.ver');
  return query select p.id, p.costo from public.productos p where p.org_id = p_org;
end
$$;

revoke all on function app.costos_productos(uuid) from public;
grant usage on schema app to authenticated, anon;
grant execute on function app.costos_productos(uuid) to authenticated;
