-- ---------------------------------------------------------------------------
-- Tienda web: venta de café (1/4 kg) desde la landing de La Vieja Escuela
-- ---------------------------------------------------------------------------
-- La landing (laviejaescuela) no tiene base: cada pedido vive en la base de la
-- sucursal donde se compró. El cliente elige molienda y cantidad, deja nombre y
-- WhatsApp, y la landing llama a /api/tienda/publico/ventas de ESTA app, que
-- crea la venta con public.tienda_crear_venta() en estado 'pendiente_pago'.
-- El cliente transfiere al alias de app_settings 'tienda', manda el comprobante
-- por WhatsApp y el equipo la marca 'pagado' y después 'retirado' desde la app.
-- Las pendientes vencen solas (tienda_vencer_pendientes, ver
-- opcional_cron_vencimientos.sql) y pasan a 'cancelado' con motivo 'vencido'.
--
-- Quién escribe: SOLO el servidor con service_role (rutas /api/tienda/...).
--   RLS sin políticas de escritura; socio, encargado y barista pueden leer.
--   Las funciones son SECURITY DEFINER y solo las ejecuta service_role.
-- Seguridad: el token del ticket nunca se guarda, solo su sha-256 (hex).
--   El precio y el total salen siempre de esta base, nunca de la landing.
-- Arranca APAGADA: venta_habilitada = false y el café sin precio ni stock.
-- Es la misma migración para Santa Fe 746 y para la 24. Se puede correr
-- más de una vez sin romper nada.
-- ---------------------------------------------------------------------------

-- 1. Productos ---------------------------------------------------------------

create table if not exists public.tienda_productos (
  id             uuid          primary key default gen_random_uuid(),
  slug           text          not null unique,
  nombre         text          not null,
  descripcion    text,
  presentacion   text,                                   -- '250 g'
  precio         numeric(12,2) not null default 0 check (precio >= 0),   -- pesos, IVA incluido
  disponible     boolean       not null default false,
  -- [{id, nombre, requerida, valores: [{id, nombre}]}]
  opciones       jsonb         not null default '[]' check (jsonb_typeof(opciones) = 'array'),
  max_por_pedido int           not null default 6 check (max_por_pedido between 1 and 20),
  orden          int           not null default 0,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

create index if not exists tienda_productos_orden on public.tienda_productos (orden, nombre);

-- 2. Ventas ------------------------------------------------------------------

create sequence if not exists public.tienda_ventas_numero_seq;

create table if not exists public.tienda_ventas (
  id                 uuid          primary key default gen_random_uuid(),
  numero             bigint        not null unique default nextval('public.tienda_ventas_numero_seq'),
  codigo             text          not null unique,      -- 'WEB-SF-0042'
  token_hash         text          not null check (token_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key    uuid          not null,
  estado             text          not null default 'pendiente_pago'
                                   check (estado in ('pendiente_pago', 'pagado', 'retirado', 'cancelado')),
  cliente_nombre     text          not null,
  cliente_telefono   text          not null,             -- tal como lo escribió
  cliente_email      text,
  nota               text,
  total              numeric(12,2) not null check (total >= 0),
  origen             text          not null default 'landing',
  vence_at           timestamptz   not null,
  pagado_at          timestamptz,
  pagado_por         uuid          references public.profiles(id) on delete set null,
  retirado_at        timestamptz,
  retirado_por       uuid          references public.profiles(id) on delete set null,
  cancelado_at       timestamptz,
  cancelado_por      uuid          references public.profiles(id) on delete set null,
  motivo_cancelacion text,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now(),
  constraint tienda_ventas_idempotency_key_key unique (idempotency_key)
);

alter sequence public.tienda_ventas_numero_seq owned by public.tienda_ventas.numero;

create index if not exists tienda_ventas_estado_fecha on public.tienda_ventas (estado, created_at desc);
create index if not exists tienda_ventas_fecha on public.tienda_ventas (created_at desc);
create index if not exists tienda_ventas_telefono on public.tienda_ventas (cliente_telefono);
-- límite de pedidos sin pagar por teléfono (últimos 10 dígitos)
create index if not exists tienda_ventas_tel_pendientes on public.tienda_ventas
  (right(regexp_replace(cliente_telefono, '\D', '', 'g'), 10), created_at)
  where estado = 'pendiente_pago';
create index if not exists tienda_ventas_vencimiento on public.tienda_ventas (vence_at)
  where estado = 'pendiente_pago';

create table if not exists public.tienda_venta_items (
  id              uuid          primary key default gen_random_uuid(),
  venta_id        uuid          not null references public.tienda_ventas(id) on delete cascade,
  producto_id     uuid          references public.tienda_productos(id) on delete set null,
  nombre          text          not null,                -- copia del nombre al momento de la venta
  detalle         text,                                  -- 'Molido para espresso'
  opciones        jsonb         not null default '{}',   -- {"molienda": "espresso"}
  cantidad        int           not null check (cantidad between 1 and 20),
  precio_unitario numeric(12,2) not null,
  subtotal        numeric(12,2) not null,
  created_at      timestamptz   not null default now()
);

create index if not exists tienda_venta_items_venta on public.tienda_venta_items (venta_id);

-- 3. updated_at (reusa la función genérica que ya existe en la base) ----------

drop trigger if exists trg_tienda_productos_updated_at on public.tienda_productos;
create trigger trg_tienda_productos_updated_at before update on public.tienda_productos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tienda_ventas_updated_at on public.tienda_ventas;
create trigger trg_tienda_ventas_updated_at before update on public.tienda_ventas
  for each row execute function public.set_updated_at();

-- 4. RLS y permisos ------------------------------------------------------------
-- Leen socio, encargado y barista (activos). Nadie escribe desde el cliente.

alter table public.tienda_productos enable row level security;
alter table public.tienda_ventas enable row level security;
alter table public.tienda_venta_items enable row level security;

drop policy if exists tienda_productos_select on public.tienda_productos;
create policy tienda_productos_select on public.tienda_productos for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.is_active and p.role in ('socio', 'encargado', 'barista')));

drop policy if exists tienda_ventas_select on public.tienda_ventas;
create policy tienda_ventas_select on public.tienda_ventas for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.is_active and p.role in ('socio', 'encargado', 'barista')));

drop policy if exists tienda_venta_items_select on public.tienda_venta_items;
create policy tienda_venta_items_select on public.tienda_venta_items for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.is_active and p.role in ('socio', 'encargado', 'barista')));

-- Los permisos automáticos de Supabase dan ALL a anon y authenticated: se cierran.
revoke all on table public.tienda_productos, public.tienda_ventas, public.tienda_venta_items from anon, authenticated;
grant select on table public.tienda_productos, public.tienda_ventas, public.tienda_venta_items to authenticated;
grant all on table public.tienda_productos, public.tienda_ventas, public.tienda_venta_items to service_role;
revoke all on sequence public.tienda_ventas_numero_seq from anon, authenticated;
grant usage, select on sequence public.tienda_ventas_numero_seq to service_role;

-- 5. Configuración y producto inicial (apagados) -------------------------------

insert into public.app_settings (key, value)
values ('tienda', '{
  "venta_habilitada": false,
  "mensaje": null,
  "pago": {"alias": null, "cbu": null, "titular": null, "banco": null, "cuit": null},
  "whatsapp": null,
  "retiro": {"direccion": null, "horario": null, "indicaciones": null},
  "vencimiento_horas": 48
}'::jsonb)
on conflict (key) do nothing;

insert into public.tienda_productos (slug, nombre, descripcion, presentacion, precio, disponible, max_por_pedido, opciones)
values (
  'cafe-1-4',
  'Café de la casa · 1/4 kg',
  'El mismo café que servimos en la barra. Bolsa de 250 g.',
  '250 g',
  0,
  false,
  6,
  '[{"id": "molienda", "nombre": "Molienda", "requerida": true, "valores": [
     {"id": "grano",    "nombre": "En grano"},
     {"id": "espresso", "nombre": "Molido para espresso"},
     {"id": "moka",     "nombre": "Molido para cafetera italiana"},
     {"id": "filtro",   "nombre": "Molido para filtro (V60, Chemex, goteo)"},
     {"id": "prensa",   "nombre": "Molido para prensa francesa"}
   ]}]'::jsonb
)
on conflict (slug) do nothing;

-- 6. Crear venta (todo en una transacción) --------------------------------------
-- p_venta = {idempotency_key, items: [{producto_id, cantidad, opciones: {opcion_id: valor_id}}],
--            cliente: {nombre, telefono, email|null}, nota|null, origen}
-- p_prefijo = 'WEB-SF' / 'WEB-24' (^[A-Z0-9-]{2,12}$), p_token_hash = sha-256 hex del token.
-- Devuelve {"ok": true, "repetida": bool, "venta_id": uuid, "codigo": text}
--       o  {"ok": false, "codigo": <código del contrato>, "error": <texto para el cliente>, "campo": text|null}
-- Los índices de campo ('items.0.cantidad') empiezan en 0, igual que zod.

create or replace function public.tienda_crear_venta(p_venta jsonb, p_prefijo text, p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uuid_re    constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_key        uuid;
  v_venta_id   uuid;
  v_codigo     text;
  v_cfg        jsonb;
  v_horas      numeric;
  v_cliente    jsonb;
  v_nombre     text;
  v_telefono   text;
  v_digitos    text;
  v_tel10      text;
  v_email      text;
  v_nota       text;
  v_origen     text;
  v_items      jsonb;
  v_item       jsonb;
  v_i          int;
  v_campo      text;
  v_cant       int;
  v_acum       int;
  v_acumulado  jsonb := '{}';
  v_prod       public.tienda_productos%rowtype;
  v_hay_prod   boolean;
  v_elegidas   jsonb;
  v_clave      text;
  v_opcion     jsonb;
  v_valor_id   text;
  v_valor      jsonb;
  v_detalle    text[];
  v_lineas     jsonb := '[]';
  v_total      numeric(12,2) := 0;
  v_pendientes int;
  v_numero     bigint;
  v_constraint text;
begin
  -- Errores de programación (los arma el servidor, no el cliente)
  if p_prefijo is null or p_prefijo !~ '^[A-Z0-9-]{2,12}$' then
    raise exception 'tienda_crear_venta: p_prefijo inválido: %', coalesce(p_prefijo, 'null') using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'tienda_crear_venta: p_token_hash tiene que ser sha-256 en hex minúscula' using errcode = '22023';
  end if;

  if p_venta is null or jsonb_typeof(p_venta) <> 'object' then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'El pedido llegó vacío o mal armado.', 'campo', null);
  end if;

  -- 1. Repetición: misma idempotency_key → misma venta, con el token nuevo.
  --    El candado serializa dos pedidos iguales que llegan a la vez.
  if jsonb_typeof(p_venta->'idempotency_key') is distinct from 'string'
     or (p_venta->>'idempotency_key') !~ v_uuid_re then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'Falta la clave del pedido.', 'campo', 'idempotency_key');
  end if;
  v_key := (p_venta->>'idempotency_key')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('tienda_web:idem:' || v_key::text, 0));

  update public.tienda_ventas set token_hash = p_token_hash
   where idempotency_key = v_key
  returning id, codigo into v_venta_id, v_codigo;
  if found then
    return jsonb_build_object('ok', true, 'repetida', true, 'venta_id', v_venta_id, 'codigo', v_codigo);
  end if;

  -- 2. Interruptor de la sucursal
  select value into v_cfg from public.app_settings where key = 'tienda';
  if coalesce(v_cfg->'venta_habilitada', 'false'::jsonb) <> 'true'::jsonb then
    return jsonb_build_object('ok', false, 'codigo', 'venta_deshabilitada',
      'error', 'La venta web de esta sucursal está pausada.', 'campo', null);
  end if;

  -- 3. Datos básicos
  v_cliente := p_venta->'cliente';
  if jsonb_typeof(v_cliente) is distinct from 'object' then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'Faltan tu nombre y tu teléfono.', 'campo', 'cliente');
  end if;

  if jsonb_typeof(v_cliente->'nombre') = 'string' then
    v_nombre := btrim(regexp_replace(v_cliente->>'nombre', '\s+', ' ', 'g'));
  end if;
  if v_nombre is null or char_length(v_nombre) < 2 or char_length(v_nombre) > 80 then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'Escribí tu nombre (entre 2 y 80 letras).', 'campo', 'cliente.nombre');
  end if;

  if jsonb_typeof(v_cliente->'telefono') = 'string' then
    v_telefono := btrim(v_cliente->>'telefono');
  end if;
  v_digitos := regexp_replace(coalesce(v_telefono, ''), '\D', '', 'g');
  if v_telefono is null or char_length(v_telefono) > 30
     or char_length(v_digitos) < 8 or char_length(v_digitos) > 15 then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'Revisá el teléfono: tiene que tener al menos 8 números, con característica.', 'campo', 'cliente.telefono');
  end if;
  v_tel10 := right(v_digitos, 10);

  if jsonb_typeof(v_cliente->'email') = 'string' then
    v_email := nullif(btrim(v_cliente->>'email'), '');
  elsif coalesce(jsonb_typeof(v_cliente->'email'), 'null') <> 'null' then
    v_email := '-';  -- tipo raro: que falle la validación de abajo
  end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'Revisá el email.', 'campo', 'cliente.email');
  end if;

  if jsonb_typeof(p_venta->'nota') = 'string' then
    v_nota := nullif(btrim(p_venta->>'nota'), '');
  elsif coalesce(jsonb_typeof(p_venta->'nota'), 'null') <> 'null' then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'La nota tiene que ser texto.', 'campo', 'nota');
  end if;
  if v_nota is not null and char_length(v_nota) > 300 then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'La nota puede tener hasta 300 caracteres.', 'campo', 'nota');
  end if;

  if jsonb_typeof(p_venta->'origen') = 'string' then
    v_origen := btrim(p_venta->>'origen');
  elsif coalesce(jsonb_typeof(p_venta->'origen'), 'null') = 'null' then
    v_origen := 'landing';
  end if;
  if v_origen is null or char_length(v_origen) < 1 or char_length(v_origen) > 30 then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'Origen del pedido inválido.', 'campo', 'origen');
  end if;

  v_items := p_venta->'items';
  if jsonb_typeof(v_items) is distinct from 'array'
     or jsonb_array_length(v_items) < 1 or jsonb_array_length(v_items) > 10 then
    return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
      'error', 'El pedido tiene que tener entre 1 y 10 productos.', 'campo', 'items');
  end if;

  for v_item, v_i in
    select e, (n - 1)::int from jsonb_array_elements(v_items) with ordinality as t(e, n) order by n
  loop
    v_campo := 'items.' || v_i;
    if jsonb_typeof(v_item) <> 'object' then
      return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
        'error', 'Hay un producto mal cargado en el pedido.', 'campo', v_campo);
    end if;
    if jsonb_typeof(v_item->'cantidad') is distinct from 'number'
       or (v_item->>'cantidad')::numeric <> trunc((v_item->>'cantidad')::numeric)
       or (v_item->>'cantidad')::numeric < 1 or (v_item->>'cantidad')::numeric > 20 then
      return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
        'error', 'La cantidad tiene que ser un número entero entre 1 y 20.', 'campo', v_campo || '.cantidad');
    end if;
  end loop;

  -- 4. Productos, cantidades y opciones (precio siempre de esta base)
  for v_item, v_i in
    select e, (n - 1)::int from jsonb_array_elements(v_items) with ordinality as t(e, n) order by n
  loop
    v_campo := 'items.' || v_i;
    v_cant := (v_item->>'cantidad')::int;

    v_hay_prod := false;
    if jsonb_typeof(v_item->'producto_id') = 'string' and (v_item->>'producto_id') ~ v_uuid_re then
      select * into v_prod from public.tienda_productos where id = (v_item->>'producto_id')::uuid;
      v_hay_prod := found;
    end if;
    if not v_hay_prod then
      return jsonb_build_object('ok', false, 'codigo', 'producto_no_disponible',
        'error', 'Ese producto ya no está en la tienda. Actualizá la página y volvé a elegir.',
        'campo', v_campo || '.producto_id');
    end if;
    if not v_prod.disponible or v_prod.precio <= 0 then
      return jsonb_build_object('ok', false, 'codigo', 'producto_no_disponible',
        'error', format('%s no está disponible en este momento.', v_prod.nombre),
        'campo', v_campo || '.producto_id');
    end if;

    -- el máximo es por pedido: suma todas las líneas del mismo producto
    v_acum := coalesce((v_acumulado->>(v_prod.id::text))::int, 0) + v_cant;
    if v_acum > v_prod.max_por_pedido then
      return jsonb_build_object('ok', false, 'codigo', 'datos_invalidos',
        'error', format('Podés llevar hasta %s de %s por pedido.', v_prod.max_por_pedido, v_prod.nombre),
        'campo', v_campo || '.cantidad');
    end if;
    v_acumulado := v_acumulado || jsonb_build_object(v_prod.id::text, v_acum);

    v_elegidas := coalesce(v_item->'opciones', '{}'::jsonb);
    if jsonb_typeof(v_elegidas) = 'null' then
      v_elegidas := '{}'::jsonb;
    end if;
    if jsonb_typeof(v_elegidas) <> 'object' then
      return jsonb_build_object('ok', false, 'codigo', 'opcion_invalida',
        'error', 'Las opciones del producto llegaron mal armadas.', 'campo', v_campo || '.opciones');
    end if;

    -- opciones que el producto no tiene, o valores que no son texto
    for v_clave in select jsonb_object_keys(v_elegidas) loop
      if jsonb_typeof(v_elegidas->v_clave) <> 'string'
         or not exists (select 1 from jsonb_array_elements(v_prod.opciones) o where o->>'id' = v_clave) then
        return jsonb_build_object('ok', false, 'codigo', 'opcion_invalida',
          'error', format('Esa opción no corresponde a %s. Actualizá la página y volvé a elegir.', v_prod.nombre),
          'campo', v_campo || '.opciones.' || v_clave);
      end if;
    end loop;

    -- requeridas presentes y valores existentes; el detalle sigue el orden del producto
    v_detalle := '{}';
    for v_opcion in
      select o from jsonb_array_elements(v_prod.opciones) with ordinality as t(o, n) order by n
    loop
      v_valor_id := v_elegidas->>(v_opcion->>'id');
      if v_valor_id is null then
        if coalesce(v_opcion->'requerida', 'false'::jsonb) = 'true'::jsonb then
          return jsonb_build_object('ok', false, 'codigo', 'opcion_invalida',
            'error', format('Elegí la opción "%s".', v_opcion->>'nombre'),
            'campo', v_campo || '.opciones.' || (v_opcion->>'id'));
        end if;
        continue;
      end if;
      v_valor := null;
      select v into v_valor
        from jsonb_array_elements(coalesce(v_opcion->'valores', '[]'::jsonb)) as v
       where v->>'id' = v_valor_id
       limit 1;
      if v_valor is null then
        return jsonb_build_object('ok', false, 'codigo', 'opcion_invalida',
          'error', format('La opción elegida en "%s" ya no existe. Volvé a elegirla.', v_opcion->>'nombre'),
          'campo', v_campo || '.opciones.' || (v_opcion->>'id'));
      end if;
      v_detalle := v_detalle || (v_valor->>'nombre');
    end loop;

    v_lineas := v_lineas || jsonb_build_array(jsonb_build_object(
      'producto_id',     v_prod.id,
      'nombre',          v_prod.nombre,
      'detalle',         nullif(array_to_string(v_detalle, ' · '), ''),
      'opciones',        v_elegidas,
      'cantidad',        v_cant,
      'precio_unitario', v_prod.precio,
      'subtotal',        v_prod.precio * v_cant
    ));
    v_total := v_total + v_prod.precio * v_cant;
  end loop;

  -- 5. Límite: hasta 3 pedidos sin pagar por teléfono en 24 h.
  --    El candado por teléfono evita que dos pedidos simultáneos pasen el límite.
  perform pg_advisory_xact_lock(hashtextextended('tienda_web:tel:' || v_tel10, 0));
  select count(*) into v_pendientes
    from public.tienda_ventas
   where estado = 'pendiente_pago'
     and created_at > now() - interval '24 hours'
     and vence_at > now()
     and right(regexp_replace(cliente_telefono, '\D', '', 'g'), 10) = v_tel10;
  if v_pendientes >= 3 then
    return jsonb_build_object('ok', false, 'codigo', 'demasiados_pedidos',
      'error', 'Ya hay 3 pedidos sin pagar con este teléfono. Pagá alguno o escribinos por WhatsApp antes de hacer otro.',
      'campo', 'cliente.telefono');
  end if;

  -- 6. Alta de la venta y sus líneas
  if jsonb_typeof(v_cfg->'vencimiento_horas') = 'number' and (v_cfg->>'vencimiento_horas')::numeric > 0 then
    v_horas := least((v_cfg->>'vencimiento_horas')::numeric, 720);
  else
    v_horas := 48;
  end if;

  v_numero := nextval('public.tienda_ventas_numero_seq');
  v_codigo := p_prefijo || '-' || case when v_numero < 10000 then lpad(v_numero::text, 4, '0') else v_numero::text end;

  begin
    insert into public.tienda_ventas
      (numero, codigo, token_hash, idempotency_key, cliente_nombre, cliente_telefono, cliente_email,
       nota, total, origen, vence_at)
    values
      (v_numero, v_codigo, p_token_hash, v_key, v_nombre, v_telefono, v_email,
       v_nota, v_total, v_origen, now() + v_horas * interval '1 hour')
    returning id into v_venta_id;

    insert into public.tienda_venta_items
      (venta_id, producto_id, nombre, detalle, opciones, cantidad, precio_unitario, subtotal)
    select v_venta_id, (l->>'producto_id')::uuid, l->>'nombre', l->>'detalle', l->'opciones',
           (l->>'cantidad')::int, (l->>'precio_unitario')::numeric, (l->>'subtotal')::numeric
      from jsonb_array_elements(v_lineas) with ordinality as t(l, n)
     order by n;
  exception when unique_violation then
    -- red de seguridad: otra request con la misma clave ganó la carrera
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint is distinct from 'tienda_ventas_idempotency_key_key' then
      raise;
    end if;
    update public.tienda_ventas set token_hash = p_token_hash
     where idempotency_key = v_key
    returning id, codigo into v_venta_id, v_codigo;
    if not found then
      raise;
    end if;
    return jsonb_build_object('ok', true, 'repetida', true, 'venta_id', v_venta_id, 'codigo', v_codigo);
  end;

  return jsonb_build_object('ok', true, 'repetida', false, 'venta_id', v_venta_id, 'codigo', v_codigo);
end;
$$;

-- 7. Vencer pendientes ----------------------------------------------------------
-- Pasa a 'cancelado' las pendientes cuyo vence_at ya pasó. Devuelve cuántas.

create or replace function public.tienda_vencer_pendientes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  update public.tienda_ventas
     set estado = 'cancelado',
         cancelado_at = vence_at,
         motivo_cancelacion = 'vencido'
   where estado = 'pendiente_pago'
     and vence_at < now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.tienda_crear_venta(jsonb, text, text) from public, anon, authenticated;
grant execute on function public.tienda_crear_venta(jsonb, text, text) to service_role;
revoke all on function public.tienda_vencer_pendientes() from public, anon, authenticated;
grant execute on function public.tienda_vencer_pendientes() to service_role;

comment on table public.tienda_productos is 'Tienda web: productos que se venden desde la landing. Escribe solo el servidor.';
comment on table public.tienda_ventas is 'Tienda web: pedidos de la landing. Se crean con tienda_crear_venta(). Escribe solo el servidor.';
comment on table public.tienda_venta_items is 'Tienda web: líneas de cada pedido, con precio copiado al momento de la venta.';
comment on function public.tienda_crear_venta(jsonb, text, text) is 'Tienda web: valida y crea una venta pendiente_pago de forma atómica e idempotente. Solo service_role.';
comment on function public.tienda_vencer_pendientes() is 'Tienda web: cancela (motivo vencido) las ventas pendientes vencidas. Devuelve cuántas.';

-- 8. Que la API vea las tablas nuevas.
notify pgrst, 'reload schema';
