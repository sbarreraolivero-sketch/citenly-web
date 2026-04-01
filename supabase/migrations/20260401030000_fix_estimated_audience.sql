-- =============================================
-- Migration: Fix Estimated Audience Logic
-- Purpose: Makes get_estimated_audience call get_campaign_audience_contacts directly
-- This ensures the estimated audience in the UI matches the actual sending audience exactly.
-- =============================================

CREATE OR REPLACE FUNCTION get_estimated_audience(
    p_clinic_id UUID,
    p_inclusion_tags TEXT[],
    p_exclusion_tags TEXT[]
)
RETURNS BIGINT AS $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM get_campaign_audience_contacts(p_clinic_id, p_inclusion_tags, p_exclusion_tags);
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
