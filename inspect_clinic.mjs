import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function inspect() {
    // Inspect one row of clinic_settings
    const { data: oneClinic } = await supabase.from('clinic_settings').select('*').limit(1)
    if (oneClinic?.length) {
        console.log('Clinic settings columns:', Object.keys(oneClinic[0]))
    }

    // Inspect the other clinic ID I saw
    const otherClinicId = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    console.log(`Checking other clinic ID: ${otherClinicId}`)
    const { data: otherClinic } = await supabase.from('clinic_settings').select('*').eq('id', otherClinicId)
    console.log('Other clinic details:', otherClinic)

    const { data: otherProfile } = await supabase.from('user_profiles').select('*').eq('clinic_id', otherClinicId)
    console.log('User profiles for other clinic:', otherProfile)
}

inspect()
