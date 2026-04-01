SELECT id, clinic_id, campaign_id, status, error_message, created_at 
FROM campaign_deliveries 
WHERE campaign_id IN (
    SELECT id FROM campaigns WHERE name = 'Oferta hasta 10 de Abril Microblading'
)
ORDER BY created_at DESC;
