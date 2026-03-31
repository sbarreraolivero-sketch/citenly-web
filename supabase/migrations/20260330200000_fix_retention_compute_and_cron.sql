-- =============================================================
-- MIGRATION: Fix Retention Compute + Add Cron Schedule
-- =============================================================
-- PROBLEMS FIXED:
-- 1. compute_clinic_retention_scores used INNER JOIN on appointments,
--    excluding patients with no linked appointment (created manually/imported).
--    Fixed: Now processes ALL patients in the clinic.
-- 2. No cron job was ever scheduled for cron-retention-compute.
--    Fixed: Added a daily cron at 3am UTC.
-- =============================================================

-- FIX 1: Redefine compute_clinic_retention_scores to use ALL patients
CREATE OR REPLACE FUNCTION public.compute_clinic_retention_scores(p_clinic_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_patient RECORD;
  v_result RECORD;
  v_count INTEGER := 0;
  v_previous_risk TEXT;
BEGIN
  -- *** FIX: use all patients from the clinic, not only those with linked appointments ***
  FOR v_patient IN
    SELECT id AS patient_id
    FROM public.patients
    WHERE clinic_id = p_clinic_id
  LOOP
    SELECT prs.risk_level INTO v_previous_risk
    FROM public.patient_retention_scores prs
    WHERE prs.patient_id = v_patient.patient_id AND prs.clinic_id = p_clinic_id;

    SELECT * INTO v_result
    FROM public.calculate_patient_retention_score(p_clinic_id, v_patient.patient_id);

    INSERT INTO public.patient_retention_scores (
      clinic_id, patient_id, score, risk_level,
      days_since_last_visit, expected_return_days, delay_days,
      avg_ticket, total_visits, cancellation_count, no_show_count,
      is_vip, frequency_irregular, high_ticket,
      last_service, last_visit_date, assigned_professional,
      computed_at, previous_risk_level
    ) VALUES (
      p_clinic_id, v_patient.patient_id, v_result.score, v_result.risk_level,
      v_result.days_since_last_visit, v_result.expected_return_days, v_result.delay_days,
      v_result.avg_ticket, v_result.total_visits, v_result.cancellation_count, v_result.no_show_count,
      v_result.is_vip, v_result.frequency_irregular, v_result.high_ticket,
      v_result.last_service, v_result.last_visit_date, v_result.assigned_professional,
      NOW(), v_previous_risk
    )
    ON CONFLICT (clinic_id, patient_id) DO UPDATE SET
      score = EXCLUDED.score, risk_level = EXCLUDED.risk_level,
      days_since_last_visit = EXCLUDED.days_since_last_visit,
      expected_return_days = EXCLUDED.expected_return_days,
      delay_days = EXCLUDED.delay_days, avg_ticket = EXCLUDED.avg_ticket,
      total_visits = EXCLUDED.total_visits, cancellation_count = EXCLUDED.cancellation_count,
      no_show_count = EXCLUDED.no_show_count, is_vip = EXCLUDED.is_vip,
      frequency_irregular = EXCLUDED.frequency_irregular, high_ticket = EXCLUDED.high_ticket,
      last_service = EXCLUDED.last_service, last_visit_date = EXCLUDED.last_visit_date,
      assigned_professional = EXCLUDED.assigned_professional,
      computed_at = EXCLUDED.computed_at, previous_risk_level = EXCLUDED.previous_risk_level;

    -- Keep history of score changes
    INSERT INTO public.retention_score_history (clinic_id, patient_id, score, risk_level)
    VALUES (p_clinic_id, v_patient.patient_id, v_result.score, v_result.risk_level);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- FIX 2: Schedule the retention compute cron (runs daily at 3am UTC)
-- Remove old job if it somehow exists to avoid duplicates
SELECT cron.unschedule('retention-compute-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'retention-compute-daily'
);

SELECT cron.schedule(
    'retention-compute-daily',
    '0 3 * * *',
    $$
    SELECT net.http_post(
        url:='https://hubjqllcmbzoojyidgcu.supabase.co/functions/v1/cron-retention-compute',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YmpxbGxjbWJ6b29qeWlkZ2N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0OTc3MCwiZXhwIjoyMDg1NzI1NzcwfQ.lnOepDZP07NwIvROxdHZG6sLST4vJs51QIDCQs7cF6o"}'::jsonb,
        body:='{}'::jsonb
    ) AS request_id;
    $$
);
