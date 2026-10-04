#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Concurrencia de tienda_crear_venta: dos requests con la MISMA idempotency_key
# al mismo tiempo tienen que terminar en UNA sola venta.
#   C1: con la función real (el candado por clave hace esperar a la segunda).
#   C2: con una copia SIN candados, para probar la red de seguridad
#       (unique_violation sobre tienda_ventas_idempotency_key_key → "repetida").
#   C3: igual que C2 pero B trae OTRO teléfono: no es un reintento → B recibe
#       datos_invalidos y el token sigue siendo el de A.
# Correr DESPUÉS de prueba_tienda_web.sql (deja la venta habilitada y el café con precio).
# Uso: CONTENEDOR=lve-kit-pg ./prueba_concurrencia.sh
# ---------------------------------------------------------------------------
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash en Windows
C="${CONTENEDOR:-lve-kit-pg}"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
psqlc() { docker exec -i "$C" psql -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

psqlc <<'SQL'
drop schema if exists prueba_c cascade;
create schema prueba_c;
create function prueba_c.venta(p_key uuid, p_tel text) returns jsonb language sql as $$
  select jsonb_build_object(
    'idempotency_key', p_key,
    'items', jsonb_build_array(jsonb_build_object(
      'producto_id', (select id from public.tienda_productos where slug = 'cafe-1-4'),
      'cantidad', 1, 'opciones', jsonb_build_object('molienda', 'grano'))),
    'cliente', jsonb_build_object('nombre', 'Prueba Concurrencia', 'telefono', p_tel, 'email', null),
    'nota', null, 'origen', 'landing')
$$;
create function prueba_c.hash(p text) returns text language sql as $$ select encode(sha256(convert_to(p, 'UTF8')), 'hex') $$;
-- copia de la función real sin los pg_advisory_xact_lock (abs() solo evalúa el hash)
do $$ begin
  execute replace(replace(
    pg_get_functiondef('public.tienda_crear_venta(jsonb,text,text)'::regprocedure),
    'public.tienda_crear_venta(', 'prueba_c.crear_sin_candado('),
    'pg_advisory_xact_lock(', 'abs(');
end $$;
grant usage on schema prueba_c to service_role;
grant execute on all functions in schema prueba_c to service_role;
SQL

correr() { # $1 = función, $2 = clave, $3 = token, $4 = espera después de crear (s), $5 = teléfono
  psqlc -At <<SQL
set role service_role;
begin;
select '$3 ' || clock_timestamp()::time || ' ' || $1(prueba_c.venta('$2', '${5:-381 700-0000}'), 'WEB-SF', prueba_c.hash('$3'))::text;
select pg_sleep($4);
commit;
SQL
}

for caso in "C1 public.tienda_crear_venta bbbbbbbb-0000-4000-8000-000000000001" \
            "C2 prueba_c.crear_sin_candado bbbbbbbb-0000-4000-8000-000000000002"; do
  set -- $caso
  echo "== $1 ($2): A crea y tarda 2 s en confirmar; B llega 0,5 s después"
  correr "$2" "$3" "token-A" 2 > "$T/a.txt" &
  sleep 0.5
  correr "$2" "$3" "token-B" 0 > "$T/b.txt"
  wait
  echo "A: $(cat "$T/a.txt")"
  echo "B: $(cat "$T/b.txt")"
  psqlc -At <<SQL
select '$1 ventas con esa clave: ' || count(*) || ' | token final = B? ' || bool_and(token_hash = prueba_c.hash('token-B'))
  from public.tienda_ventas where idempotency_key = '$3';
do \$\$ begin
  assert (select count(*) from public.tienda_ventas where idempotency_key = '$3') = 1, 'FALLO $1: no hay exactamente una venta';
  assert (select token_hash from public.tienda_ventas where idempotency_key = '$3') = prueba_c.hash('token-B'), 'FALLO $1: token';
end \$\$;
SQL
  grep -q '"repetida": true' "$T/b.txt" || { echo "FALLO $1: B no salió como repetida"; exit 1; }
  grep -q '"repetida": false' "$T/a.txt" || { echo "FALLO $1: A no creó la venta"; exit 1; }
done

echo "== C3 (prueba_c.crear_sin_candado): misma clave, B con otro teléfono"
K3=bbbbbbbb-0000-4000-8000-000000000003
correr prueba_c.crear_sin_candado "$K3" "token-A" 2 > "$T/a.txt" &
sleep 0.5
correr prueba_c.crear_sin_candado "$K3" "token-B" 0 "11 4444-0000" > "$T/b.txt"
wait
echo "A: $(cat "$T/a.txt")"
echo "B: $(cat "$T/b.txt")"
psqlc -At <<SQL
do \$\$ begin
  assert (select count(*) from public.tienda_ventas where idempotency_key = '$K3') = 1, 'FALLO C3: no hay exactamente una venta';
  assert (select token_hash from public.tienda_ventas where idempotency_key = '$K3') = prueba_c.hash('token-A'), 'FALLO C3: B rotó el token';
end \$\$;
SQL
grep -q '"codigo": "datos_invalidos"' "$T/b.txt" || { echo "FALLO C3: B no salió como datos_invalidos"; exit 1; }
grep -q '"repetida": false' "$T/a.txt" || { echo "FALLO C3: A no creó la venta"; exit 1; }

psqlc -c "drop schema prueba_c cascade;"
echo "CONCURRENCIA OK"
