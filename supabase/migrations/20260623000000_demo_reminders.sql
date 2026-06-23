-- Recordatorios de videollamadas agendadas por el agente de ventas (Sofía).
-- Flags de control para que el cron no envíe duplicados (24h / 2h antes).
ALTER TABLE demo_requests
    ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS reminder_2h_sent  boolean DEFAULT false;
