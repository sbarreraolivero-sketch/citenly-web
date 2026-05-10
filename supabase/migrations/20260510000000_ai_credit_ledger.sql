-- Migration: Credit Ledger System
-- Adds support for tracking transactions and monthly rollovers

-- 1. Add balance tracking to clinic_settings
ALTER TABLE public.clinic_settings 
ADD COLUMN IF NOT EXISTS ai_credits_balance BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_monthly_credit_allowance BIGINT DEFAULT 1000; -- Default allowance

-- 2. Create the Ledger Table for transparency
CREATE TABLE IF NOT EXISTS public.ai_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('monthly_refill', 'purchase', 'usage', 'adjustment')),
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Clinics can see their own transactions
CREATE POLICY "Clinics can view their own transactions" 
ON public.ai_credit_transactions FOR SELECT 
USING (auth.uid() IN (
  SELECT id FROM auth.users WHERE id IN (
    SELECT id FROM public.clinic_settings WHERE id = clinic_id
  )
));

-- 3. Initial Sync: Set balance based on usage (Legacy support)
-- We assume they started with 1000 and spent what is in ai_credits_used
UPDATE public.clinic_settings 
SET ai_credits_balance = GREATEST(0, ai_monthly_credit_allowance - COALESCE(ai_credits_used, 0))
WHERE ai_credits_balance = 0;
