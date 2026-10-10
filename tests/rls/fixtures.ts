import type { PGlite } from "@electric-sql/pglite"

/** UUID determinístico: el prefijo (hasta 4 letras) se codifica en hex. id("ua", 1) → 75610000-0000-4000-8000-000000000001 */
export function id(pref: string, n: number) {
  const hex = [...pref].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  return `${hex.padEnd(8, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`
}

export const ORG = { A: id("a", 1), B: id("b", 1) }
export const USR = {
  duenoA: id("ua", 1),
  mostradorA1: id("ua", 2), // solo sucursal A1
  tecnicoA: id("ua", 3),
  depositoA: id("ua", 4),
  inactivoA: id("ua", 5),
  duenoB: id("ub", 1),
  mostradorB: id("ub", 2),
}
export const SUC = { A1: id("sa", 1), A2: id("sa", 2), B1: id("sb", 1) }

/**
 * Siembra dos organizaciones completas (A y B) con datos en todas las tablas
 * de negocio. Se ejecuta como superusuario (sin RLS), igual que una migración.
 */
export async function sembrar(db: PGlite) {
  const usuarios = Object.values(USR)
  await db.query(`insert into auth.users (id, email) select unnest($1::uuid[]), 'x@y.z'`, [usuarios])

  for (const [org, letra] of [
    [ORG.A, "a"],
    [ORG.B, "b"],
  ] as const) {
    const n = id(`n${letra}`, 1)
    const cat = id(`c${letra}`, 1)
    const mar = id(`m${letra}`, 1)
    const prov = id(`p${letra}`, 1)
    const prod = id(`pr${letra}`, 1)
    const lista = id(`l${letra}`, 1)
    const cli = id(`cl${letra}`, 1)
    const suc = letra === "a" ? [SUC.A1, SUC.A2] : [SUC.B1]

    await db.exec(`
      insert into organizaciones (id, nombre, slug) values ('${org}', 'Org ${letra}', 'org-${letra}');
      insert into negocios (id, org_id, nombre) values ('${n}', '${org}', 'Negocio ${letra}');
      insert into categorias (id, org_id, nombre) values ('${cat}', '${org}', 'Herramientas');
      insert into marcas (id, org_id, nombre) values ('${mar}', '${org}', 'Marca ${letra}');
      insert into proveedores (id, org_id, nombre) values ('${prov}', '${org}', 'Proveedor ${letra}');
      insert into listas_precios (id, org_id, nombre, es_default) values ('${lista}', '${org}', 'Minorista', true);
      insert into productos (id, org_id, sku, nombre, categoria_id, marca_id, proveedor_id, costo)
        values ('${prod}', '${org}', 'SKU-${letra}', 'Taladro ${letra}', '${cat}', '${mar}', '${prov}', 100000);
      insert into precios (org_id, producto_id, lista_id, precio) values ('${org}', '${prod}', '${lista}', 180000);
      insert into clientes (id, org_id, nombre, lista_id) values ('${cli}', '${org}', 'Cliente ${letra}', '${lista}');
      insert into movimientos_cuenta (org_id, cliente_id, tipo, importe) values ('${org}', '${cli}', 'venta', 180000);
      insert into aumentos_precio (org_id, usuario_id, descripcion, porcentaje, lista_ids)
        values ('${org}', '${id(`u${letra}`, 1)}', 'Aumento ${letra}', 10, array['${lista}']::uuid[]);
    `)

    for (const [i, s] of suc.entries()) {
      const v = id(`v${letra}`, i + 1)
      const pre = id(`q${letra}`, i + 1)
      const caja = id(`k${letra}`, i + 1)
      await db.exec(`
        insert into sucursales (id, org_id, negocio_id, nombre, codigo) values ('${s}', '${org}', '${n}', 'Suc ${i}', '${letra.toUpperCase()}${i + 1}');
        insert into numeradores (org_id, clave, ultimo) values ('${org}', 'venta:${letra.toUpperCase()}${i + 1}', 100), ('${org}', 'presupuesto:${letra.toUpperCase()}${i + 1}', 100);
        insert into stock (org_id, sucursal_id, producto_id, cantidad) values ('${org}', '${s}', '${prod}', 10);
        insert into movimientos_stock (org_id, sucursal_id, producto_id, tipo, cantidad) values ('${org}', '${s}', '${prod}', 'inicial', 10);
        insert into ventas (id, org_id, negocio_id, sucursal_id, numero, numero_local, fecha, lista_id, total, vendedor_id)
          values ('${v}', '${org}', '${n}', '${s}', ${i + 1}, 'L${i}', now(), '${lista}', 180000, '${id(`u${letra}`, 1)}');
        insert into venta_items (org_id, venta_id, producto_id, descripcion, cantidad, precio_unitario, costo_unitario)
          values ('${org}', '${v}', '${prod}', 'Taladro', 1, 180000, 100000);
        insert into pagos (org_id, venta_id, medio, importe) values ('${org}', '${v}', 'efectivo', 180000);
        insert into presupuestos (id, org_id, negocio_id, sucursal_id, numero_local, fecha, vencimiento, lista_id, total, vendedor_id)
          values ('${pre}', '${org}', '${n}', '${s}', 'P${i}', now(), now() + interval '7 days', '${lista}', 180000, '${id(`u${letra}`, 1)}');
        insert into presupuesto_items (org_id, presupuesto_id, producto_id, descripcion, cantidad, precio_unitario)
          values ('${org}', '${pre}', '${prod}', 'Taladro', 1, 180000);
        insert into ordenes_servicio (org_id, sucursal_id, numero_local, fecha_ingreso, fecha_prometida, cliente_id, equipo)
          values ('${org}', '${s}', 'S${i}', now(), now(), '${cli}', '{"tipo":"taladro"}');
        insert into ordenes_compra (org_id, sucursal_id, proveedor_id, numero_local, fecha) values ('${org}', '${s}', '${prov}', 'C${i}', now());
        insert into entregas (org_id, sucursal_id, venta_id, destinatario, direccion, fecha_programada)
          values ('${org}', '${s}', '${v}', 'Cliente', 'Calle 1', now());
        insert into sesiones_caja (id, org_id, sucursal_id, puesto, abierta_por, apertura) values ('${caja}', '${org}', '${s}', 1, '${id(`u${letra}`, 1)}', now());
        insert into movimientos_caja (org_id, sucursal_id, sesion_id, tipo, importe, usuario_id) values ('${org}', '${s}', '${caja}', 'retiro', 1000, '${id(`u${letra}`, 1)}');
        insert into conteos (org_id, sucursal_id, fecha, nombre, usuario_id) values ('${org}', '${s}', now(), 'Conteo', '${id(`u${letra}`, 1)}');
      `)
    }
  }

  await db.query(
    `insert into miembros (org_id, user_id, nombre, email, rol, sucursales, activo) values
      ($1, $3, 'Dueña A', 'a@a', 'dueno', null, true),
      ($1, $4, 'Mostrador A1', 'm@a', 'mostrador', array[$8]::uuid[], true),
      ($1, $5, 'Técnico A', 't@a', 'tecnico', null, true),
      ($1, $6, 'Depósito A', 'd@a', 'deposito', null, true),
      ($1, $7, 'Inactivo A', 'i@a', 'mostrador', null, false),
      ($2, $9, 'Dueño B', 'b@b', 'dueno', null, true),
      ($2, $10, 'Mostrador B', 'mb@b', 'mostrador', null, true)`,
    [
      ORG.A,
      ORG.B,
      USR.duenoA,
      USR.mostradorA1,
      USR.tecnicoA,
      USR.depositoA,
      USR.inactivoA,
      SUC.A1,
      USR.duenoB,
      USR.mostradorB,
    ],
  )
}
