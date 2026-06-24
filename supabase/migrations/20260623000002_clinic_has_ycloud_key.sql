-- Evita exponer ycloud_api_key al navegador: HQ → Integraciones solo necesita saber
-- SI hay key configurada (booleano), no el valor. SECURITY DEFINER lee la columna y
-- devuelve únicamente un boolean.
CREATE OR REPLACE FUNCTION public.clinic_has_ycloud_key(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (ycloud_api_key IS NOT NULL AND ycloud_api_key <> '')
    FROM clinic_settings WHERE id = p_clinic_id
$$;

GRANT EXECUTE ON FUNCTION public.clinic_has_ycloud_key(uuid) TO authenticated;
