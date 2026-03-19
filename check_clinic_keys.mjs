import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkClinicKeys() {
    const c2 = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    console.log(`Checking keys for Clinic 2: ${c2}`)

    const { data: clinic } = await supabase.from('clinic_settings').select('*').eq('id', c2).single()
    console.log('Clinic keys:', {
        openai_api_key: clinic?.openai_api_key ? 'PRESENT' : 'MISSING',
        ycloud_api_key: clinic?.ycloud_api_key ? 'PRESENT' : 'MISSING',
        openai_model: clinic?.openai_model
    })
}

checkClinicKeys()
