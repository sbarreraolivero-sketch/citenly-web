import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkMute() {
    const c2 = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    console.log(`Checking mute status for Clinic 2: ${c2}`)

    // 1. Check clinic-wide auto-respond setting
    const { data: clinic } = await supabase.from('clinic_settings').select('ai_auto_respond, clinic_name').eq('id', c2).single()
    console.log(`Clinic ${clinic?.clinic_name} ai_auto_respond:`, clinic?.ai_auto_respond)

    // 2. Check how many prospects have requires_human = true
    const { count: handoffCount } = await supabase.from('crm_prospects')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', c2)
        .eq('requires_human', true)
    
    console.log(`Prospects requiring human for this clinic: ${handoffCount}`)

    // 3. List some of those prospects
    if (handoffCount > 0) {
        const { data: prospects } = await supabase.from('crm_prospects')
            .select('name, phone, requires_human, updated_at')
            .eq('clinic_id', c2)
            .eq('requires_human', true)
            .order('updated_at', { ascending: false })
            .limit(5)
        console.log('Sample handoff prospects:', prospects)
    }
}

checkMute()
