-- =============================================
-- Migration: Fix Audience Calculation Crash (MIN uuid error)
-- Purpose: Resolves 'function min(uuid) does not exist' by casting to text. 
-- =============================================

CREATE OR REPLACE FUNCTION get_campaign_audience_contacts(
    p_clinic_id UUID,
    p_inclusion_tags TEXT[],
    p_exclusion_tags TEXT[]
)
RETURNS TABLE (
    id UUID,
    contact_full_name TEXT,
    phone_number TEXT
) AS $$
DECLARE
    incl_cleaned TEXT[];
    excl_cleaned TEXT[];
BEGIN
    -- Limpieza de inputs
    incl_cleaned := COALESCE((SELECT array_agg(TRIM(LOWER(t))) FROM unnest(p_inclusion_tags) t), '{}'::text[]);
    excl_cleaned := COALESCE((SELECT array_agg(TRIM(LOWER(t))) FROM unnest(p_exclusion_tags) t), '{}'::text[]);

    RETURN QUERY
    WITH all_data AS (
        -- Prospectos
        SELECT 
            p.id as cid,
            p.name as cname,
            regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') as clean_phone,
            LOWER(TRIM(t.name)) as tag
        FROM crm_prospects p
        LEFT JOIN crm_prospect_tags cpt ON p.id = cpt.prospect_id
        LEFT JOIN crm_tags t ON cpt.tag_id = t.id
        WHERE p.clinic_id = p_clinic_id
        UNION ALL
        -- Pacientes
        SELECT 
            pa.id as cid,
            pa.name as cname,
            regexp_replace(COALESCE(pa.phone_number, ''), '\D', '', 'g') as clean_phone,
            LOWER(TRIM(t.name)) as tag
        FROM patients pa
        LEFT JOIN patient_tags pt ON pa.id = pt.patient_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE pa.clinic_id = p_clinic_id
    ),
    grouped_contacts AS (
        SELECT 
            (array_agg(cid))[1] as final_id,
            (array_agg(cname))[1] as final_name,
            clean_phone,
            array_agg(tag) FILTER (WHERE tag IS NOT NULL) as all_tags
        FROM all_data
        WHERE clean_phone != ''
        GROUP BY clean_phone
    )
    SELECT 
        gc.final_id as id,
        gc.final_name::text as contact_full_name,
        gc.clean_phone::text as phone_number
    FROM grouped_contacts gc
    WHERE 
        -- Inclusión (debe tener al menos UNA)
        (
            CARDINALITY(incl_cleaned) = 0 OR
            gc.all_tags && incl_cleaned
        )
        AND
        -- Exclusión (NO debe tener NINGUNA)
        NOT (
            CARDINALITY(excl_cleaned) > 0 AND
            gc.all_tags && excl_cleaned
        )
        AND gc.clean_phone IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
