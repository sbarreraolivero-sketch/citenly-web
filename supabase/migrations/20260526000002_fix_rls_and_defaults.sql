-- ============================================================
-- 1. reminder_settings — defaults OFF para nuevas clínicas
-- Nuevas clínicas no deben tener recordatorios activos hasta
-- que configuren sus templates de WhatsApp.
-- ============================================================
ALTER TABLE reminder_settings
    ALTER COLUMN reminder_24h_before SET DEFAULT false,
    ALTER COLUMN reminder_2h_before  SET DEFAULT false,
    ALTER COLUMN request_confirmation SET DEFAULT false;

-- ============================================================
-- 2. subscriptions — columna manually_active
-- Para clínicas que pagan por transferencia bancaria (sin MercadoPago).
-- Activar con: UPDATE subscriptions SET manually_active = true WHERE clinic_id = '...';
-- ============================================================
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS manually_active BOOLEAN DEFAULT false;

-- ============================================================
-- 3. Habilitar RLS en tablas que puedan carecer de protección.
-- Política estándar: acceso solo a filas de la clínica propia.
-- Se usan IF NOT EXISTS para idempotencia.
-- ============================================================

-- tags
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'clinic_members_tags_select'
    ) THEN
        CREATE POLICY clinic_members_tags_select ON tags
            FOR SELECT USING (
                clinic_id IN (
                    SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
                )
            );
        CREATE POLICY clinic_members_tags_insert ON tags
            FOR INSERT WITH CHECK (
                clinic_id IN (
                    SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
                )
            );
        CREATE POLICY clinic_members_tags_update ON tags
            FOR UPDATE USING (
                clinic_id IN (
                    SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
                )
            );
        CREATE POLICY clinic_members_tags_delete ON tags
            FOR DELETE USING (
                clinic_id IN (
                    SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
                )
            );
        CREATE POLICY service_role_tags ON tags
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- patient_tags
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'patient_tags' AND policyname = 'clinic_members_patient_tags_select'
    ) THEN
        CREATE POLICY clinic_members_patient_tags_select ON patient_tags
            FOR SELECT USING (
                clinic_id IN (
                    SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
                )
            );
        CREATE POLICY clinic_members_patient_tags_insert ON patient_tags
            FOR INSERT WITH CHECK (
                clinic_id IN (
                    SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
                )
            );
        CREATE POLICY clinic_members_patient_tags_delete ON patient_tags
            FOR DELETE USING (
                clinic_id IN (
                    SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
                )
            );
        CREATE POLICY service_role_patient_tags ON patient_tags
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- debug_logs — solo service_role puede leer (contiene datos sensibles)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'debug_logs' AND policyname = 'service_role_debug_logs'
    ) THEN
        ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY service_role_debug_logs ON debug_logs
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ============================================================
-- 4. CRM — auto-cierre de prospectos con cita ya pasada
-- Mueve prospectos del stage "Cita agendada" → "Cerrado"
-- cuando la appointment_date ya pasó.
-- ============================================================
CREATE OR REPLACE FUNCTION auto_close_crm_prospects()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clinic_id UUID;
    v_closed_stage_id UUID;
    v_scheduled_stage_id UUID;
BEGIN
    FOR v_clinic_id IN SELECT DISTINCT clinic_id FROM crm_pipeline_stages LOOP
        -- Find the "Cerrado" stage for this clinic
        SELECT id INTO v_closed_stage_id
        FROM crm_pipeline_stages
        WHERE clinic_id = v_clinic_id
          AND (LOWER(name) LIKE '%cerrad%' OR position = (
              SELECT MAX(position) FROM crm_pipeline_stages WHERE clinic_id = v_clinic_id
          ))
        LIMIT 1;

        -- Find the "Cita agendada" stage for this clinic
        SELECT id INTO v_scheduled_stage_id
        FROM crm_pipeline_stages
        WHERE clinic_id = v_clinic_id
          AND (LOWER(name) LIKE '%agendad%' OR LOWER(name) LIKE '%cita%')
        LIMIT 1;

        IF v_closed_stage_id IS NOT NULL AND v_scheduled_stage_id IS NOT NULL THEN
            UPDATE crm_prospects
            SET stage_id = v_closed_stage_id,
                updated_at = NOW()
            WHERE clinic_id = v_clinic_id
              AND stage_id = v_scheduled_stage_id
              AND appointment_date < NOW();
        END IF;
    END LOOP;
END;
$$;

-- Schedule: run daily at 06:00 UTC
SELECT cron.schedule(
    'auto-close-crm-prospects',
    '0 6 * * *',
    'SELECT auto_close_crm_prospects()'
) ON CONFLICT DO NOTHING;
