SELECT id, created_at, message, payload
FROM debug_logs
ORDER BY created_at DESC
LIMIT 20;
