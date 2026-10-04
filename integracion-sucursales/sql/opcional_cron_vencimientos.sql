-- ---------------------------------------------------------------------------
-- Reloj de vencimientos de la tienda web (pg_cron). OPCIONAL.
-- Correr UNA vez en Supabase → SQL Editor (proyecto de Sala de Profes),
-- después de la migración 20261004_tienda_web.sql. Sirve igual para las dos
-- sucursales: no llama a ninguna URL ni usa secretos, corre SQL directo.
--   tienda-vencimientos  cada hora (minuto 7): pasa a 'cancelado' (motivo
--                        'vencido') los pedidos web sin pagar cuyo plazo ya pasó.
-- Sin este reloj los pedidos vencidos siguen figurando como 'pendiente_pago'
-- (ya no cuentan para el límite por teléfono, pero ensucian la lista). La
-- alternativa es que la app llame a tienda_vencer_pendientes() desde un cron
-- propio (por ejemplo dentro de /api/cron/fudo-pulso).
-- Si se corre de nuevo, cron.schedule con el mismo nombre actualiza el job.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule(
  'tienda-vencimientos',
  '7 * * * *',
  $$ select public.tienda_vencer_pendientes(); $$
);

-- Para comprobar que anda (después del minuto 7 de la hora siguiente):
--   select status, return_message, start_time from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'tienda-vencimientos')
--    order by start_time desc limit 5;
-- Tiene que decir 'succeeded' y '1 row'. Para sacarlo:
--   select cron.unschedule('tienda-vencimientos');
