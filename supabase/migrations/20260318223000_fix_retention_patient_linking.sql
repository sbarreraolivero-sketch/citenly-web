-- =============================================================
-- MIGRATION: Fix Patient-Appointment Linking & Retention Data
-- =============================================================

-- 1. Redefine create_patient_on_appointment_completed with correct linkage logic
CREATE OR REPLACE FUNCTION public.create_patient_on_appointment_completed()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_patient_id UUID;
BEGIN
  -- Trigger when an appointment Transitions to 'completed' OR 'confirmed'
  -- OR when it is INSERTED already as 'completed' OR 'confirmed'
  IF NEW.status IN ('completed', 'confirmed') 
     AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status NOT IN ('completed', 'confirmed')) THEN
    
    -- 1. Step: Try to match by phone if patient_id is not provided
    IF NEW.patient_id IS NULL THEN
        SELECT id INTO v_patient_id
        FROM public.patients
        WHERE phone_number = NEW.phone_number
          AND clinic_id = NEW.clinic_id
        LIMIT 1;
    ELSE
        v_patient_id := NEW.patient_id;
    END IF;

    -- 2. Step: If still no patient found, insert new patient
    IF v_patient_id IS NULL THEN
        INSERT INTO public.patients (clinic_id, phone_number, name)
        VALUES (NEW.clinic_id, NEW.phone_number, NEW.patient_name)
        ON CONFLICT (clinic_id, phone_number) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_patient_id;
    END IF;

    -- 3. CRITICAL FIX: Always link the found or created patient ID to the appointment
    NEW.patient_id := v_patient_id;

    -- 4. Step: Update service interest
    IF v_patient_id IS NOT NULL AND NEW.service IS NOT NULL THEN
        UPDATE public.patients
        SET service_interest = CASE 
            WHEN service_interest IS NULL OR btrim(service_interest) = '' OR service_interest ILIKE '%No especificado%'
            THEN NEW.service 
            WHEN service_interest NOT ILIKE '%' || NEW.service || '%' 
            THEN service_interest || ', ' || NEW.service
            ELSE service_interest
        END
        WHERE id = v_patient_id;
    END IF;

    -- 5. Step: Auto-mark as paid if completed
    IF NEW.status = 'completed' AND NEW.payment_status = 'pending' THEN
        NEW.payment_status := 'paid';
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Ensure trigger runs on both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_create_patient_on_completed ON public.appointments;
CREATE TRIGGER trg_create_patient_on_completed
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_patient_on_appointment_completed();

-- 3. RETROACTIVE FIX: Link all orphan appointments to existing patients
UPDATE public.appointments a
SET patient_id = p.id
FROM public.patients p
WHERE a.patient_id IS NULL
  AND a.clinic_id = p.clinic_id
  AND a.phone_number = p.phone_number;

-- 4. LOG: Record this fix
INSERT INTO public.ai_action_log (
    clinic_id, 
    action_type, 
    action_details, 
    status, 
    result
) 
SELECT 
    id, 
    'retention_fix', 
    '{"reason": "retroactive_linkage", "timestamp": "2026-03-18T22:30:00"}'::jsonb,
    'executed',
    'Linked existing appointments and fixed trigger for future'
FROM public.clinic_settings;
