-- Fix crm_stage constraint to match Vetly's 5-stage pipeline
-- (stages the AI moves leads through automatically based on behavior)
ALTER TABLE demo_requests
    DROP CONSTRAINT IF EXISTS demo_requests_crm_stage_check;

ALTER TABLE demo_requests
    ADD CONSTRAINT demo_requests_crm_stage_check
    CHECK (crm_stage IN ('nuevo', 'contactado', 'prueba_iniciada', 'convertido', 'postergado_perdido'));

-- Migrate any existing rows with old stage values
UPDATE demo_requests SET crm_stage = 'postergado_perdido' WHERE crm_stage IN ('perdido', 'postergado');
UPDATE demo_requests SET crm_stage = 'nuevo'              WHERE crm_stage IN ('demo_agendada') OR crm_stage IS NULL;
