-- ---------------------------------------------------------------------------
-- Pruebas de 20261004_tienda_web.sql — SOLO para una base descartable (Docker).
-- NUNCA correr contra Supabase real: crea usuarios, ventas y el esquema "prueba".
-- Correr como postgres con:  psql -X -v ON_ERROR_STOP=1 -f prueba_tienda_web.sql
-- Cada prueba es un bloque DO con ASSERT: si algo falla, el script se corta
-- con "FALLO ...". Si llega al final imprime "TODAS LAS PRUEBAS PASARON".
-- ---------------------------------------------------------------------------
\set QUIET on
set client_min_messages = notice;

-- Ayudantes ---------------------------------------------------------------------
drop schema if exists prueba cascade;
create schema prueba;

-- arma el body como lo manda la landing
create function prueba.venta(
  p_key uuid, p_tel text, p_items jsonb, p_nombre text default 'Lucía Pérez'
) returns jsonb language sql as $$
  select jsonb_build_object(
    'idempotency_key', p_key,
    'items', p_items,
    'cliente', jsonb_build_object('nombre', p_nombre, 'telefono', p_tel, 'email', null),
    'nota', null,
    'origen', 'landing')
$$;
-- una línea del café con la molienda dada (null = sin opciones)
create function prueba.cafe(p_cantidad jsonb, p_opciones jsonb default '{"molienda":"espresso"}') returns jsonb
language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'producto_id', (select id from public.tienda_productos where slug = 'cafe-1-4'),
    'cantidad', p_cantidad,
    'opciones', p_opciones))
$$;
create function prueba.hash(p text) returns text language sql as $$
  select encode(sha256(convert_to(p, 'UTF8')), 'hex')
$$;
grant usage on schema prueba to service_role, anon, authenticated;
grant execute on all functions in schema prueba to service_role, anon, authenticated;

-- Usuarios de prueba (el trigger de auth.users crea el perfil como barista)
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'socio@prueba.test',  '{"first_name":"Socia","last_name":"Prueba"}'),
  ('22222222-2222-4222-8222-222222222222', 'chef@prueba.test',   '{"first_name":"Chef","last_name":"Prueba"}'),
  ('33333333-3333-4333-8333-333333333333', 'barista@prueba.test','{"first_name":"Bari","last_name":"Prueba"}');
update public.profiles set role = 'socio' where id = '11111111-1111-4111-8111-111111111111';
update public.profiles set role = 'chef'  where id = '22222222-2222-4222-8222-222222222222';

\echo '== Estado inicial (seed)'
select key, value from public.app_settings where key = 'tienda';
select slug, nombre, precio, disponible, max_por_pedido, jsonb_array_length(opciones->0->'valores') as moliendas
  from public.tienda_productos;

-- ---------------------------------------------------------------------------
\echo '== T01 venta_deshabilitada (seed: venta_habilitada = false)'
set role service_role;
do $$ declare r jsonb; begin
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('2')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T01 %', r;
  assert r = '{"ok":false,"codigo":"venta_deshabilitada","error":"La venta web de esta sucursal está pausada.","campo":null}'::jsonb, 'FALLO T01';
end $$;
reset role;

update public.app_settings set value = jsonb_set(value, '{venta_habilitada}', 'true') where key = 'tienda';

\echo '== T02 producto_no_disponible (precio 0 y disponible false del seed)'
set role service_role;
do $$ declare r jsonb; begin
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('2')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T02 %', r;
  assert r->>'codigo' = 'producto_no_disponible' and r->>'campo' = 'items.0.producto_id', 'FALLO T02';
end $$;
reset role;

update public.tienda_productos set disponible = true where slug = 'cafe-1-4';
\echo '== T03 producto_no_disponible (disponible pero precio 0)'
set role service_role;
do $$ declare r jsonb; begin
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('2')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T03 %', r;
  assert r->>'codigo' = 'producto_no_disponible', 'FALLO T03';
end $$;
reset role;

update public.tienda_productos set precio = 9500 where slug = 'cafe-1-4';

\echo '== T04 producto inexistente / id que no es uuid'
set role service_role;
do $$ declare r jsonb; begin
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234',
         '[{"producto_id":"00000000-0000-4000-8000-000000000000","cantidad":1,"opciones":{}}]'), 'WEB-SF', prueba.hash('t'));
  raise notice 'T04a %', r;
  assert r->>'codigo' = 'producto_no_disponible' and r->>'campo' = 'items.0.producto_id', 'FALLO T04a';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234',
         '[{"producto_id":"cafe-1-4","cantidad":1,"opciones":{}}]'), 'WEB-SF', prueba.hash('t'));
  raise notice 'T04b %', r;
  assert r->>'codigo' = 'producto_no_disponible', 'FALLO T04b';
end $$;

\echo '== T05 venta OK: 2 x 1/4 molido para espresso a $ 9.500'
do $$ declare r jsonb; v record; it record; begin
  r := public.tienda_crear_venta(
         prueba.venta('aaaaaaaa-0000-4000-8000-000000000001', '381 555-1234', prueba.cafe('2')),
         'WEB-SF', prueba.hash('token-1'));
  raise notice 'T05 %', r;
  assert r->>'ok' = 'true' and r->>'repetida' = 'false' and r->>'codigo' = 'WEB-SF-0001', 'FALLO T05 respuesta';
  select * into v from public.tienda_ventas where id = (r->>'venta_id')::uuid;
  raise notice 'T05 venta: numero=% codigo=% estado=% total=% cliente=% tel=% vence-creada=% origen=%',
    v.numero, v.codigo, v.estado, v.total, v.cliente_nombre, v.cliente_telefono, v.vence_at - v.created_at, v.origen;
  assert v.numero = 1 and v.codigo = 'WEB-SF-0001' and v.estado = 'pendiente_pago' and v.total = 19000.00, 'FALLO T05 venta';
  assert v.vence_at - v.created_at = interval '48 hours', 'FALLO T05 vence_at';
  assert v.token_hash = prueba.hash('token-1'), 'FALLO T05 token_hash';
  select * into it from public.tienda_venta_items where venta_id = v.id;
  raise notice 'T05 item: % | % | % | cant=% unit=% subtotal=%', it.nombre, it.detalle, it.opciones, it.cantidad, it.precio_unitario, it.subtotal;
  assert it.detalle = 'Molido para espresso' and it.cantidad = 2 and it.precio_unitario = 9500 and it.subtotal = 19000
     and it.opciones = '{"molienda":"espresso"}' and it.nombre = 'Café de la casa · 1/4 kg', 'FALLO T05 item';
end $$;

\echo '== T06 repetición idempotente (misma clave, token nuevo)'
do $$ declare r jsonb; v record; n int; begin
  perform pg_sleep(0.05);
  r := public.tienda_crear_venta(
         prueba.venta('aaaaaaaa-0000-4000-8000-000000000001', '381 555-1234', prueba.cafe('2')),
         'WEB-SF', prueba.hash('token-2'));
  raise notice 'T06 %', r;
  select * into v from public.tienda_ventas where idempotency_key = 'aaaaaaaa-0000-4000-8000-000000000001';
  select count(*) into n from public.tienda_ventas;
  assert r->>'ok' = 'true' and r->>'repetida' = 'true' and (r->>'venta_id')::uuid = v.id and r->>'codigo' = 'WEB-SF-0001', 'FALLO T06 respuesta';
  assert v.token_hash = prueba.hash('token-2'), 'FALLO T06 token_hash no se actualizó';
  assert v.updated_at > v.created_at, 'FALLO T06 updated_at';
  assert n = 1, 'FALLO T06 duplicó la venta';
  -- la repetición gana aunque después se pause la venta
end $$;
reset role;
update public.app_settings set value = jsonb_set(value, '{venta_habilitada}', 'false') where key = 'tienda';
set role service_role;
do $$ declare r jsonb; begin
  r := public.tienda_crear_venta(
         prueba.venta('aaaaaaaa-0000-4000-8000-000000000001', '381 555-1234', prueba.cafe('2')),
         'WEB-SF', prueba.hash('token-3'));
  raise notice 'T06b (venta pausada, misma clave) %', r;
  assert r->>'repetida' = 'true', 'FALLO T06b';
end $$;

\echo '== T06c misma clave con OTRO teléfono: no es un reintento (ni token nuevo ni la venta)'
do $$ declare r jsonb; v record; begin
  r := public.tienda_crear_venta(
         prueba.venta('aaaaaaaa-0000-4000-8000-000000000001', '11 4444-0000', '[{"producto_id":"x","cantidad":1,"opciones":{}}]', 'Xx'),
         'WEB-SF', prueba.hash('token-intruso'));
  raise notice 'T06c %', r;
  assert r->>'ok' = 'false' and r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'idempotency_key'
     and r->>'venta_id' is null, 'FALLO T06c respuesta';
  select * into v from public.tienda_ventas where idempotency_key = 'aaaaaaaa-0000-4000-8000-000000000001';
  assert v.token_hash = prueba.hash('token-3'), 'FALLO T06c: rotó el token del cliente';
  -- el mismo teléfono escrito de otra forma sí es un reintento
  r := public.tienda_crear_venta(
         prueba.venta('aaaaaaaa-0000-4000-8000-000000000001', '+54 9 381 555 1234', prueba.cafe('2')),
         'WEB-SF', prueba.hash('token-4'));
  raise notice 'T06d mismo teléfono con otro formato: %', r;
  assert r->>'repetida' = 'true' and r->>'codigo' = 'WEB-SF-0001', 'FALLO T06d';
end $$;
reset role;
update public.app_settings set value = jsonb_set(value, '{venta_habilitada}', 'true') where key = 'tienda';
set role service_role;

\echo '== T07 opcion_invalida'
do $$ declare r jsonb; begin
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1', '{}')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T07a falta molienda: %', r;
  assert r->>'codigo' = 'opcion_invalida' and r->>'campo' = 'items.0.opciones.molienda', 'FALLO T07a';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1', 'null')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T07b opciones null: %', r;
  assert r->>'codigo' = 'opcion_invalida' and r->>'campo' = 'items.0.opciones.molienda', 'FALLO T07b';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1', '{"molienda":"turca"}')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T07c valor inexistente: %', r;
  assert r->>'codigo' = 'opcion_invalida' and r->>'campo' = 'items.0.opciones.molienda', 'FALLO T07c';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1', '{"molienda":"grano","tueste":"oscuro"}')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T07d opción desconocida: %', r;
  assert r->>'codigo' = 'opcion_invalida' and r->>'campo' = 'items.0.opciones.tueste', 'FALLO T07d';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1', '{"molienda":3}')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T07e valor no texto: %', r;
  assert r->>'codigo' = 'opcion_invalida', 'FALLO T07e';
end $$;

\echo '== T08 cantidades'
do $$ declare r jsonb; begin
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('7')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T08a 7 > max 6: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'items.0.cantidad', 'FALLO T08a';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234',
         prueba.cafe('4', '{"molienda":"grano"}') || prueba.cafe('3', '{"molienda":"moka"}')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T08b 4 + 3 del mismo producto: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'items.1.cantidad', 'FALLO T08b';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('2.5')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T08c 2.5: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'items.0.cantidad', 'FALLO T08c';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('21')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T08d 21: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'items.0.cantidad', 'FALLO T08d';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('"2"')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T08e "2" como texto: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'items.0.cantidad', 'FALLO T08e';
end $$;

\echo '== T09 datos_invalidos del cliente y de items'
do $$ declare r jsonb; begin
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1'), 'A'), 'WEB-SF', prueba.hash('t'));
  raise notice 'T09a nombre corto: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'cliente.nombre', 'FALLO T09a';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555', prueba.cafe('1')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T09b teléfono con 6 dígitos: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'cliente.telefono', 'FALLO T09b';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', '[]'), 'WEB-SF', prueba.hash('t'));
  raise notice 'T09c sin items: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'items', 'FALLO T09c';
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234',
         (select jsonb_agg(prueba.cafe('1')->0) from generate_series(1, 11))), 'WEB-SF', prueba.hash('t'));
  raise notice 'T09d 11 items: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'items', 'FALLO T09d';
  r := public.tienda_crear_venta(jsonb_set(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1')),
         '{cliente,email}', '"no-es-un-mail"'), 'WEB-SF', prueba.hash('t'));
  raise notice 'T09e email: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'cliente.email', 'FALLO T09e';
  r := public.tienda_crear_venta(prueba.venta(null, '381 555-1234', prueba.cafe('1')), 'WEB-SF', prueba.hash('t'));
  raise notice 'T09f sin idempotency_key: %', r;
  assert r->>'codigo' = 'datos_invalidos' and r->>'campo' = 'idempotency_key', 'FALLO T09f';
end $$;

\echo '== T10 errores de programación (excepción, no JSON)'
do $$ begin
  begin
    perform public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1')), 'web-sf', prueba.hash('t'));
    assert false, 'FALLO T10a: aceptó prefijo en minúscula';
  exception when invalid_parameter_value then raise notice 'T10a OK: %', sqlerrm; end;
  begin
    perform public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1')), 'WEB-SF', 'token-en-claro');
    assert false, 'FALLO T10b: aceptó token sin hashear';
  exception when invalid_parameter_value then raise notice 'T10b OK: %', sqlerrm; end;
end $$;

\echo '== T11 demasiados_pedidos (mismo teléfono escrito distinto)'
do $$ declare r jsonb; begin
  r := public.tienda_crear_venta(prueba.venta('aaaaaaaa-0000-4000-8000-000000000002', '+54 9 381 5551234',
         prueba.cafe('1', '{"molienda":"grano"}')), 'WEB-SF', prueba.hash('t2'));
  raise notice 'T11a 2ª pendiente: %', r;
  assert r->>'ok' = 'true' and r->>'codigo' = 'WEB-SF-0002', 'FALLO T11a';
  r := public.tienda_crear_venta(prueba.venta('aaaaaaaa-0000-4000-8000-000000000003', '0381 5551234',
         prueba.cafe('1', '{"molienda":"filtro"}')), 'WEB-SF', prueba.hash('t3'));
  raise notice 'T11b 3ª pendiente: %', r;
  assert r->>'ok' = 'true' and r->>'codigo' = 'WEB-SF-0003', 'FALLO T11b';
  r := public.tienda_crear_venta(prueba.venta('aaaaaaaa-0000-4000-8000-000000000004', '+54 9 381 5551234',
         prueba.cafe('1')), 'WEB-SF', prueba.hash('t4'));
  raise notice 'T11c 4ª pendiente: %', r;
  assert r->>'codigo' = 'demasiados_pedidos' and r->>'campo' = 'cliente.telefono', 'FALLO T11c';
  -- otro teléfono no se ve afectado
  r := public.tienda_crear_venta(prueba.venta('aaaaaaaa-0000-4000-8000-000000000005', '381 400-0000',
         prueba.cafe('1', '{"molienda":"prensa"}')), 'WEB-SF', prueba.hash('t5'));
  raise notice 'T11d otro teléfono: %', r;
  assert r->>'ok' = 'true' and r->>'codigo' = 'WEB-SF-0004', 'FALLO T11d';
end $$;

\echo '== T12 pagada no cuenta para el límite (flujo del equipo: pagado → retirado)'
do $$ declare r jsonb; begin
  update public.tienda_ventas set estado = 'pagado', pagado_at = now(), pagado_por = '11111111-1111-4111-8111-111111111111'
   where codigo = 'WEB-SF-0002';
  r := public.tienda_crear_venta(prueba.venta('aaaaaaaa-0000-4000-8000-000000000006', '3815551234',
         prueba.cafe('1')), 'WEB-SF', prueba.hash('t6'));
  raise notice 'T12a con una pagada, nueva pendiente: %', r;
  assert r->>'ok' = 'true' and r->>'codigo' = 'WEB-SF-0005', 'FALLO T12a';
  update public.tienda_ventas set estado = 'retirado', retirado_at = now(), retirado_por = '11111111-1111-4111-8111-111111111111'
   where codigo = 'WEB-SF-0002';
  begin
    update public.tienda_ventas set estado = 'entregado' where codigo = 'WEB-SF-0002';
    assert false, 'FALLO T12b: aceptó un estado inventado';
  exception when check_violation then raise notice 'T12b OK: estado inventado rechazado (%).', sqlerrm; end;
end $$;

\echo '== T13 tienda_vencer_pendientes'
reset role;
update public.tienda_ventas set vence_at = now() - interval '1 minute' where codigo in ('WEB-SF-0001', 'WEB-SF-0003');
set role service_role;
do $$ declare n int; v record; r jsonb; begin
  n := public.tienda_vencer_pendientes();
  raise notice 'T13a vencidas: %', n;
  assert n = 2, 'FALLO T13a';
  select * into v from public.tienda_ventas where codigo = 'WEB-SF-0001';
  raise notice 'T13b WEB-SF-0001: estado=% motivo=% cancelado_at=vence_at? %', v.estado, v.motivo_cancelacion, v.cancelado_at = v.vence_at;
  assert v.estado = 'cancelado' and v.motivo_cancelacion = 'vencido' and v.cancelado_at = v.vence_at, 'FALLO T13b';
  n := public.tienda_vencer_pendientes();
  assert n = 0, 'FALLO T13c: segunda pasada';
  -- con dos canceladas, el teléfono vuelve a tener lugar
  r := public.tienda_crear_venta(prueba.venta('aaaaaaaa-0000-4000-8000-000000000007', '381 555-1234',
         prueba.cafe('1')), 'WEB-SF', prueba.hash('t7'));
  raise notice 'T13d nueva después de vencer: %', r;
  assert r->>'ok' = 'true', 'FALLO T13d';
  -- vencida que se había pagado a tiempo: el equipo la pasa a pagado como lo hace
  -- PATCH /api/tienda/ventas/[id] (limpia cancelado_*), y ya no se vuelve a vencer
  update public.tienda_ventas
     set estado = 'pagado', pagado_at = now(), pagado_por = '11111111-1111-4111-8111-111111111111',
         cancelado_at = null, cancelado_por = null, motivo_cancelacion = null
   where codigo = 'WEB-SF-0003' and estado = 'cancelado' and motivo_cancelacion = 'vencido';
  assert found, 'FALLO T13e: no pasó la vencida a pagado';
  n := public.tienda_vencer_pendientes();
  select * into v from public.tienda_ventas where codigo = 'WEB-SF-0003';
  raise notice 'T13e vencida → pagado: estado=% cancelado_at=% motivo=% (vencer otra vez: %)', v.estado, v.cancelado_at, v.motivo_cancelacion, n;
  assert v.estado = 'pagado' and v.pagado_at is not null and v.cancelado_at is null and v.motivo_cancelacion is null and n = 0, 'FALLO T13e';
end $$;

\echo '== T14 vencimiento_horas configurable (12 h) y número > 9999'
reset role;
update public.app_settings set value = jsonb_set(value, '{vencimiento_horas}', '12') where key = 'tienda';
select setval('public.tienda_ventas_numero_seq', 12344);
set role service_role;
do $$ declare r jsonb; v record; begin
  r := public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 600-0000', prueba.cafe('1')), 'WEB-24', prueba.hash('t8'));
  raise notice 'T14 %', r;
  select * into v from public.tienda_ventas where id = (r->>'venta_id')::uuid;
  assert r->>'codigo' = 'WEB-24-12345' and v.vence_at - v.created_at = interval '12 hours', 'FALLO T14';
end $$;
reset role;

-- ---------------------------------------------------------------------------
\echo '== T20 permisos: anon'
set role anon;
do $$ begin
  begin perform public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1')), 'WEB-SF', prueba.hash('x'));
        assert false, 'FALLO T20a: anon ejecutó tienda_crear_venta';
  exception when insufficient_privilege then raise notice 'T20a OK anon no ejecuta tienda_crear_venta: %', sqlerrm; end;
  begin perform public.tienda_vencer_pendientes();
        assert false, 'FALLO T20b';
  exception when insufficient_privilege then raise notice 'T20b OK anon no ejecuta tienda_vencer_pendientes'; end;
  begin perform 1 from public.tienda_ventas;
        assert false, 'FALLO T20c';
  exception when insufficient_privilege then raise notice 'T20c OK anon no lee tienda_ventas: %', sqlerrm; end;
  begin perform 1 from public.tienda_productos;
        assert false, 'FALLO T20d';
  exception when insufficient_privilege then raise notice 'T20d OK anon no lee tienda_productos'; end;
  begin perform 1 from public.tienda_venta_items;
        assert false, 'FALLO T20e';
  exception when insufficient_privilege then raise notice 'T20e OK anon no lee tienda_venta_items'; end;
  begin insert into public.tienda_productos (slug, nombre) values ('x', 'x');
        assert false, 'FALLO T20f';
  exception when insufficient_privilege then raise notice 'T20f OK anon no inserta'; end;
  begin perform nextval('public.tienda_ventas_numero_seq');
        assert false, 'FALLO T20g';
  exception when insufficient_privilege then raise notice 'T20g OK anon no usa la secuencia'; end;
end $$;
reset role;

\echo '== T21 permisos: authenticated'
set role authenticated;
-- sin sesión (auth.uid() null): ve 0 filas; no escribe ni ejecuta
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false) \g /dev/null
do $$ declare n int; begin
  select count(*) into n from public.tienda_ventas;
  raise notice 'T21a authenticated sin perfil ve % ventas', n;
  assert n = 0, 'FALLO T21a';
  begin perform public.tienda_crear_venta(prueba.venta(gen_random_uuid(), '381 555-1234', prueba.cafe('1')), 'WEB-SF', prueba.hash('x'));
        assert false, 'FALLO T21b';
  exception when insufficient_privilege then raise notice 'T21b OK authenticated no ejecuta tienda_crear_venta'; end;
  begin perform public.tienda_vencer_pendientes();
        assert false, 'FALLO T21c';
  exception when insufficient_privilege then raise notice 'T21c OK authenticated no ejecuta tienda_vencer_pendientes'; end;
end $$;

-- socio: lee todo; no escribe
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', false),
       set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false) \g /dev/null
do $$ declare n_v int; n_i int; n_p int; begin
  select count(*) into n_v from public.tienda_ventas;
  select count(*) into n_i from public.tienda_venta_items;
  select count(*) into n_p from public.tienda_productos;
  raise notice 'T21d socio (auth.uid()=%) ve ventas=% items=% productos=%', auth.uid(), n_v, n_i, n_p;
  assert n_v = 7 and n_i = 7 and n_p = 1, 'FALLO T21d';
  begin update public.tienda_ventas set estado = 'pagado';
        assert false, 'FALLO T21e';
  exception when insufficient_privilege then raise notice 'T21e OK socio no actualiza desde el cliente: %', sqlerrm; end;
  begin insert into public.tienda_venta_items (venta_id, nombre, cantidad, precio_unitario, subtotal)
        select id, 'x', 1, 1, 1 from public.tienda_ventas limit 1;
        assert false, 'FALLO T21f';
  exception when insufficient_privilege then raise notice 'T21f OK socio no inserta items'; end;
  begin delete from public.tienda_productos;
        assert false, 'FALLO T21g';
  exception when insufficient_privilege then raise notice 'T21g OK socio no borra productos'; end;
end $$;

-- barista: lee
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', false),
       set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false) \g /dev/null
do $$ declare n int; begin
  select count(*) into n from public.tienda_ventas;
  raise notice 'T21h barista ve % ventas', n;
  assert n = 7, 'FALLO T21h';
  perform codigo, cliente_telefono, estado, motivo_cancelacion from public.tienda_ventas;
  begin perform idempotency_key from public.tienda_ventas;
        assert false, 'FALLO T21j: el equipo lee idempotency_key';
  exception when insufficient_privilege then raise notice 'T21j OK el equipo no lee idempotency_key: %', sqlerrm; end;
  begin perform token_hash from public.tienda_ventas;
        assert false, 'FALLO T21k: el equipo lee token_hash';
  exception when insufficient_privilege then raise notice 'T21k OK el equipo no lee token_hash'; end;
  begin perform * from public.tienda_ventas;
        assert false, 'FALLO T21l: select * debería fallar';
  exception when insufficient_privilege then raise notice 'T21l OK select * falla (hay que nombrar las columnas)'; end;
end $$;

-- chef: no ve nada
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', false),
       set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false) \g /dev/null
do $$ declare n_v int; n_i int; n_p int; begin
  select count(*) into n_v from public.tienda_ventas;
  select count(*) into n_i from public.tienda_venta_items;
  select count(*) into n_p from public.tienda_productos;
  raise notice 'T21i chef ve ventas=% items=% productos=%', n_v, n_i, n_p;
  assert n_v = 0 and n_i = 0 and n_p = 0, 'FALLO T21i';
end $$;
reset role;

\echo '== T22 catálogo de permisos (anon y authenticated)'
select c.relname,
       has_table_privilege('anon', c.oid, 'select') as anon_select,
       has_table_privilege('anon', c.oid, 'insert') as anon_insert,
       has_table_privilege('authenticated', c.oid, 'select') as auth_select,
       has_any_column_privilege('authenticated', c.oid, 'select') as auth_select_cols,
       has_table_privilege('authenticated', c.oid, 'insert,update,delete') as auth_escribe,
       c.relrowsecurity as rls
  from pg_class c
 where c.relnamespace = 'public'::regnamespace and c.relname like 'tienda%' and c.relkind = 'r'
 order by 1;
select p.proname,
       has_function_privilege('anon', p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       has_function_privilege('service_role', p.oid, 'execute') as service_role,
       p.prosecdef as security_definer, p.proconfig
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace and p.proname like 'tienda%'
 order by 1;

\echo '== Ventas al final'
select codigo, estado, total, cliente_telefono, motivo_cancelacion,
       (select string_agg(cantidad || ' x ' || coalesce(detalle, '-'), ', ') from public.tienda_venta_items i where i.venta_id = v.id) as items
  from public.tienda_ventas v order by numero;

drop schema prueba cascade;
\echo 'TODAS LAS PRUEBAS PASARON'
