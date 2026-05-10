import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function activate() {
    console.log('Programando tarea cron...')
    
    // Obtenemos el ID del proyecto desde la URL
    const projectRef = process.env.VITE_SUPABASE_URL.split('//')[1].split('.')[0]
    
    const sql = `
        create extension if not exists pg_cron;
        select cron.schedule(
          'monthly-ai-credit-recharge',
          '1 0 * * *',
          'select net.http_post(
            url := ''https://${projectRef}.functions.supabase.co/cron-monthly-credit-recharge'',
            headers := jsonb_build_object(
              ''Content-Type'', ''application/json'',
              ''Authorization'', ''Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}''
            ),
            body := ''{}''
          )'
        );
    `
    
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql })
    
    if (error) {
        // Si no hay RPC de execute_sql, intentamos otra forma o informamos
        console.error('Error programando cron (RPC execute_sql no disponible):', error)
        console.log('Por favor, ejecuta el contenido de supabase/migrations/20260510000000_schedule_monthly_recharge.sql manualmente en el SQL Editor de Supabase.')
    } else {
        console.log('¡Tarea cron programada exitosamente!')
    }
}
activate()
