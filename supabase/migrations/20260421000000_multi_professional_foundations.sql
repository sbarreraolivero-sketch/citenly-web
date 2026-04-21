-- Migration: Multi-Professional and Resources Foundations
-- Description: Adds boxes, professional linking to budgets/records, and clinical safety fields.

-- 1. Clinic Settings: Add Boxes definition
ALTER TABLE public.clinic_settings 
ADD COLUMN IF NOT EXISTS boxes JSONB DEFAULT '[]'::jsonb;

-- 2. Appointments: Add Box resource tracking
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS box_id TEXT;

-- 3. Budgets: Link to specific Professional
ALTER TABLE public.dental_budgets 
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES public.clinic_members(id) ON DELETE SET NULL;

-- 4. Clinical Records: Link to specific Professional (who performed the treatment)
ALTER TABLE public.clinical_records 
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES public.clinic_members(id) ON DELETE SET NULL;

-- 5. Patients: Clinical Safety Fields for the "Security Header"
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS medical_history TEXT,
ADD COLUMN IF NOT EXISTS is_high_risk BOOLEAN DEFAULT false;

-- Create index for professional in clinical records
CREATE INDEX IF NOT EXISTS idx_clinical_records_professional ON public.clinical_records(professional_id);
