-- Adds per-clinic YCloud webhook secret for HMAC signature verification.
-- The secret is the full whsec_... string from the YCloud dashboard, stored as-is.
-- When null, the webhook accepts messages without verification (permissive onboarding).
ALTER TABLE clinic_settings
    ADD COLUMN IF NOT EXISTS ycloud_webhook_secret TEXT;
