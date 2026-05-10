-- Habilitar la extensión de cron si no está habilitada
create extension if not exists pg_cron;

-- Programar la tarea para que corra todos los días a las 00:01 AM (Hora UTC)
-- Esto llamará a la Edge Function que acabamos de crear
select cron.schedule(
  'monthly-ai-credit-recharge',
  '1 0 * * *',
  $$
  select net.http_post(
    url := 'https://' || (select value from settings where key = 'supabase_project_ref') || '.functions.supabase.co/cron-monthly-credit-recharge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from settings where key = 'supabase_service_key')
    ),
    body := '{}'
  );
  $$
);
