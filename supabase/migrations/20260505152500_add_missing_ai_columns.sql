-- Migration: Add missing AI columns to messages
-- Description: Adds ai_cost and ai_tier columns to the messages table to support Hybrid AI tracking.

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS ai_cost INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ai_tier INTEGER DEFAULT 1;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
