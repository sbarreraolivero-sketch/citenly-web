
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
    -- Normalizar tags (si son NULL, convertirlos en arrays vacíos)
    v_inc_tags_lower := COALESCE((SELECT array_agg(TRIM(LOWER(t))) FROM unnest(p_inclusion_tags) t), '{}'::text[]);
    v_exc_tags_lower := COALESCE((SELECT array_agg(TRIM(LOWER(t))) FROM unnest(p_exclusion_tags) t), '{}'::text[]);

    RETURN QUERY
    WITH contact_base AS (
        -- Prospectos
        SELECT 
            pr.id, pr.full_name, 
            regexp_replace(COALESCE(pr.phone, ''), '\D', '', 'g') as phone,
            COALESCE((SELECT array_agg(TRIM(LOWER(t.name))) FROM crm_prospect_tags cpt JOIN crm_tags t ON cpt.tag_id = t.id WHERE cpt.prospect_id = pr.id), '{}'::text[]) as tags
        FROM crm_prospects pr WHERE pr.clinic_id = p_clinic_id
        
        UNION ALL
        
        -- Pacientes
        SELECT 
            p.id, p.full_name, 
            regexp_replace(COALESCE(p.phone_number, ''), '\D', '', 'g') as phone,
            COALESCE((SELECT array_agg(TRIM(LOWER(t.name))) FROM patient_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.patient_id = p.id), '{}'::text[]) as tags
        FROM patients p WHERE p.clinic_id = p_clinic_id
    )
    SELECT DISTINCT ON (phone) id, cb.full_name::text, cb.phone::text
    FROM contact_base cb
    WHERE 
        -- Filtro Inclusión
        (ARRAY_LENGTH(v_inc_tags_lower, 1) IS NULL OR cb.tags && v_inc_tags_lower)
        AND
        -- Filtro Exclusión
        (ARRAY_LENGTH(v_exc_tags_lower, 1) IS NULL OR NOT (cb.tags && v_exc_tags_lower))
        AND cb.phone != '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
