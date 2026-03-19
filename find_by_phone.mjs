import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function findByPhone() {
    const phone = '56985493171'
    console.log(`Searching for phone: ${phone}`)

    const { data: messages } = await supabase.from('messages').select('*').eq('phone_number', phone).order('created_at', { ascending: false }).limit(5)
    console.log('Messages for phone:', messages.map(m => ({ id: m.id, clinic_id: m.clinic_id, content: m.content, created_at: m.created_at })))

    const { data: handoffs } = await supabase.from('handoffs').select('*').eq('phone_number', phone).order('created_at', { ascending: false }).limit(5)
    console.log('Handoffs for phone:', handoffs)
    
    if (messages?.length) {
        const clinicId = messages[0].clinic_id
        console.log(`Linked Clinic ID: ${clinicId}`)
        // Check if this matches Elizabeth's clinic IDs
        const e1 = 'a8397a6e-da08-466d-9781-a59e5bed2824'
        const e2 = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
        console.log(`Matches Elizabeth's Clinic 1? ${clinicId === e1}`)
        console.log(`Matches Elizabeth's Clinic 2? ${clinicId === e2}`)
    }
}

findByPhone()
