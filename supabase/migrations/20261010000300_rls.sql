-- ════════════════════════════════════════════════════════════════════
-- Yunque · 0003 · Row Level Security
--
-- Modelo:
--  * RLS activado en TODAS las tablas de public (un test lo verifica).
--  * Los roles anon y authenticated NO tienen INSERT/UPDATE/DELETE en las
--    tablas de negocio: las escrituras pasan por app.aplicar_operacion()
--    (security definer), que valida permiso, sucursal e idempotencia.
--  * SELECT por organización + permiso del rol + sucursal (cuando aplica).
--  * Columnas protegidas: productos.costo y venta_items.costo_unitario no
--    se otorgan a authenticated (se leen con app.costos_productos()).
-- ════════════════════════════════════════════════════════════════════

-- Sin privilegios por defecto para clientes.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema app from public, anon;
grant execute on function
  app.aal2(), app.membresias(), app.mis_orgs(), app.orgs_con_permiso(text),
  app.sucursales_con_permiso(text), app.tiene_permiso(uuid, text),
  app.puede_sucursal(uuid, uuid, text), app.costos_productos(uuid)
to authenticated;

-- Activar RLS en todas las tablas.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('alter table public.%I force row level security', t.tablename);
  end loop;
end
$$;

-- ───────────── Organización y estructura (cualquier miembro válido) ─────────────

grant select on public.organizaciones, public.negocios, public.sucursales, public.miembros,
  public.categorias, public.marcas, public.listas_precios, public.permisos_rol to authenticated;

create policy organizaciones_select on public.organizaciones for select to authenticated
  using (id in (select app.mis_orgs()));

create policy negocios_select on public.negocios for select to authenticated
  using (org_id in (select app.mis_orgs()));

create policy sucursales_select on public.sucursales for select to authenticated
  using (org_id in (select app.mis_orgs()));

-- Cada miembro ve a las personas de su organización (nombres y roles para asignar tareas).
create policy miembros_select on public.miembros for select to authenticated
  using (org_id in (select app.mis_orgs()) or user_id = auth.uid());

create policy categorias_select on public.categorias for select to authenticated
  using (org_id in (select app.mis_orgs()));

create policy marcas_select on public.marcas for select to authenticated
  using (org_id in (select app.mis_orgs()));

create policy listas_precios_select on public.listas_precios for select to authenticated
  using (org_id in (select app.mis_orgs()));

create policy permisos_rol_select on public.permisos_rol for select to authenticated
  using (true);

-- ───────────── Catálogo y precios ─────────────

-- productos: todas las columnas menos costo.
grant select (id, org_id, sku, codigo_barras, nombre, categoria_id, marca_id, proveedor_id, unidad, iva,
  ilustracion, activo, actualizado_en) on public.productos to authenticated;
create policy productos_select on public.productos for select to authenticated
  using (org_id in (select app.orgs_con_permiso('inventario.ver')));

grant select on public.proveedores to authenticated;
create policy proveedores_select on public.proveedores for select to authenticated
  using (org_id in (select app.orgs_con_permiso('compras.ver')) or org_id in (select app.orgs_con_permiso('inventario.editar')));

grant select on public.precios to authenticated;
create policy precios_select on public.precios for select to authenticated
  using (org_id in (select app.orgs_con_permiso('precios.ver')));

grant select on public.aumentos_precio to authenticated;
create policy aumentos_precio_select on public.aumentos_precio for select to authenticated
  using (org_id in (select app.orgs_con_permiso('precios.editar')));

-- ───────────── Stock (por sucursal) ─────────────

grant select on public.stock, public.movimientos_stock, public.conteos to authenticated;

create policy stock_select on public.stock for select to authenticated
  using (sucursal_id in (select app.sucursales_con_permiso('inventario.ver')));

create policy movimientos_stock_select on public.movimientos_stock for select to authenticated
  using (sucursal_id in (select app.sucursales_con_permiso('inventario.ver')));

create policy conteos_select on public.conteos for select to authenticated
  using (sucursal_id in (select app.sucursales_con_permiso('inventario.ver')));

-- ───────────── Clientes ─────────────

grant select on public.clientes, public.movimientos_cuenta to authenticated;

create policy clientes_select on public.clientes for select to authenticated
  using (org_id in (select app.orgs_con_permiso('clientes.ver')));

create policy movimientos_cuenta_select on public.movimientos_cuenta for select to authenticated
  using (org_id in (select app.orgs_con_permiso('clientes.ver')));

-- ───────────── Ventas (por sucursal) ─────────────

grant select on public.ventas, public.pagos to authenticated;
grant select (id, org_id, venta_id, producto_id, descripcion, cantidad, precio_unitario, descuento_pct)
  on public.venta_items to authenticated;

create policy ventas_select on public.ventas for select to authenticated
  using (sucursal_id in (select app.sucursales_con_permiso('ventas.ver')));

-- Los ítems y pagos heredan la visibilidad de su venta (la subconsulta aplica RLS de ventas).
create policy venta_items_select on public.venta_items for select to authenticated
  using (exists (select 1 from public.ventas v where v.id = venta_id and v.org_id = venta_items.org_id));

create policy pagos_select on public.pagos for select to authenticated
  using (exists (select 1 from public.ventas v where v.id = venta_id and v.org_id = pagos.org_id));

-- ───────────── Presupuestos ─────────────

grant select on public.presupuestos, public.presupuesto_items to authenticated;

create policy presupuestos_select on public.presupuestos for select to authenticated
  using (sucursal_id in (select app.sucursales_con_permiso('presupuestos.ver')));

create policy presupuesto_items_select on public.presupuesto_items for select to authenticated
  using (exists (select 1 from public.presupuestos p where p.id = presupuesto_id and p.org_id = presupuesto_items.org_id));

-- ───────────── Servicio técnico, compras, entregas ─────────────

grant select on public.ordenes_servicio, public.ordenes_compra, public.entregas to authenticated;

create policy ordenes_servicio_select on public.ordenes_servicio for select to authenticated
  using (sucursal_id in (select app.sucursales_con_permiso('servicio.ver')));

create policy ordenes_compra_select on public.ordenes_compra for select to authenticated
  using (sucursal_id in (select app.sucursales_con_permiso('compras.ver')));

create policy entregas_select on public.entregas for select to authenticated
  using (sucursal_id in (select app.sucursales_con_permiso('entregas.ver')));

-- ───────────── Caja ─────────────

grant select on public.sesiones_caja, public.movimientos_caja to authenticated;

create policy sesiones_caja_select on public.sesiones_caja for select to authenticated
  using (
    sucursal_id in (select app.sucursales_con_permiso('caja.operar'))
    or sucursal_id in (select app.sucursales_con_permiso('reportes.ver'))
  );

create policy movimientos_caja_select on public.movimientos_caja for select to authenticated
  using (
    sucursal_id in (select app.sucursales_con_permiso('caja.operar'))
    or sucursal_id in (select app.sucursales_con_permiso('reportes.ver'))
  );

-- numeradores: sin acceso para clientes (solo funciones de escritura).
-- RLS activo y sin políticas = nadie lo lee con anon/authenticated.
