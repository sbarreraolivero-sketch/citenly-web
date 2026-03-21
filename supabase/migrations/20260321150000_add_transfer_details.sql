-- Add transfer_details column to clinic_settings table
ALTER TABLE clinic_settings 
ADD COLUMN IF NOT EXISTS transfer_details TEXT;

-- Add comment for clarity
COMMENT ON COLUMN clinic_settings.transfer_details IS 'Detailed bank transfer info for clinic payments/deposits';
