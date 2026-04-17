-- Add specialty to clinic_settings
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT 'aesthetic' CHECK (specialty IN ('aesthetic', 'dental', 'general'));

-- Create dental_odontograms
CREATE TABLE IF NOT EXISTS dental_odontograms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinic_settings(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(clinic_id, patient_id)
);

-- Create dental_budgets
CREATE TABLE IF NOT EXISTS dental_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinic_settings(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create dental_budget_items
CREATE TABLE IF NOT EXISTS dental_budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID REFERENCES dental_budgets(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    tooth_number INTEGER, -- Optional, for dental context
    surface TEXT, -- "V", "D", "O", "M", "P"
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE dental_odontograms ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_budget_items ENABLE ROW LEVEL SECURITY;

-- Odontograms policies
CREATE POLICY "Users can view their clinic's odontograms" ON dental_odontograms
    FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their clinic's odontograms" ON dental_odontograms
    FOR ALL USING (clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

-- Budgets policies
CREATE POLICY "Users can view their clinic's budgets" ON dental_budgets
    FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their clinic's budgets" ON dental_budgets
    FOR ALL USING (clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid()));

-- Budget items policies
CREATE POLICY "Users can view their clinic's budget items" ON dental_budget_items
    FOR SELECT USING (budget_id IN (SELECT id FROM dental_budgets WHERE clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())));

CREATE POLICY "Users can manage their clinic's budget items" ON dental_budget_items
    FOR ALL USING (budget_id IN (SELECT id FROM dental_budgets WHERE clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())));
