-- Página "Mi cuenta" (/mi/:code): saldo de puntos + recompensas + datos de referido de la clienta.
-- SECURITY DEFINER para esquivar RLS; puntos clampeados a 0 (un saldo no puede ser negativo).
CREATE OR REPLACE FUNCTION public.get_my_account_data(p_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p patients; v_c clinic_settings; v_rewards json;
BEGIN
  SELECT * INTO v_p FROM patients WHERE referral_code = UPPER(p_code) LIMIT 1;
  IF v_p.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_c FROM clinic_settings WHERE id = v_p.clinic_id;
  SELECT json_agg(json_build_object('name', name, 'cost', points_cost) ORDER BY points_cost) INTO v_rewards
    FROM loyalty_rewards WHERE clinic_id = v_p.clinic_id AND is_active = true;
  RETURN json_build_object(
    'name', v_p.name,
    'points', GREATEST(0, COALESCE(v_p.loyalty_points,0)),
    'points_name', COALESCE(v_c.loyalty_points_name,'puntos'),
    'currency_symbol', COALESCE(v_c.loyalty_currency_symbol,''),
    'clinic_name', v_c.clinic_name,
    'clinic_phone', v_c.ycloud_phone_number,
    'referral_code', v_p.referral_code,
    'referral_count', COALESCE(v_p.referral_count,0),
    'referral_bonus', COALESCE(v_c.loyalty_referral_bonus,0),
    'rewards', COALESCE(v_rewards,'[]'::json)
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_account_data(text) TO anon, authenticated;
