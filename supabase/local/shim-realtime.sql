-- Realtime con autorización (Broadcast a canales privados), como en Supabase:
-- realtime.messages con RLS, realtime.topic() (el canal que se está autorizando)
-- y realtime.send() (lo que usan los triggers para emitir).
create schema realtime;
create table realtime.messages (
  id bigserial primary key,
  topic text not null,
  extension text not null,
  payload jsonb,
  event text,
  private boolean default false,
  inserted_at timestamptz not null default now()
);
alter table realtime.messages enable row level security;
grant usage on schema realtime to anon, authenticated, service_role;
grant select on realtime.messages to authenticated;

create function realtime.topic() returns text language sql stable as $$
  select nullif(current_setting('realtime.topic', true), '')
$$;
grant execute on function realtime.topic() to anon, authenticated, service_role;

create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
language sql security definer as $$
  insert into realtime.messages (topic, extension, payload, event, private) values (topic, 'broadcast', payload, event, private)
$$;
