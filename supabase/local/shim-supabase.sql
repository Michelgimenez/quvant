-- Réplica mínima de lo que Supabase provee y nuestras migraciones usan:
-- roles anon / authenticated / service_role, auth.users, auth.uid() y auth.jwt().
-- Las funciones leen request.jwt.claims igual que en Supabase (PostgREST).

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create table auth.users (id uuid primary key, email text);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;

-- Como Supabase: todo lo que se crea en public queda otorgado por defecto a los
-- roles de la API (después las migraciones tienen que revocar lo que sobra).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
