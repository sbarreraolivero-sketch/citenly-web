-- =============================================
-- Automated "Cliente" Tag Synchronization
-- Syncs 'Cliente [Service]' and 'Cliente Frecuente' tags based on appointment history
-- =============================================

-- Function to ensure a tag exists and return its ID
CREATE OR REPLACE FUNCTION public.get_or_create_tag(
    p_clinic_id UUID,
    p_tag_name TEXT,
    p_color TEXT DEFAULT '#10B981'
) RETURNS UUID AS $$
DECLARE
    v_tag_id UUID;
BEGIN
    SELECT id INTO v_tag_id FROM public.tags 
    WHERE clinic_id = p_clinic_id AND name = p_tag_name 
    LIMIT 1;

    IF v_tag_id IS NULL THEN
        INSERT INTO public.tags (clinic_id, name, color)
        VALUES (p_clinic_id, p_tag_name, p_color)
        RETURNING id INTO v_tag_id;
    END IF;

    RETURN v_tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main sync function
CREATE OR REPLACE FUNCTION public.sync_patient_cliente_tags()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_id UUID;
    v_clinic_id UUID;
    v_service_name TEXT;
    v_tag_name TEXT;
    v_tag_id UUID;
    v_appt_count INT;
BEGIN
    -- Only proceed for confirmed or completed appointments
    IF (NEW.status IN ('confirmed', 'completed')) THEN
        v_patient_id := NEW.patient_id;
        v_clinic_id := NEW.clinic_id;

        IF v_patient_id IS NOT NULL THEN
            -- 1. Get Service Name
            SELECT name INTO v_service_name 
            FROM public.services 
            WHERE id = NEW.service_id;

            -- 2. Map Service to Tag Name
            -- Normalize service name to tag name (e.g., "Microblading de cejas" -> "Cliente Microblading")
            IF v_service_name ILIKE '%Microblading%' THEN
                v_tag_name := 'Cliente Microblading';
            ELSIF v_service_name ILIKE '%labios%' THEN
                v_tag_name := 'Cliente Labios';
            ELSIF v_service_name ILIKE '%Ojos%' THEN
                v_tag_name := 'Cliente Ojos';
            ELSE
                v_tag_name := 'Cliente ' || split_part(v_service_name, ' ', 1);
            END IF;

            -- 3. Ensure Tag Exists and Link it
            IF v_tag_name IS NOT NULL THEN
                v_tag_id := public.get_or_create_tag(v_clinic_id, v_tag_name, '#10B981');
                
                -- Link tag if not already linked
                INSERT INTO public.patient_tags (patient_id, tag_id)
                VALUES (v_patient_id, v_tag_id)
                ON CONFLICT DO NOTHING;
            END IF;

            -- 4. Check for "Cliente Frecuente" (> 2 appointments)
            SELECT COUNT(*) INTO v_appt_count 
            FROM public.appointments 
            WHERE patient_id = v_patient_id 
            AND status IN ('confirmed', 'completed');

            IF v_appt_count >= 2 THEN
                v_tag_id := public.get_or_create_tag(v_clinic_id, 'Cliente Frecuente', '#10B981');
                INSERT INTO public.patient_tags (patient_id, tag_id)
                VALUES (v_patient_id, v_tag_id)
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger
DROP TRIGGER IF EXISTS trigger_sync_cliente_tags ON public.appointments;
CREATE TRIGGER trigger_sync_cliente_tags
AFTER INSERT OR UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.sync_patient_cliente_tags();

-- Initial backfill for existing appointments
-- This will tag all current confirmed/completed patients
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT DISTINCT patient_id, clinic_id, service_id, status 
        FROM public.appointments 
        WHERE status IN ('confirmed', 'completed') AND patient_id IS NOT NULL
    LOOP
        -- Simple way to trigger the logic for existing ones
        -- (Manually calling the logic or just inserting into patient_tags)
        -- We'll just perform a manual insert for the backfill to be safe
        PERFORM public.sync_patient_cliente_tags_manual(r.patient_id, r.clinic_id, r.service_id);
    END LOOP;
END;
$$;

-- Helper for manual backfill
CREATE OR REPLACE FUNCTION public.sync_patient_cliente_tags_manual(
    p_patient_id UUID,
    p_clinic_id UUID,
    p_service_id UUID
) RETURNS VOID AS $$
DECLARE
    v_service_name TEXT;
    v_tag_name TEXT;
    v_tag_id UUID;
    v_appt_count INT;
BEGIN
    SELECT name INTO v_service_name FROM public.services WHERE id = p_service_id;
    
    IF v_service_name ILIKE '%Microblading%' THEN v_tag_name := 'Cliente Microblading';
    ELSIF v_service_name ILIKE '%labios%' THEN v_tag_name := 'Cliente Labios';
    ELSIF v_service_name ILIKE '%Ojos%' THEN v_tag_name := 'Cliente Ojos';
    ELSE v_tag_name := 'Cliente ' || split_part(v_service_name, ' ', 1);
    END IF;

    IF v_tag_name IS NOT NULL THEN
        v_tag_id := public.get_or_create_tag(p_clinic_id, v_tag_name, '#10B981');
        INSERT INTO public.patient_tags (patient_id, tag_id) VALUES (p_patient_id, v_tag_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT COUNT(*) INTO v_appt_count FROM public.appointments WHERE patient_id = p_patient_id AND status IN ('confirmed', 'completed');
    IF v_appt_count >= 2 THEN
        v_tag_id := public.get_or_create_tag(p_clinic_id, 'Cliente Frecuente', '#10B981');
        INSERT INTO public.patient_tags (patient_id, tag_id) VALUES (p_patient_id, v_tag_id) ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
