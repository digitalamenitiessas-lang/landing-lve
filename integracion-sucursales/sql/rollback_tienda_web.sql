-- ---------------------------------------------------------------------------
-- Vuelta atrás de 20261004_tienda_web.sql (tienda web de la landing)
-- ---------------------------------------------------------------------------
-- OJO: BORRA TODAS LAS VENTAS WEB, sus líneas, los productos de la tienda y la
-- configuración 'tienda' (alias, CBU, WhatsApp, horarios de retiro). No se
-- puede deshacer. Si hay ventas que importan, exportalas antes:
--   select * from public.tienda_ventas order by numero;
-- Antes de correrlo, apagá la tienda en la landing (o la variable de la
-- sucursal) para que no entren pedidos a una API que ya no existe.
-- No toca public.set_updated_at() (es de toda la base).
-- Se puede correr más de una vez.
-- ---------------------------------------------------------------------------

-- 1. Reloj de vencimientos, si se creó con opcional_cron_vencimientos.sql
do $$
begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule(jobid) from cron.job where jobname = 'tienda-vencimientos';
  end if;
end $$;

-- 2. Funciones
drop function if exists public.tienda_crear_venta(jsonb, text, text);
drop function if exists public.tienda_vencer_pendientes();

-- 3. Tablas (los triggers, índices y políticas se van con ellas)
drop table if exists public.tienda_venta_items;
drop table if exists public.tienda_ventas;
drop sequence if exists public.tienda_ventas_numero_seq;
drop table if exists public.tienda_productos;

-- 4. Configuración
delete from public.app_settings where key = 'tienda';

notify pgrst, 'reload schema';
