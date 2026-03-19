import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkBoth() {
    const c1 = 'a8397a6e-da08-466d-9781-a59e5bed2824'
    const c2 = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'

    console.log(`Checking Clinic 1: ${c1}`)
    const { data: a1 } = await supabase.from('ai_agents').select('*').eq('clinic_id', c1)
    console.log('AI Agents C1:', a1)

    console.log(`Checking Clinic 2: ${c2}`)
    const { data: a2 } = await supabase.from('ai_agents').select('*').eq('clinic_id', c2)
    console.log('AI Agents C2:', a2)

    // Check recent messages for C2 specifically
    const { data: msgs2 } = await supabase.from('messages').select('*').eq('clinic_id', c2).order('created_at', { ascending: false }).limit(3)
    console.log('Recent Messages C2:', msgs2)

    // Check if C2 is "active"
    const { data: settings2 } = await supabase.from('clinic_settings').select('*').eq('id', c2)
    console.log('Settings C2:', settings2)
}

checkBoth()
