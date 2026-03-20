-- Migration: Separate AI Credits & Model Tracking
-- 1. Add columns to clinic_settings
ALTER TABLE public.clinic_settings 
ADD COLUMN IF NOT EXISTS ai_active_model TEXT DEFAULT 'mini',
ADD COLUMN IF NOT EXISTS ai_credits_extra_4o INTEGER DEFAULT 0;

-- 2. Add ai_model column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS ai_model TEXT;

-- 3. Backfill existing ai_generated messages as 'mini'
UPDATE public.messages 
SET ai_model = 'mini' 
WHERE ai_generated = true AND ai_model IS NULL;
