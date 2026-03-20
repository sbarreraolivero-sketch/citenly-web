-- =============================================
-- FIX: AUTOMATED REMINDERS CRON JOBS
-- =============================================

-- 1. Unschedule old jobs to avoid duplicates or calling old URLs
SELECT cron.unschedule('process-reminders-hourly');
SELECT cron.unschedule('process-surveys-hourly');

-- 2. Schedule: Process Reminders (Hourly)
-- Using the current project URL and Service Role Key from the environment
SELECT cron.schedule(
    'process-reminders-hourly',
    '0 * * * *', -- Every hour at minute 0
    $$
    select
      net.http_post(
          url:='https://hubjqllcmbzoojyidgcu.supabase.co/functions/v1/cron-process-reminders',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YmpxbGxjbWJ6b29qeWlkZ2N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0OTc3MCwiZXhwIjoyMDg1NzI1NzcwfQ.lnOepDZP07NwIvROxdHZG6sLST4vJs51QIDCQs7cF6o"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- 3. Schedule: Process Surveys (Hourly)
SELECT cron.schedule(
    'process-surveys-hourly',
    '0 * * * *', -- Every hour at minute 0
    $$
    select
      net.http_post(
          url:='https://hubjqllcmbzoojyidgcu.supabase.co/functions/v1/cron-process-surveys',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YmpxbGxjbWJ6b29qeWlkZ2N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0OTc3MCwiZXhwIjoyMDg1NzI1NzcwfQ.lnOepDZP07NwIvROxdHZG6sLST4vJs51QIDCQs7cF6o"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

COMMENT ON COLUMN public.reminder_logs.type IS 'Type of reminder: 24h, 2h, 1h';
