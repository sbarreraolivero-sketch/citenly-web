import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkSpecific() {
    const c2 = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    const phone = '56981621054'
    console.log(`Checking status for ${phone} in Clinic 2`)

    const { data: prospect } = await supabase.from('crm_prospects')
        .select('*')
        .eq('clinic_id', c2)
        .eq('phone', phone)
        .maybeSingle()
    
    console.log('Prospect status:', prospect ? {
        id: prospect.id,
        name: prospect.name,
        requires_human: prospect.requires_human,
        phone: prospect.phone
    } : 'Not found')
}

checkSpecific()
