import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkOthers() {
    const c2 = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    console.log(`Checking other customers for Clinic 2: ${c2}`)

    // 1. Get recent inbound messages NOT from the 10 handoff prospects
    // First, get the handoff phones
    const { data: handoffs } = await supabase.from('crm_prospects').select('phone').eq('clinic_id', c2).eq('requires_human', true)
    const handoffPhones = handoffs?.map(h => h.phone) || []
    console.log('Handoff phones:', handoffPhones)

    // 2. Get recent inbound messages for this clinic
    const { data: recentMessages } = await supabase.from('messages')
        .select('*')
        .eq('clinic_id', c2)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .limit(20)
    
    const nonHandoffMessages = recentMessages?.filter(m => !handoffPhones.includes(m.phone_number))
    console.log('Recent messages from NON-handoff customers:', nonHandoffMessages?.map(m => ({
        phone: m.phone_number,
        content: m.content,
        ai_generated: m.ai_generated,
        created_at: m.created_at
    })))

    if (nonHandoffMessages?.length === 0) {
        console.log('All recent messages are from handoff customers!')
    }
}

checkOthers()
