-- Create campaign_deliveries table to track which contacts received a campaign
CREATE TABLE IF NOT EXISTS public.campaign_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_name TEXT,
    contact_phone TEXT NOT NULL,
    status TEXT DEFAULT 'sent', -- 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_deliveries ENABLE ROW LEVEL SECURITY;

-- Create policy for clinic-level access
CREATE POLICY "Clinics can manage their own deliveries" 
    ON public.campaign_deliveries
    FOR ALL
    USING (clinic_id IN (
        SELECT clinic_id FROM profile WHERE id = auth.uid()
    ))
    WITH CHECK (clinic_id IN (
        SELECT clinic_id FROM profile WHERE id = auth.uid()
    ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_campaign_id ON public.campaign_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_clinic_id ON public.campaign_deliveries(clinic_id);
