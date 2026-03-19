import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkDebug() {
    const c2 = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    console.log(`Checking debug_logs for Clinic 2: ${c2}`)

    const { data: logs, error } = await supabase
        .from('debug_logs')
        .select('*')
        .contains('payload', { clinic_id: c2 }) // Assuming payload contains clinic_id
        .order('created_at', { ascending: false })
        .limit(10)
    
    if (error) {
        console.error('Error with contains:', error.message)
        // Try searching for any logs in the last 24h
        const { data: allLogs } = await supabase.from('debug_logs').select('*').order('created_at', { ascending: false }).limit(20)
        console.log('Recent 20 debug logs (all clinics):', allLogs.map(l => ({
            id: l.id,
            event: l.event,
            clinic_id: l.payload?.clinic_id,
            created_at: l.created_at,
            error: l.payload?.error || l.payload?.message
        })))
    } else {
        console.log('Found logs for C2:', logs)
    }
}

checkDebug()
