-- AI Credit System
ALTER TABLE clinic_settings 
ADD COLUMN IF NOT EXISTS ai_credits_monthly_limit INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS ai_credits_extra_balance INTEGER DEFAULT 0;

-- Update existing clinics based on their current plan
UPDATE clinic_settings 
SET ai_credits_monthly_limit = 500 
WHERE subscription_plan = 'essence' OR subscription_plan IS NULL;

UPDATE clinic_settings 
SET ai_credits_monthly_limit = 1000 
WHERE subscription_plan = 'radiance';

UPDATE clinic_settings 
SET ai_credits_monthly_limit = 2000 
WHERE subscription_plan = 'prestige';

-- RPC to get usage for superadmin
CREATE OR REPLACE FUNCTION get_all_clinics_usage()
RETURNS TABLE (
    clinic_id UUID,
    clinic_name TEXT,
    plan TEXT,
    monthly_limit INTEGER,
    extra_balance INTEGER,
    messages_used_this_month BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id as clinic_id,
        cs.clinic_name,
        cs.subscription_plan as plan,
        cs.ai_credits_monthly_limit as monthly_limit,
        cs.ai_credits_extra_balance as extra_balance,
        (
            SELECT count(*) 
            FROM messages m 
            WHERE m.clinic_id = cs.id 
              AND m.ai_generated = true 
              AND m.created_at >= date_trunc('month', now())
        ) as messages_used_this_month
    FROM clinic_settings cs;
END;
$$;
