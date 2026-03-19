import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkRecentErrors() {
    console.log('Checking for recent errors in debug_logs (last hour)...')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: logs, error } = await supabase
        .from('debug_logs')
        .select('*')
        .gte('created_at', oneHourAgo)
        .or('message.ilike.%Error%,message.ilike.%Fail%')
        .order('created_at', { ascending: false })
        .limit(20)
    
    if (error) {
        console.error('Error:', error.message)
    } else {
        console.log('Recent errors:', logs.map(l => ({
            created_at: l.created_at,
            message: l.message,
            payload: l.payload
        })))
    }
}

checkRecentErrors()
