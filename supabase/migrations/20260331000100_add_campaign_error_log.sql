-- Migration to add error_log column to campaigns table
ALTER TABLE IF EXISTS public.campaigns 
ADD COLUMN IF NOT EXISTS error_log TEXT;

-- Update status check to be more descriptive if needed, 
-- but 'failed' is already included in the check constraint.
