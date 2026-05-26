-- Demo requests table — for public /demo page (Citenly)
CREATE TABLE IF NOT EXISTS demo_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    clinic_name     text NOT NULL,
    phone           text NOT NULL,
    email           text NOT NULL,
    clinic_type     text,
    needs           text,
    role            text,
    scheduled_at    timestamptz,
    status          text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    -- CRM fields (used by HQ AdminCRM)
    crm_stage       text DEFAULT 'nuevo'
                        CHECK (crm_stage IN ('nuevo', 'contactado', 'demo_agendada', 'prueba_iniciada', 'convertido', 'perdido')),
    crm_notes       text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Only HQ (service role) can read/write — no RLS needed since it's admin-only data
-- But enable RLS and add a policy for safety
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Supabase default)
-- No public read/write — only service role (Edge Functions, HQ) can access

CREATE INDEX IF NOT EXISTS idx_demo_requests_status       ON demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_scheduled_at ON demo_requests(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_demo_requests_crm_stage    ON demo_requests(crm_stage);
