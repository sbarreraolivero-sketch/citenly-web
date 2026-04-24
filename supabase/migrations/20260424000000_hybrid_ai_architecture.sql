-- Migration: Hybrid AI Architecture Foundation
-- Description: Adds columns for AI Strategy and Unified Credits, and migrates existing data.

-- 1. Add columns to clinic_settings
ALTER TABLE public.clinic_settings 
ADD COLUMN IF NOT EXISTS ai_strategy TEXT DEFAULT 'auto', -- 'auto' (Optimized), 'eco' (N1), 'pro' (N3)
ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_credits_limit INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS ai_credits_extra INTEGER DEFAULT 0;

-- 2. Migrate existing mini credits to unified credits (best effort)
UPDATE public.clinic_settings
SET 
  ai_credits_used = COALESCE(ai_credits_monthly_mini_used, 0) + (COALESCE(ai_credits_monthly_4o_used, 0) * 8),
  ai_credits_limit = COALESCE(ai_credits_monthly_limit, 500),
  ai_credits_extra = COALESCE(ai_credits_extra_balance, 0) + (COALESCE(ai_credits_extra_4o, 0) * 8);

-- 3. Update get_all_clinics_usage RPC to include unified credits
CREATE OR REPLACE FUNCTION public.get_all_clinics_usage()
RETURNS TABLE (
    clinic_id UUID,
    clinic_name TEXT,
    plan TEXT,
    credits_limit INTEGER,
    credits_used INTEGER,
    extra_balance INTEGER,
    ai_strategy TEXT,
    active_model TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id as clinic_id,
        cs.clinic_name,
        cs.subscription_plan as plan,
        cs.ai_credits_limit as credits_limit,
        cs.ai_credits_used as credits_used,
        cs.ai_credits_extra as extra_balance,
        cs.ai_strategy,
        cs.ai_active_model as active_model
    FROM public.clinic_settings cs;
END;
$$;

-- 4. Unified reset procedure
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_usage()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.clinic_settings
    SET 
        ai_credits_used = 0,
        ai_credits_monthly_mini_used = 0,
        ai_credits_monthly_4o_used = 0;
END;
$$;
