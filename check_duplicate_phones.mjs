import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkDuplicatePhones() {
    const phone = '56983275699'
    console.log(`Checking clinics with phone: ${phone}`)

    const { data: clinics } = await supabase.from('clinic_settings')
        .select('id, clinic_name, ai_auto_respond, ycloud_phone_number')
        .or(`ycloud_phone_number.eq.${phone},ycloud_phone_number.eq.+${phone}`)
    
    console.log('Matching clinics:', clinics)
}

checkDuplicatePhones()
