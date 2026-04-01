UPDATE campaigns 
SET status = 'failed', 
    error_log = 'Campaña cancelada manualmente por bloqueo en versión antigua del sistema.' 
WHERE status = 'sending' 
AND name = 'prueba 333';
