import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkToday() {
    const today = new Date().toISOString().split('T')[0]
    console.log(`Checking debug_logs for today: ${today}`)

    const { data: logs, error } = await supabase
        .from('debug_logs')
        .select('*')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(50)
    
    if (error) {
        console.error('Error:', error.message)
    } else {
        console.log('Today\'s logs:', logs.map(l => ({
            id: l.id,
            event: l.event,
            clinic_id: l.payload?.clinic_id,
            created_at: l.created_at,
            message: l.message || l.payload?.message || l.payload?.error
        })))
        
        const clinicsToday = [...new Set(logs.map(l => l.payload?.clinic_id))].filter(Boolean)
        console.log('Clinics with activity today:', clinicsToday)
        
        const elizabethClinicId = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
        const hasElizabeth = clinicsToday.includes(elizabethClinicId)
        console.log(`Is Elizabeth's clinic (${elizabethClinicId}) in today's logs? ${hasElizabeth}`)
    }
}

checkToday()
