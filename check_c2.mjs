import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkC2() {
    const c2 = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    console.log(`Deep checking Clinic 2: ${c2}`)

    // Check conversations
    const { data: conversations } = await supabase.from('conversations').select('*').eq('clinic_id', c2).order('updated_at', { ascending: false }).limit(5)
    console.log('Recent Conversations C2:', conversations)

    // Check for any handoff records for this clinic
    const { data: handoffs } = await supabase.from('handoffs').select('*').eq('clinic_id', c2).order('created_at', { ascending: false }).limit(5)
    console.log('Recent Handoffs C2:', handoffs)

    // Check for any logs or errors in a 'logs' table if it exists
    // I'll search for tables with 'log' in the name
    const { data: logTables } = await supabase.from('information_schema.tables').select('table_name').ilike('table_name', '%log%').eq('table_schema', 'public')
    console.log('Log-related tables:', logTables)

    // If there is an 'error_logs' or similar, check it
    const { data: errLogs } = await supabase.from('error_logs').select('*').eq('clinic_id', c2).order('created_at', { ascending: false }).limit(5)
    console.log('Recent Error Logs C2:', errLogs)
}

checkC2()
