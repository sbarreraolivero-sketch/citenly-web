SELECT id, status, error_log, sent_count, total_target 
FROM campaigns 
WHERE name = 'campaña prueba' 
ORDER BY created_at DESC 
LIMIT 1;
