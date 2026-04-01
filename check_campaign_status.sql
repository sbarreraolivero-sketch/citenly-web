SELECT name, status, sent_count, total_target, error_log 
FROM campaigns 
WHERE name = 'Oferta hasta 10 de Abril Microblading'
ORDER BY created_at DESC 
LIMIT 1;
