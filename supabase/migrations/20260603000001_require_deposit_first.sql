-- Switch configurable de abono previo por clínica
-- Cuando require_deposit_first = true, el webhook crea las citas con status 'pending_deposit'
-- y el cliente debe enviar el comprobante para que la IA confirme con confirm_appointment.

-- 1. Columna en clinic_settings
ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS require_deposit_first BOOLEAN DEFAULT false;

-- 2. Ampliar el CHECK constraint de appointments.status para incluir 'pending_deposit'
--    Primero eliminamos el constraint existente (si existe) y lo recreamos.
DO $$
BEGIN
  -- Intentar eliminar el constraint anterior (puede llamarse de distinta forma)
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_status;
EXCEPTION WHEN others THEN
  NULL; -- ignorar si no existe
END$$;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'pending_deposit', 'confirmed', 'cancelled', 'completed'));

-- 3. Índice para que el cron de expiración sea eficiente
CREATE INDEX IF NOT EXISTS idx_appointments_pending_deposit
  ON appointments (clinic_id, appointment_date)
  WHERE status = 'pending_deposit';
