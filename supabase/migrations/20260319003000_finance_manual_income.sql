-- Manual Income Management
-- 1. Create Incomes Table
CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES public.clinic_settings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('service', 'product', 'adjustment', 'other')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS for Incomes
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage incomes"
  ON public.incomes FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access to incomes"
  ON public.incomes FOR ALL
  USING (auth.role() = 'service_role');

-- 3. Create Income RPC
CREATE OR REPLACE FUNCTION public.create_clinic_income(
  p_clinic_id UUID,
  p_description TEXT,
  p_amount NUMERIC,
  p_category TEXT,
  p_date TEXT
)
RETURNS SETOF public.incomes AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = auth.uid()
      AND clinic_id = p_clinic_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  RETURN QUERY
  INSERT INTO public.incomes (clinic_id, description, amount, category, date)
  VALUES (p_clinic_id, p_description, p_amount, p_category, p_date::DATE)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get Incomes RPC
CREATE OR REPLACE FUNCTION public.get_clinic_incomes_secure(
  p_clinic_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS SETOF public.incomes AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = auth.uid()
      AND clinic_id = p_clinic_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.incomes
  WHERE clinic_id = p_clinic_id
    AND date >= p_start_date::DATE
    AND date <= p_end_date::DATE
  ORDER BY date DESC, created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update Finance Stats RPC (Including Manual Incomes)
CREATE OR REPLACE FUNCTION public.get_finance_stats(
  p_clinic_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_profit NUMERIC,
  pending_payments NUMERIC,
  appointments_count INTEGER
) AS $$
DECLARE
  v_appointment_income NUMERIC;
  v_manual_income NUMERIC;
  v_expenses NUMERIC;
  v_pending NUMERIC;
  v_count INTEGER;
BEGIN
  -- Calculate Income from Appointments (Paid or Partial)
  SELECT COALESCE(SUM(price), 0), COUNT(*)
  INTO v_appointment_income, v_count
  FROM public.appointments
  WHERE clinic_id = p_clinic_id
    AND appointment_date >= p_start_date
    AND appointment_date <= p_end_date
    AND payment_status IN ('paid', 'partial');

  -- Calculate Manual Incomes
  SELECT COALESCE(SUM(amount), 0)
  INTO v_manual_income
  FROM public.incomes
  WHERE clinic_id = p_clinic_id
    AND date >= p_start_date::DATE
    AND date <= p_end_date::DATE;

  -- Calculate Expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO v_expenses
  FROM public.expenses
  WHERE clinic_id = p_clinic_id
    AND date >= p_start_date::DATE
    AND date <= p_end_date::DATE;

  -- Calculate Pending
  SELECT COALESCE(SUM(price), 0)
  INTO v_pending
  FROM public.appointments
  WHERE clinic_id = p_clinic_id
    AND appointment_date >= p_start_date
    AND appointment_date <= p_end_date
    AND payment_status = 'pending';

  RETURN QUERY SELECT 
    (v_appointment_income + v_manual_income), 
    v_expenses, 
    ((v_appointment_income + v_manual_income) - v_expenses), 
    v_pending,
    v_count;
END;
$$ LANGUAGE plpgsql;
