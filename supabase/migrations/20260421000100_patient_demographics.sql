-- Migration to add legal identification and demographic data to patients
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS rut TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS insurance_provider TEXT, -- "Convenio"
ADD COLUMN IF NOT EXISTS internal_id TEXT; -- "Número interno"

-- Refresh types or add comments for documentation
COMMENT ON COLUMN patients.rut IS 'National ID / Tax ID of the patient';
COMMENT ON COLUMN patients.insurance_provider IS 'Medical insurance or agreement name';
