-- Migration: Loyalty & Referral System (Aesthetic / Medical Focus)
-- Date: 2026-03-23

-- 1. Add loyalty columns to patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.patients(id),
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- 2. Create loyalty_transactions table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjustment', 'referral_bonus')),
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. Add loyalty settings to clinic_settings
ALTER TABLE public.clinic_settings
ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS loyalty_points_percentage NUMERIC DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS loyalty_referral_bonus INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS loyalty_welcome_bonus INTEGER DEFAULT 200;

-- 4. Enable RLS for loyalty_transactions
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for transactions
DO $$ BEGIN
    CREATE POLICY "Clinic members can read loyalty_transactions"
      ON public.loyalty_transactions FOR SELECT
      USING (clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid() AND status = 'active'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Clinic members can manage loyalty_transactions"
      ON public.loyalty_transactions FOR ALL
      USING (clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Helper function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code() RETURNS TRIGGER AS $$
DECLARE
  v_new_code TEXT;
  v_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      v_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
      SELECT EXISTS (SELECT 1 FROM public.patients WHERE referral_code = v_new_code) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;
    NEW.referral_code := v_new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for referral code
DROP TRIGGER IF EXISTS trigger_generate_referral_code ON public.patients;
CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- 6. Function to handle referral bonus
CREATE OR REPLACE FUNCTION public.handle_referral_bonus() RETURNS TRIGGER AS $$
DECLARE
  v_referral_bonus INTEGER;
  v_referrer_id UUID;
BEGIN
  -- We assume that when a patient is created with referred_by, they get a welcome bonus
  -- and the referrer gets a referral bonus.
  
  -- Get clinic settings
  SELECT loyalty_referral_bonus INTO v_referral_bonus
  FROM public.clinic_settings WHERE id = NEW.clinic_id;
  
  IF NEW.referred_by IS NOT NULL THEN
    -- 1. Give bonus to referrer
    INSERT INTO public.loyalty_transactions (clinic_id, patient_id, type, points, description)
    VALUES (NEW.clinic_id, NEW.referred_by, 'referral_bonus', v_referral_bonus, 'Bono por referir a ' || COALESCE(NEW.name, 'un amigo'));
    
    -- Update referrer points
    UPDATE public.patients 
    SET loyalty_points = loyalty_points + v_referral_bonus,
        referral_count = referral_count + 1
    WHERE id = NEW.referred_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_referral_bonus ON public.patients;
CREATE TRIGGER trigger_referral_bonus
AFTER INSERT ON public.patients
FOR EACH ROW
WHEN (NEW.referred_by IS NOT NULL)
EXECUTE FUNCTION public.handle_referral_bonus();
