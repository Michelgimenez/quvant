-- Seguimiento de las solicitudes de "Pedir una demo".
-- El equipo de Yunque las ve en /panel (con clave) y las marca como contactadas.
-- Solo service_role las lee y actualiza (salta RLS); anon y authenticated solo insertan.

alter table public.solicitudes_demo add column contactada_en timestamptz;

-- Inserción por columnas: desde el sitio no se puede fijar id, fechas ni el estado.
-- (revoke all: Supabase otorga ALL por defecto sobre cada tabla nueva de public)
revoke all on public.solicitudes_demo from anon, authenticated;
grant insert (nombre, negocio, rubro, sucursales, sistema_actual, whatsapp, socio_fundador, origen)
  on public.solicitudes_demo to anon, authenticated;

create index solicitudes_demo_pendientes on public.solicitudes_demo (creada_en desc) where contactada_en is null;
