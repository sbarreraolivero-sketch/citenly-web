-- =============================================
-- Migration: Sync Campaign Audience Contacts with Estimated Audience Logic
-- Resolves discrepancy between estimated audience and actual sent contacts
-- =============================================

CREATE OR REPLACE FUNCTION get_campaign_audience_contacts(
    p_clinic_id UUID,
    p_inclusion_tags TEXT[],
    p_exclusion_tags TEXT[]
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    phone_number TEXT
) AS $$
DECLARE
    v_inc_tags_lower TEXT[];
    v_exc_tags_lower TEXT[];
BEGIN
    -- Normalizar tags a minúsculas y sin espacios extras
    v_inc_tags_lower := COALESCE((SELECT array_agg(TRIM(LOWER(t))) FROM unnest(p_inclusion_tags) t), '{}'::text[]);
    v_exc_tags_lower := COALESCE((SELECT array_agg(TRIM(LOWER(t))) FROM unnest(p_exclusion_tags) t), '{}'::text[]);

    RETURN QUERY
    WITH unified_tagged_contacts AS (
        -- Pacientes (Prioridad 1)
        SELECT 
            p.id, 
            p.full_name, 
            regexp_replace(COALESCE(p.phone_number, ''), '\D', '', 'g') as temp_phone,
            COALESCE((SELECT array_agg(TRIM(LOWER(t.name))) 
                      FROM patient_tags pt 
                      JOIN tags t ON pt.tag_id = t.id 
                      WHERE pt.patient_id = p.id), '{}'::text[]) as tags
        FROM patients p 
        WHERE p.clinic_id = p_clinic_id
        
        UNION ALL
        
        -- Prospectos (Sólo si NO existe como paciente basado en el número de teléfono)
        SELECT 
            pr.id, 
            pr.full_name, 
            regexp_replace(COALESCE(pr.phone, ''), '\D', '', 'g') as temp_phone,
            COALESCE((SELECT array_agg(TRIM(LOWER(t.name))) 
                      FROM crm_prospect_tags cpt 
                      JOIN crm_tags t ON cpt.tag_id = t.id 
                      WHERE cpt.prospect_id = pr.id), '{}'::text[]) as tags
        FROM crm_prospects pr 
        WHERE pr.clinic_id = p_clinic_id
        AND pr.phone IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM patients p2 
            WHERE p2.clinic_id = p_clinic_id 
            AND p2.phone_number IS NOT NULL
            AND regexp_replace(COALESCE(p2.phone_number, ''), '\D', '', 'g') = regexp_replace(COALESCE(pr.phone, ''), '\D', '', 'g')
        )
    )
    SELECT utc.id, utc.full_name::text, utc.temp_phone::text
    FROM unified_tagged_contacts utc
    WHERE 
        utc.temp_phone != ''
        AND
        -- Filtro Inclusión
        (ARRAY_LENGTH(v_inc_tags_lower, 1) IS NULL OR utc.tags && v_inc_tags_lower)
        AND
        -- Filtro Exclusión
        (ARRAY_LENGTH(v_exc_tags_lower, 1) IS NULL OR NOT (utc.tags && v_exc_tags_lower));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
