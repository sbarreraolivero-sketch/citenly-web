
-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create clinic_blocked_dates table
CREATE TABLE IF NOT EXISTS public.clinic_blocked_dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate blocks for the same day
-- We use a DO block for this too to avoid errors if it already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_clinic_date') THEN
        ALTER TABLE public.clinic_blocked_dates 
        ADD CONSTRAINT unique_clinic_date UNIQUE (clinic_id, blocked_date);
    END IF;
END
$$;

-- Enable RLS
ALTER TABLE public.clinic_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming clinic_id matches the user's clinic)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clinic_blocked_dates' AND policyname = 'Enable all access for clinic members'
    ) THEN
        CREATE POLICY "Enable all access for clinic members" ON public.clinic_blocked_dates
            FOR ALL
            USING (clinic_id IN (
                SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid()
            ))
            WITH CHECK (clinic_id IN (
                SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid()
            ));
    END IF;
END
$$;

-- Create trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clinic_blocked_dates_updated_at') THEN
        CREATE TRIGGER update_clinic_blocked_dates_updated_at
            BEFORE UPDATE ON public.clinic_blocked_dates
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;
