-- Columna de permisos individuales por miembro
-- NULL = usar defaults del rol (comportamiento sin cambios)
ALTER TABLE clinic_members
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;

-- RPC para que admin/owner actualice permisos de un miembro
-- No permite tocar owners ni admins; usa SECURITY DEFINER para bypassear RLS
CREATE OR REPLACE FUNCTION update_member_permissions(
  p_member_id UUID,
  p_permissions JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_clinic_id UUID;
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Obtener clínica y rol del usuario que llama
  SELECT clinic_id, role INTO v_caller_clinic_id, v_caller_role
  FROM clinic_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY
    CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_caller_clinic_id IS NULL THEN
    RAISE EXCEPTION 'No eres miembro activo de ninguna clínica';
  END IF;

  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Solo owners y admins pueden modificar permisos';
  END IF;

  -- Verificar que el target pertenece a la misma clínica
  SELECT role INTO v_target_role
  FROM clinic_members
  WHERE id = p_member_id
    AND clinic_id = v_caller_clinic_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Miembro no encontrado en tu clínica';
  END IF;

  IF v_target_role IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'No se pueden modificar permisos de owners ni admins';
  END IF;

  UPDATE clinic_members
  SET permissions = p_permissions
  WHERE id = p_member_id
    AND clinic_id = v_caller_clinic_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_member_permissions(UUID, JSONB) TO authenticated;
