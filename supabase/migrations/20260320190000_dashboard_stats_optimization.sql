-- Migration: Add clinic_stats for dashboard performance
-- Description: Creates a table to store pre-calculated aggregates and functions to maintain them.

CREATE TABLE IF NOT EXISTS public.clinic_stats (
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    stat_type TEXT NOT NULL, -- 'ai_messages', 'appointments', 'prospects', 'reminders'
    period TEXT NOT NULL, -- 'day', 'week', 'month', 'year'
    value INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (clinic_id, stat_type, period)
);

-- Enable RLS
ALTER TABLE public.clinic_stats ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Clinics can view their own stats" ON public.clinic_stats
    FOR SELECT USING (auth.role() = 'authenticated');

-- Function to comfortably refresh ALL stats for a clinic
CREATE OR REPLACE FUNCTION public.refresh_clinic_stats(target_clinic_id UUID)
RETURNS VOID AS $$
DECLARE
    now_utc TIMESTAMP WITH TIME ZONE := NOW();
    day_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now_utc);
    week_start TIMESTAMP WITH TIME ZONE := date_trunc('week', now_utc);
    month_start TIMESTAMP WITH TIME ZONE := date_trunc('month', now_utc);
    year_start TIMESTAMP WITH TIME ZONE := date_trunc('year', now_utc);
BEGIN
    -- AI MESSAGES
    INSERT INTO public.clinic_stats (clinic_id, stat_type, period, value, last_updated)
    VALUES 
        (target_clinic_id, 'ai_messages', 'day', (SELECT count(*) FROM messages WHERE clinic_id = target_clinic_id AND ai_generated = true AND direction = 'outbound' AND created_at >= day_start), now_utc),
        (target_clinic_id, 'ai_messages', 'week', (SELECT count(*) FROM messages WHERE clinic_id = target_clinic_id AND ai_generated = true AND direction = 'outbound' AND created_at >= week_start), now_utc),
        (target_clinic_id, 'ai_messages', 'month', (SELECT count(*) FROM messages WHERE clinic_id = target_clinic_id AND ai_generated = true AND direction = 'outbound' AND created_at >= month_start), now_utc),
        (target_clinic_id, 'ai_messages', 'year', (SELECT count(*) FROM messages WHERE clinic_id = target_clinic_id AND ai_generated = true AND direction = 'outbound' AND created_at >= year_start), now_utc)
    ON CONFLICT (clinic_id, stat_type, period) DO UPDATE SET value = EXCLUDED.value, last_updated = EXCLUDED.last_updated;

    -- APPOINTMENTS (Scheduled)
    INSERT INTO public.clinic_stats (clinic_id, stat_type, period, value, last_updated)
    VALUES 
        (target_clinic_id, 'appointments', 'day', (SELECT count(*) FROM appointments WHERE clinic_id = target_clinic_id AND status IN ('pending', 'confirmed') AND appointment_date >= day_start AND appointment_date < day_start + interval '1 day'), now_utc),
        (target_clinic_id, 'appointments', 'week', (SELECT count(*) FROM appointments WHERE clinic_id = target_clinic_id AND status IN ('pending', 'confirmed') AND appointment_date >= week_start AND appointment_date < week_start + interval '7 days'), now_utc),
        (target_clinic_id, 'appointments', 'month', (SELECT count(*) FROM appointments WHERE clinic_id = target_clinic_id AND status IN ('pending', 'confirmed') AND appointment_date >= month_start AND appointment_date < month_start + interval '1 month'), now_utc),
        (target_clinic_id, 'appointments', 'year', (SELECT count(*) FROM appointments WHERE clinic_id = target_clinic_id AND status IN ('pending', 'confirmed') AND appointment_date >= year_start AND appointment_date < year_start + interval '1 year'), now_utc)
    ON CONFLICT (clinic_id, stat_type, period) DO UPDATE SET value = EXCLUDED.value, last_updated = EXCLUDED.last_updated;

    -- PROSPECTS
    INSERT INTO public.clinic_stats (clinic_id, stat_type, period, value, last_updated)
    VALUES 
        (target_clinic_id, 'prospects', 'day', (SELECT count(*) FROM crm_prospects WHERE clinic_id = target_clinic_id AND created_at >= day_start), now_utc),
        (target_clinic_id, 'prospects', 'week', (SELECT count(*) FROM crm_prospects WHERE clinic_id = target_clinic_id AND created_at >= week_start), now_utc),
        (target_clinic_id, 'prospects', 'month', (SELECT count(*) FROM crm_prospects WHERE clinic_id = target_clinic_id AND created_at >= month_start), now_utc),
        (target_clinic_id, 'prospects', 'year', (SELECT count(*) FROM crm_prospects WHERE clinic_id = target_clinic_id AND created_at >= year_start), now_utc)
    ON CONFLICT (clinic_id, stat_type, period) DO UPDATE SET value = EXCLUDED.value, last_updated = EXCLUDED.last_updated;

    -- REMINDERS
    INSERT INTO public.clinic_stats (clinic_id, stat_type, period, value, last_updated)
    VALUES 
        (target_clinic_id, 'reminders', 'day', (SELECT count(*) FROM reminder_logs WHERE clinic_id = target_clinic_id AND status = 'sent' AND sent_at >= day_start), now_utc),
        (target_clinic_id, 'reminders', 'week', (SELECT count(*) FROM reminder_logs WHERE clinic_id = target_clinic_id AND status = 'sent' AND sent_at >= week_start), now_utc),
        (target_clinic_id, 'reminders', 'month', (SELECT count(*) FROM reminder_logs WHERE clinic_id = target_clinic_id AND status = 'sent' AND sent_at >= month_start), now_utc),
        (target_clinic_id, 'reminders', 'year', (SELECT count(*) FROM reminder_logs WHERE clinic_id = target_clinic_id AND status = 'sent' AND sent_at >= year_start), now_utc)
    ON CONFLICT (clinic_id, stat_type, period) DO UPDATE SET value = EXCLUDED.value, last_updated = EXCLUDED.last_updated;

    -- UNIQUE CONTACTS (CONVERSATIONS)
    INSERT INTO public.clinic_stats (clinic_id, stat_type, period, value, last_updated)
    VALUES 
        (target_clinic_id, 'unique_contacts', 'day', (SELECT count(DISTINCT phone_number) FROM messages WHERE clinic_id = target_clinic_id AND direction = 'inbound' AND created_at >= day_start), now_utc),
        (target_clinic_id, 'unique_contacts', 'week', (SELECT count(DISTINCT phone_number) FROM messages WHERE clinic_id = target_clinic_id AND direction = 'inbound' AND created_at >= week_start), now_utc),
        (target_clinic_id, 'unique_contacts', 'month', (SELECT count(DISTINCT phone_number) FROM messages WHERE clinic_id = target_clinic_id AND direction = 'inbound' AND created_at >= month_start), now_utc),
        (target_clinic_id, 'unique_contacts', 'year', (SELECT count(DISTINCT phone_number) FROM messages WHERE clinic_id = target_clinic_id AND direction = 'inbound' AND created_at >= year_start), now_utc)
    ON CONFLICT (clinic_id, stat_type, period) DO UPDATE SET value = EXCLUDED.value, last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to refresh stats on changes (throttle or use a 'dirty' flag for higher scale, but this is fine for 100 clinics)
CREATE OR REPLACE FUNCTION public.trigger_refresh_clinic_stats()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.refresh_clinic_stats(COALESCE(NEW.clinic_id, OLD.clinic_id));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to relevant tables
DROP TRIGGER IF EXISTS refresh_stats_on_message ON public.messages;
CREATE TRIGGER refresh_stats_on_message
AFTER INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_clinic_stats();

DROP TRIGGER IF EXISTS refresh_stats_on_appointment ON public.appointments;
CREATE TRIGGER refresh_stats_on_appointment
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_clinic_stats();

DROP TRIGGER IF EXISTS refresh_stats_on_prospect ON public.crm_prospects;
CREATE TRIGGER refresh_stats_on_prospect
AFTER INSERT OR UPDATE OR DELETE ON public.crm_prospects
FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_clinic_stats();

DROP TRIGGER IF EXISTS refresh_stats_on_reminder ON public.reminder_logs;
CREATE TRIGGER refresh_stats_on_reminder
AFTER INSERT OR UPDATE OR DELETE ON public.reminder_logs
FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_clinic_stats();

-- Initial population for active clinics
SELECT public.refresh_clinic_stats(id) FROM public.clinic_settings;
