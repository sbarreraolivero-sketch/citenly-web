-- TABLA: orthodontic_evolutions
-- Almacena la evolución técnica de ortodoncia de forma independiente
CREATE TABLE IF NOT EXISTS public.orthodontic_evolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    phase TEXT,
    upper_wire TEXT,
    lower_wire TEXT,
    angle_class_molar TEXT,
    angle_class_canine TEXT,
    elastics TEXT,
    hygiene TEXT DEFAULT 'buena',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.orthodontic_evolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage ortho evolutions" ON public.orthodontic_evolutions 
FOR ALL USING (auth.role() = 'authenticated');

-- Índice para búsquedas rápidas por paciente
CREATE INDEX IF NOT EXISTS idx_ortho_evolutions_patient ON public.orthodontic_evolutions(patient_id);
