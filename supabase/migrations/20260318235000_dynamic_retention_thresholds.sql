-- 1. AÑADIR COLUMNAS DE CONFIGURACIÓN A LA CLÍNICA
ALTER TABLE public.clinic_settings 
ADD COLUMN IF NOT EXISTS retention_medium_delay INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS retention_high_delay INTEGER DEFAULT 45;

-- 2. ACTUALIZAR EL RPC DE CONFIGURACIÓN PARA SOPORTAR LOS NUEVOS DÍAS
CREATE OR REPLACE FUNCTION public.update_retention_config(
  p_clinic_id UUID,
  p_autonomous_mode BOOLEAN,
  p_medium_template TEXT,
  p_high_template TEXT,
  p_medium_delay INTEGER,
  p_high_delay INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mode TEXT;
BEGIN
  v_mode := CASE WHEN p_autonomous_mode THEN 'autonomous' ELSE 'supervised' END;

  -- Actualizar umbrales en la tabla de clínica
  UPDATE public.clinic_settings
  SET 
    retention_medium_delay = p_medium_delay,
    retention_high_delay = p_high_delay
  WHERE id = p_clinic_id;

  -- Actualizar protocolos
  UPDATE public.retention_protocols SET execution_mode = v_mode, actions = jsonb_set(actions, '{template_name}', to_jsonb(p_medium_template))
  WHERE clinic_id = p_clinic_id AND risk_level_trigger = 'medium';

  UPDATE public.retention_protocols SET execution_mode = v_mode, actions = jsonb_set(actions, '{template_name}', to_jsonb(p_high_template))
  WHERE clinic_id = p_clinic_id AND risk_level_trigger = 'high';

  RETURN FOUND;
END;
$$;

-- 3. ACTUALIZAR EL MOTOR DE CÁLCULO PARA USAR LOS DÍAS PERSONALIZADOS
CREATE OR REPLACE FUNCTION public.calculate_patient_retention_score(
  p_clinic_id UUID,
  p_patient_id UUID
)
RETURNS TABLE (
  score INTEGER, risk_level TEXT, days_since_last_visit INTEGER,
  expected_return_days INTEGER, delay_days INTEGER, avg_ticket NUMERIC,
  total_visits INTEGER, cancellation_count INTEGER, no_show_count INTEGER,
  is_vip BOOLEAN, frequency_irregular BOOLEAN, high_ticket BOOLEAN,
  last_service TEXT, last_visit_date DATE, assigned_professional TEXT
) AS $$
DECLARE
  v_last_visit DATE; v_last_service TEXT; v_last_professional TEXT;
  v_days_since INTEGER; v_erw INTEGER; v_delay INTEGER;
  v_total_visits INTEGER; v_cancellations INTEGER; v_no_shows INTEGER;
  v_avg_ticket NUMERIC; v_clinic_avg_ticket NUMERIC;
  v_score_base NUMERIC; v_final_score INTEGER;
  v_is_vip BOOLEAN; v_irregular BOOLEAN; v_high_ticket BOOLEAN;
  v_risk TEXT;
  v_medium_thresh INTEGER; v_high_thresh INTEGER;
BEGIN
  -- Cargar umbrales personalizados de la clínica
  SELECT retention_medium_delay, retention_high_delay INTO v_medium_thresh, v_high_thresh
  FROM public.clinic_settings WHERE id = p_clinic_id;
  
  -- Valores por defecto si no existen
  v_medium_thresh := COALESCE(v_medium_thresh, 15);
  v_high_thresh := COALESCE(v_high_thresh, 45);

  -- Obtener última visita
  SELECT a.appointment_date::DATE, a.service, a.notes INTO v_last_visit, v_last_service, v_last_professional
  FROM public.appointments a WHERE a.patient_id = p_patient_id AND a.clinic_id = p_clinic_id AND a.status IN ('completed', 'confirmed')
  ORDER BY a.appointment_date DESC LIMIT 1;

  IF v_last_visit IS NULL THEN
    score := 0; risk_level := 'low'; days_since_last_visit := 0; expected_return_days := 30; delay_days := 0; avg_ticket := 0;
    total_visits := 0; cancellation_count := 0; no_show_count := 0; is_vip := false; frequency_irregular := false; high_ticket := false;
    last_service := NULL; last_visit_date := NULL; assigned_professional := NULL;
    RETURN NEXT; RETURN;
  END IF;

  v_days_since := CURRENT_DATE - v_last_visit;
  SELECT srw.return_window_days INTO v_erw FROM public.service_return_windows srw WHERE srw.clinic_id = p_clinic_id AND srw.service_name = v_last_service;
  IF v_erw IS NULL THEN v_erw := 30; END IF;
  v_delay := v_days_since - v_erw;

  -- Estadísticas base (v_no_shows no se usa por ahora en el return_table pero se mantiene la estructura)
  SELECT COUNT(*) INTO v_total_visits FROM public.appointments WHERE patient_id = p_patient_id AND clinic_id = p_clinic_id AND status NOT IN ('cancelled');
  SELECT COUNT(*) INTO v_cancellations FROM public.appointments WHERE patient_id = p_patient_id AND clinic_id = p_clinic_id AND status = 'cancelled';
  SELECT COALESCE(AVG(price), 0) INTO v_avg_ticket FROM public.appointments WHERE patient_id = p_patient_id AND clinic_id = p_clinic_id AND price > 0;

  -- Lógica de Riesgo DINÁMICA
  IF v_delay < 0 THEN 
    v_risk := 'low';
    v_final_score := 0;
  ELSIF v_delay >= v_high_thresh THEN 
    v_risk := 'high';
    v_final_score := 85; -- Score alto para indicar peligro
  ELSIF v_delay >= v_medium_thresh THEN 
    v_risk := 'medium';
    v_final_score := 55; -- Score medio
  ELSE 
    v_risk := 'low';
    v_final_score := 10;
  END IF;

  score := v_final_score; risk_level := v_risk; days_since_last_visit := v_days_since; expected_return_days := v_erw;
  delay_days := v_delay; avg_ticket := v_avg_ticket; total_visits := v_total_visits; cancellation_count := v_cancellations;
  no_show_count := 0; is_vip := v_total_visits >= 8; frequency_irregular := false; high_ticket := false;
  last_service := v_last_service; last_visit_date := v_last_visit; assigned_professional := v_last_professional;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
