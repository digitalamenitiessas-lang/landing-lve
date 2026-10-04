#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Prueba completa de la migración de la tienda web en un Postgres DESCARTABLE
# (imagen oficial de Supabase, misma versión mayor que producción: 17.6).
# No se conecta a ninguna base real. Al final borra el contenedor.
#
# Uso (Git Bash / Linux / macOS, con Docker andando):
#   SALA_REPO=/c/repos/sala-de-profes-24 ./correr_pruebas.sh
# SALA_REPO es un repo de Sala de Profes: se LEE su supabase/estructura/
# (01_permisos_previos.sql, 02_estructura_desde_lve.sql, 03_ajustes_sucursal_24.sql).
# ---------------------------------------------------------------------------
set -euo pipefail
export MSYS_NO_PATHCONV=1
AQUI="$(cd "$(dirname "$0")" && pwd)"
SQL_DIR="$(cd "$AQUI/.." && pwd)"
SALA_REPO="${SALA_REPO:?Definí SALA_REPO=<ruta a sala-de-profes-24>}"
EST="$SALA_REPO/supabase/estructura"
C="${CONTENEDOR:-lve-kit-pg}"
IMAGEN="${IMAGEN:-supabase/postgres:17.6.1.178}"

psql_pg()    { docker exec -i "$C" psql -U postgres       -d postgres -X -v ON_ERROR_STOP=1 "$@"; }
psql_admin() { docker exec -i "$C" psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 "$@"; }
trap 'docker rm -f "$C" >/dev/null 2>&1 || true' EXIT

echo "== Contenedor $C ($IMAGEN)"
docker rm -f "$C" >/dev/null 2>&1 || true
docker run -d --name "$C" -e POSTGRES_PASSWORD=postgres "$IMAGEN" >/dev/null
for _ in $(seq 1 90); do
  if docker logs "$C" 2>&1 | grep -q 'init process complete' && docker exec "$C" pg_isready -q -U postgres 2>/dev/null; then break; fi
  sleep 1
done
docker exec "$C" pg_isready -U postgres

echo "== Estructura real de la base (dump de LVE + ajustes de la 24)"
# Único stub: storage.buckets (en Supabase la crea el servicio Storage, no la imagen de Postgres)
psql_admin -q -c "create table if not exists storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]); grant all on storage.buckets to postgres;"
psql_pg -q --single-transaction -f - < <(cat "$EST/01_permisos_previos.sql" "$EST/02_estructura_desde_lve.sql") > /dev/null
psql_pg -q --single-transaction -f - < "$EST/03_ajustes_sucursal_24.sql" 2>&1 | grep -v NOTICE || true
psql_pg -At -c "select 'tablas en public: ' || count(*) from pg_tables where schemaname = 'public'"

echo "== Migración, pasada 1 (archivo en una transacción)"
psql_pg -q --single-transaction -f - < "$SQL_DIR/20261004_tienda_web.sql" 2>&1 | grep -v NOTICE || true
echo "== Migración, pasada 2 (todo el archivo en UN query, como scripts/run-migration.mjs)"
psql_pg -q -c "$(cat "$SQL_DIR/20261004_tienda_web.sql")" 2>&1 | grep -v NOTICE || true

echo "== Pruebas funcionales y de permisos"
psql_pg -f - < "$AQUI/prueba_tienda_web.sql" 2>&1 | sed 's/^psql:<stdin>:[0-9]*: //'

echo "== Concurrencia"
CONTENEDOR="$C" bash "$AQUI/prueba_concurrencia.sh"

echo "== Reloj opcional (pg_cron), dos veces"
psql_pg -q -f - < "$SQL_DIR/opcional_cron_vencimientos.sql" > /dev/null
psql_pg -q -f - < "$SQL_DIR/opcional_cron_vencimientos.sql" > /dev/null
psql_pg -At -c "select 'job: ' || jobname || ' ' || schedule || ' ' || command from cron.job where jobname = 'tienda-vencimientos'"
psql_pg -At -c "select 'el job como postgres: ' || public.tienda_vencer_pendientes()"

echo "== Rollback, dos veces, y la migración de nuevo"
psql_pg -q --single-transaction -f - < "$SQL_DIR/rollback_tienda_web.sql" > /dev/null
psql_pg -q --single-transaction -f - < "$SQL_DIR/rollback_tienda_web.sql" > /dev/null
psql_pg -At -c "select 'después del rollback: objetos tienda* = ' || (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relname like 'tienda%') || ', funciones = ' || (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'tienda%') || ', setting = ' || (select count(*) from public.app_settings where key = 'tienda') || ', cron = ' || (select count(*) from cron.job where jobname = 'tienda-vencimientos')"
psql_pg -q --single-transaction -f - < "$SQL_DIR/20261004_tienda_web.sql" 2>&1 | grep -v NOTICE || true
psql_pg -At -c "select 'reaplicada: ' || count(*) || ' producto(s), setting ' || (select count(*) from public.app_settings where key = 'tienda') from public.tienda_productos"

echo "LISTO: todo pasó. Se borra el contenedor."
