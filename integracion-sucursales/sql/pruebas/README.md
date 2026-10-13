# Pruebas de la migración de la tienda web

Verifican `../20261004_tienda_web.sql`, `../rollback_tienda_web.sql` y
`../opcional_cron_vencimientos.sql` en un Postgres **descartable** con Docker.
No tocan ninguna base real.

## Correr todo (unos 2 minutos)

```bash
cd integracion-sucursales/sql/pruebas
SALA_REPO=../ruta/a/sala-de-profes-24 bash correr_pruebas.sh
```

`correr_pruebas.sh`:

1. Levanta `lve-kit-pg` con `supabase/postgres:17.6.1.178` (producción es Postgres 17.6).
2. Carga la estructura real desde `$SALA_REPO/supabase/estructura/` (01, 02 y 03), solo leyéndola.
   Único stub: `storage.buckets`, que en Supabase crea el servicio Storage y no la imagen de Postgres.
3. Aplica la migración dos veces: con `--single-transaction` y como un solo query
   (igual que `scripts/run-migration.mjs`).
4. Corre `prueba_tienda_web.sql`: casos de negocio y de permisos con `ASSERT`.
5. Corre `prueba_concurrencia.sh`: dos requests con la misma clave al mismo tiempo, con
   la función real y con una copia sin candados (para probar el `unique_violation`), y la
   misma clave con otro teléfono (no es un reintento: `datos_invalidos` y el token no cambia).
6. Aplica el reloj de pg_cron dos veces, el rollback dos veces y vuelve a aplicar la migración.
7. Borra el contenedor, también si algo falla.

Si todo anda, termina con `TODAS LAS PRUEBAS PASARON`, `CONCURRENCIA OK` y `LISTO`.
Si algo falla, se corta con `FALLO <prueba>`.

## Correr solo las pruebas SQL contra un contenedor ya armado

```bash
docker exec -i lve-kit-pg psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -f - < prueba_tienda_web.sql
CONTENEDOR=lve-kit-pg bash prueba_concurrencia.sh
```

`prueba_tienda_web.sql` espera una base recién migrada, sin ventas (los códigos esperados
arrancan en `WEB-SF-0001`). Crea usuarios `*@prueba.test` y los esquemas `prueba` / `prueba_c`:
**nunca correrlo contra Supabase real.**
