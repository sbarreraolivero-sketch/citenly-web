-- Check jobs
SELECT * FROM cron.job;

-- Check latest run details
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
