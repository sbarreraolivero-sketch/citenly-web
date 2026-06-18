-- Migration: Crear satisfaction_surveys en producción (NPS del Dashboard)
-- Date: 2026-06-18
--
-- La tabla existía solo en migraciones locales; nunca se aplicó a producción, por eso
-- la tarjeta NPS del dashboard rompía el Promise.all (sesión 15). Esta migración la crea
-- con RLS scopeada por clínica (más segura que la versión original que usaba
-- auth.role()='authenticated' global).

CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'responded', 'failed')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  whatsapp_message_id TEXT,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_appointment ON public.satisfaction_surveys(appointment_id);
CREATE INDEX IF NOT EXISTS idx_surveys_patient ON public.satisfaction_surveys(patient_id);
CREATE INDEX IF NOT EXISTS idx_surveys_clinic ON public.satisfaction_surveys(clinic_id);

DROP TRIGGER IF EXISTS update_satisfaction_surveys_updated_at ON public.satisfaction_surveys;
CREATE TRIGGER update_satisfaction_surveys_updated_at
  BEFORE UPDATE ON public.satisfaction_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Edge functions (service role) acceso total
DROP POLICY IF EXISTS "Service role full access to surveys" ON public.satisfaction_surveys;
CREATE POLICY "Service role full access to surveys"
  ON public.satisfaction_surveys FOR ALL
  USING (auth.role() = 'service_role');

-- Miembros de la clínica: lectura solo de sus propias encuestas
DROP POLICY IF EXISTS "Clinic members can read surveys" ON public.satisfaction_surveys;
CREATE POLICY "Clinic members can read surveys"
  ON public.satisfaction_surveys FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid() AND status = 'active'));
