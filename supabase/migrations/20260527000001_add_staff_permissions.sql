-- Add staff_permissions column to clinic_settings
-- Controls which nav sections are visible to professionals and receptionists
-- Owners and admins always have full access regardless of this setting

ALTER TABLE clinic_settings
ADD COLUMN IF NOT EXISTS staff_permissions JSONB DEFAULT '{"professional":["dashboard","messages","templates","patients","appointments"],"receptionist":["dashboard","messages","appointments","patients"]}';
