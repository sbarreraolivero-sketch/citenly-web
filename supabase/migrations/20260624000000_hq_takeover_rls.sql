-- Human takeover de Sofía desde HQ → Mensajes:
-- 1) que el admin HQ pueda GUARDAR sus respuestas manuales (contexto que luego lee Sofía).
-- 2) que pueda CREAR el prospecto si aún no existe (toggle de pausa robusto).
-- El UPDATE de crm_prospects ya está cubierto por "Authenticated users can update crm_prospects".
CREATE POLICY "Platform admins insert messages HQ" ON messages
    FOR INSERT WITH CHECK (clinic_id = '00000000-0000-0000-0000-000000000000'::uuid AND auth.uid() IN (SELECT id FROM platform_admins));

CREATE POLICY "Platform admins insert crm_prospects HQ" ON crm_prospects
    FOR INSERT WITH CHECK (clinic_id = '00000000-0000-0000-0000-000000000000'::uuid AND auth.uid() IN (SELECT id FROM platform_admins));
