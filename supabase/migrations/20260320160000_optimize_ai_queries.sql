-- Optimización de consultas de IA para el Dashboard
CREATE INDEX IF NOT EXISTS idx_messages_dashboard_performance 
ON public.messages (clinic_id, created_at, ai_generated, direction);

CREATE INDEX IF NOT EXISTS idx_messages_model_split 
ON public.messages (ai_model) 
WHERE ai_generated = true;

-- Asegurar que las columnas de créditos tengan índices para búsquedas rápidas en HQ
CREATE INDEX IF NOT EXISTS idx_clinic_settings_ai_active 
ON public.clinic_settings (ai_active_model);
