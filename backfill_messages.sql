-- Backfill messages from deliveries for the stuck campaign
INSERT INTO messages (clinic_id, phone_number, direction, content, campaign_id, ycloud_status, ai_generated)
SELECT 
    clinic_id, 
    contact_phone, 
    'outbound', 
    'Campaña: Oferta Microblading (Mensaje de WhatsApp)', 
    campaign_id, 
    'sent', 
    true
FROM campaign_deliveries 
WHERE campaign_id = 'bfb4d5c7-5c1e-4f69-9459-f41e6667b42e'
AND status = 'sent'
AND NOT EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.campaign_id = 'bfb4d5c7-5c1e-4f69-9459-f41e6667b42e' 
    AND m.phone_number = contact_phone
);
