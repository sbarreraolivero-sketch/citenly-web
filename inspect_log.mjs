import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function inspectLog() {
    const logId = '5c557010-dc01-4876-afb3-492f7b33a5a0'
    console.log(`Inspecting log ID: ${logId}`)

    const { data: log, error } = await supabase
        .from('debug_logs')
        .select('*')
        .eq('id', logId)
        .single()
    
    if (error) {
        console.error('Error:', error.message)
    } else {
        console.log('Full log payload:', JSON.stringify(log.payload, null, 2))
    }
}

inspectLog()
