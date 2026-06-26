-- Landing personal de referido (/r/:code): datos públicos del código (referente + clínica)
-- vía SECURITY DEFINER para esquivar RLS de patients. Devuelve solo lo necesario.
CREATE OR REPLACE FUNCTION public.get_referral_link_data(p_code text)
RETURNS TABLE(referrer_name text, clinic_name text, clinic_phone text, referral_bonus int, points_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.name, cs.clinic_name, cs.ycloud_phone_number,
         COALESCE(cs.loyalty_referral_bonus, 0)::int,
         COALESCE(cs.loyalty_points_name, 'puntos')
  FROM patients p
  JOIN clinic_settings cs ON cs.id = p.clinic_id
  WHERE p.referral_code = UPPER(p_code)
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_referral_link_data(text) TO anon, authenticated;
