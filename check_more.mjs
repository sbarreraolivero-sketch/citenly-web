import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkMore() {
    const clinicId = 'a8397a6e-da08-466d-9781-a59e5bed2824'
    console.log(`Checking deep for Clinic ID: ${clinicId}`)

    // Check for handoffs
    const { data: handoffs } = await supabase.from('handoffs').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(5)
    console.log('Recent Handoffs:', handoffs)

    // Check for any AI agents with Elizabeth in the name (maybe global?)
    const { data: globalAiAgents } = await supabase.from('ai_agents').select('*').ilike('name', '%Elizabeth%')
    console.log('Global AI Agents with name Elizabeth:', globalAiAgents)

    // Check for active conversations for this clinic
    const { data: conversations } = await supabase.from('conversations').select('*').eq('clinic_id', clinicId).order('updated_at', { ascending: false }).limit(5)
    console.log('Recent Conversations:', conversations)

    // Check if there is a 'is_ai_active' or similar flag in conversations
    if (conversations?.length) {
        console.log('First conversation state:', {
            id: conversations[0].id,
            status: conversations[0].status,
            ai_enabled: conversations[0].ai_enabled,
            metadata: conversations[0].metadata
        })
    }
}

checkMore()
