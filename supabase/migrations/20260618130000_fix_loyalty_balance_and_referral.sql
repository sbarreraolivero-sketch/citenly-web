-- Migration: Corregir doble conteo de saldo y acreditar bonos de referido
-- Date: 2026-06-18
--
-- Problema 1 (doble conteo): existían DOS triggers AFTER INSERT en loyalty_transactions
-- (trg_loyalty_balance_sync -> sync_loyalty_balance y trg_sync_loyalty_log_to_patient ->
-- sync_patient_loyalty_points), ambos hacían el mismo UPDATE loyalty_points += NEW.points.
-- Cada movimiento se aplicaba dos veces: +500 subía 1000, -500 bajaba 1000. Esa es la
-- inconsistencia al agregar/quitar saldo.
--
-- Problema 2 (referidos sin acreditar): en producción no había ningún trigger que otorgara
-- el bono al referente, el bono de bienvenida al referido, ni incrementara referral_count.
-- resolve_referral_by_code solo enlazaba referred_by, sin premiar.

-- ───────────────────────────────────────────────
-- 1. Eliminar el trigger duplicado de sincronización (dejar uno solo)
-- ───────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_loyalty_balance_sync ON public.loyalty_transactions;
-- Conservamos trg_sync_loyalty_log_to_patient (sync_patient_loyalty_points, usa COALESCE).

-- ───────────────────────────────────────────────
-- 2. Acreditar bonos cuando se establece referred_by (INSERT o UPDATE)
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_referral_bonus() RETURNS TRIGGER AS $$
DECLARE
  v_referral_bonus INTEGER := 0;
  v_welcome_bonus  INTEGER := 0;
BEGIN
  -- Solo cuando referred_by pasa de NULL a un valor y no es autorreferencia
  IF NEW.referred_by IS NULL OR NEW.referred_by = NEW.id THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.referred_by IS NOT DISTINCT FROM NEW.referred_by THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(loyalty_referral_bonus, 0), COALESCE(loyalty_welcome_bonus, 0)
    INTO v_referral_bonus, v_welcome_bonus
  FROM public.clinic_settings
  WHERE id = NEW.clinic_id;

  -- Bono al referente (la transacción dispara el sync del saldo)
  IF v_referral_bonus > 0 THEN
    INSERT INTO public.loyalty_transactions (clinic_id, patient_id, type, points, description)
    VALUES (NEW.clinic_id, NEW.referred_by, 'bonus', v_referral_bonus,
            'Bono por referir a ' || COALESCE(NEW.name, 'un nuevo cliente'));
  END IF;

  -- Incrementar el contador de referidos del referente (no toca referred_by → no re-dispara)
  UPDATE public.patients
  SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE id = NEW.referred_by;

  -- Bono de bienvenida al referido
  IF v_welcome_bonus > 0 THEN
    INSERT INTO public.loyalty_transactions (clinic_id, patient_id, type, points, description)
    VALUES (NEW.clinic_id, NEW.id, 'bonus', v_welcome_bonus,
            'Bono de bienvenida por invitación');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_award_referral_bonus_ins ON public.patients;
CREATE TRIGGER trg_award_referral_bonus_ins
AFTER INSERT ON public.patients
FOR EACH ROW
WHEN (NEW.referred_by IS NOT NULL)
EXECUTE FUNCTION public.award_referral_bonus();

DROP TRIGGER IF EXISTS trg_award_referral_bonus_upd ON public.patients;
CREATE TRIGGER trg_award_referral_bonus_upd
AFTER UPDATE OF referred_by ON public.patients
FOR EACH ROW
WHEN (OLD.referred_by IS NULL AND NEW.referred_by IS NOT NULL)
EXECUTE FUNCTION public.award_referral_bonus();
