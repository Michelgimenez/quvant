-- Privilegios justos para los roles de la API (defensa en profundidad).
--
-- Supabase otorga por defecto ALL sobre cada tabla, secuencia y función nueva de
-- public a anon y authenticated. La 0300 revocó todo sobre las tablas que existían
-- en ese momento; las creadas después (auditoría, operaciones, intentos de
-- ingreso) quedaban con privilegios de más. RLS forzado ya filtraba las filas,
-- pero la autorización no debe depender de una sola capa.

-- 1. Lo que se cree de acá en adelante no recibe privilegios automáticos.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- 2. Tablas creadas después de la 0300: solo lo necesario.
revoke all on public.auditoria, public.operaciones, public.operaciones_rechazadas, public.intentos_ingreso
  from anon, authenticated;
grant select on public.auditoria, public.operaciones, public.operaciones_rechazadas to authenticated;

-- 3. Ninguna secuencia de public para los roles de la API.
revoke all on all sequences in schema public from anon, authenticated;
