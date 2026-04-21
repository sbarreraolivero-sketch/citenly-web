-- SQL MIGRATION: CLINICAL ORTHODONTIC SUITE
-- Este script habilita las tablas necesarias para el odontograma, periodontograma, 
-- recetas y la gestión de boxes.

-- 1. Tabla de Odontogramas y Periodontogramas
CREATE TABLE IF NOT EXISTS dental_odontograms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb, -- Datos del Odontograma FDI
    periodontogram_data JSONB DEFAULT '{}'::jsonb, -- Datos del Periodontograma
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(clinic_id, patient_id)
);

-- 2. Tabla de Recetas Dentales
CREATE TABLE IF NOT EXISTS dental_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    medications JSONB DEFAULT '[]'::jsonb, -- Array de {name, dosage, frequency, duration, instructions}
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Boxes / Sillones
CREATE TABLE IF NOT EXISTS dental_boxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de Sesiones en Box (Tablero de Sillones)
CREATE TABLE IF NOT EXISTS dental_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    box_id UUID REFERENCES public.dental_boxes(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'waiting', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla de Prestaciones / Procedimientos Dentales
CREATE TABLE IF NOT EXISTS dental_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- Ej: 'Preventiva', 'Restauradora', 'Cirugía'
    name TEXT NOT NULL,
    price DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- precarga de prestaciones estándar
INSERT INTO dental_procedures (category, name, price) VALUES
('Preventiva', 'Limpieza Dental (Profilaxis)', 35000),
('Preventiva', 'Aplicación de Flúor', 25000),
('Restauradora', 'Resina Simple', 45000),
('Restauradora', 'Resina Compleja', 65000),
('Cirugía', 'Extracción Simple', 55000),
('Cirugía', 'Extracción Molar del Juicio', 120000),
('Endodoncia', 'Endodoncia Unirradicular', 150000),
('Rehabilitación', 'Corona Porcelana', 450000)
ON CONFLICT DO NOTHING;

-- 6. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_odontograms_patient ON dental_odontograms(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON dental_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON dental_sessions(clinic_id, status) WHERE status = 'active';

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE dental_odontograms ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_sessions ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Seguridad (Ejemplo: Acceso por clinic_id)
-- Nota: Ajustar según las políticas de la aplicación.
CREATE POLICY "Clinics can manage their own odontograms" ON dental_odontograms
    FOR ALL USING (clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Clinics can manage their own prescriptions" ON dental_prescriptions
    FOR ALL USING (clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Clinics can manage their own boxes" ON dental_boxes
    FOR ALL USING (clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Clinics can manage their own sessions" ON dental_sessions
    FOR ALL USING (clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));
