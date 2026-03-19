import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function search() {
    const email = 'elizabeth.zibaaa@gmail.com'
    console.log(`Searching for ${email}...`)
    
    const { data: profiles } = await supabase.from('user_profiles').select('*').eq('email', email)
    console.log('User profiles:', profiles)

    const { data: agents } = await supabase.from('agents').select('*').ilike('name', '%Elizabeth%')
    console.log('Agents by name:', agents)

    const { data: aiAgents } = await supabase.from('ai_agents').select('*').ilike('name', '%Elizabeth%')
    console.log('AI Agents by name:', aiAgents)

    if (profiles?.length) {
        const clinicId = profiles[0].clinic_id
        console.log(`Clinic ID for Elizabeth: ${clinicId}`)
        
        const { data: clinic } = await supabase.from('clinic_settings').select('*').eq('id', clinicId)
        console.log('Clinic settings:', clinic)

        const { data: agentsByClinic } = await supabase.from('agents').select('*').eq('clinic_id', clinicId)
        console.log('Agents for this clinic:', agentsByClinic)

        const { data: aiAgentsByClinic } = await supabase.from('ai_agents').select('*').eq('clinic_id', clinicId)
        console.log('AI Agents for this clinic:', aiAgentsByClinic)

        const { count: totalAgents } = await supabase.from('agents').select('*', { count: 'exact', head: true })
        console.log('Total agents in system:', totalAgents)

        const { count: totalAiAgents } = await supabase.from('ai_agents').select('*', { count: 'exact', head: true })
        console.log('Total AI agents in system:', totalAiAgents)

        const { data: recentMessages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })
            .limit(5)
        
        if (msgError) console.error('Error fetching messages:', msgError)
        console.log('Recent messages for clinic:', recentMessages)
    }
}

search()


