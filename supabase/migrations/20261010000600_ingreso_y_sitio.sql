-- ════════════════════════════════════════════════════════════════════
-- Yunque · 0006 · Límite de intentos de ingreso y solicitudes del sitio
-- ════════════════════════════════════════════════════════════════════

-- ───────────── Intentos de ingreso ─────────────
-- Se guarda un hash del email (no el email) y la IP. Solo el servidor
-- (service_role) llama a estas funciones; el navegador nunca.

create table public.intentos_ingreso (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip text not null,
  exito boolean not null,
  fecha timestamptz not null default now()
);
create index intentos_ingreso_email_idx on public.intentos_ingreso (email_hash, fecha desc);
create index intentos_ingreso_ip_idx on public.intentos_ingreso (ip, fecha desc);
alter table public.intentos_ingreso enable row level security;
alter table public.intentos_ingreso force row level security;

-- Política: 5 fallos por email o 20 por IP en 15 minutos bloquean hasta que
-- pasen 15 minutos desde el primer fallo de la ventana.
create or replace function app.ingreso_permitido(p_email_hash text, p_ip text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_desde timestamptz := now() - interval '15 minutes';
  v_fallos_email int;
  v_fallos_ip int;
  v_primero timestamptz;
begin
  select count(*), min(fecha) into v_fallos_email, v_primero
  from public.intentos_ingreso
  where email_hash = p_email_hash and not exito and fecha > v_desde
    -- por id (orden de registro), no por fecha: now() es igual dentro de una transacción
    and id > coalesce((select max(id) from public.intentos_ingreso
                       where email_hash = p_email_hash and exito), 0);
  select count(*) into v_fallos_ip
  from public.intentos_ingreso
  where ip = p_ip and not exito and fecha > v_desde;

  if v_fallos_email >= 5 or v_fallos_ip >= 20 then
    return jsonb_build_object(
      'permitido', false,
      'espera_segundos', greatest(1, extract(epoch from (coalesce(v_primero, now()) + interval '15 minutes' - now()))::int)
    );
  end if;
  return jsonb_build_object('permitido', true, 'restantes', 5 - v_fallos_email);
end
$$;

create or replace function app.registrar_ingreso(p_email_hash text, p_ip text, p_exito boolean)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.intentos_ingreso (email_hash, ip, exito) values (p_email_hash, p_ip, p_exito);
$$;

revoke all on function app.ingreso_permitido(text, text), app.registrar_ingreso(text, text, boolean) from public, anon, authenticated;
grant usage on schema app to service_role;
grant execute on function app.ingreso_permitido(text, text), app.registrar_ingreso(text, text, boolean) to service_role;

-- ───────────── Solicitudes de demo del sitio ─────────────
-- El formulario público inserta; nadie lee desde el navegador.

create table public.solicitudes_demo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(nombre) between 2 and 120),
  negocio text not null check (length(negocio) between 2 and 160),
  rubro text not null check (length(rubro) between 2 and 80),
  sucursales smallint not null check (sucursales between 1 and 500),
  sistema_actual text not null default '' check (length(sistema_actual) <= 160),
  whatsapp text not null check (whatsapp ~ '^\+?[0-9 ()-]{8,24}$'),
  socio_fundador boolean not null default false,
  origen text not null default 'sitio' check (origen in ('sitio', 'socios', 'demo')),
  creada_en timestamptz not null default now()
);
alter table public.solicitudes_demo enable row level security;
alter table public.solicitudes_demo force row level security;
grant insert on public.solicitudes_demo to anon, authenticated;
create policy solicitudes_demo_insert on public.solicitudes_demo for insert to anon, authenticated
  with check (creada_en > now() - interval '1 minute');
