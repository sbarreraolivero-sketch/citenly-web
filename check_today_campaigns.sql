SELECT id, name, status, created_at, clinic_id 
FROM campaigns 
WHERE created_at >= '2026-04-01' 
ORDER BY created_at DESC;
