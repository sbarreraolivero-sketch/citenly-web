-- demo_requests tenía RLS activa SIN políticas → el panel HQ (lee con el JWT del admin)
-- recibía 0 filas, aunque el webhook (service role) sí guardaba los leads de Sofía.
-- Se habilita lectura/edición SOLO a platform admins (CRM + Calendario del HQ).
CREATE POLICY "Platform admins read demo_requests" ON demo_requests
    FOR SELECT USING (auth.uid() IN (SELECT id FROM platform_admins));

CREATE POLICY "Platform admins update demo_requests" ON demo_requests
    FOR UPDATE USING (auth.uid() IN (SELECT id FROM platform_admins));
