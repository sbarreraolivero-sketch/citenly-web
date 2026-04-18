-- Adición de columna metadata para especialidades (Ortodoncia, etc.)
ALTER TABLE public.clinical_records 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
