-- TABLA: dental_general_evolutions
-- Almacena detalles técnicos de odontología general (restauradora, cirugía, etc.)
CREATE TABLE IF NOT EXISTS public.dental_general_evolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    
    tooth_numbers TEXT[], -- Array de piezas tratadas
    anesthesia_type TEXT, -- Infiltrativa, Spix, etc.
    anesthesia_dosage TEXT, -- Cantidad de carpules
    isolation_type TEXT, -- Absoluto, Relativo
    materials_used TEXT, -- Resinas, cementos, etc.
    sensitivity_test TEXT, 
    mobility_level TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.dental_general_evolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage dental general evolutions" ON public.dental_general_evolutions 
FOR ALL USING (auth.role() = 'authenticated');

-- Índice
CREATE INDEX IF NOT EXISTS idx_dental_gen_evolutions_patient ON public.dental_general_evolutions(patient_id);
