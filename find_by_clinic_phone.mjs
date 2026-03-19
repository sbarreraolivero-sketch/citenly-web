import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function findByClinicPhone() {
    const phone = '56983275699'
    console.log(`Searching for clinic with phone: ${phone}`)

    const { data: clinic } = await supabase.from('clinic_settings')
        .select('*')
        .or(`ycloud_phone_number.eq.${phone},ycloud_phone_number.eq.+${phone}`)
        .maybeSingle()
    
    if (clinic) {
        console.log('Found clinic:', {
            id: clinic.id,
            name: clinic.clinic_name, // Wait, I saw name/clinic_name confusion before. I'll check both.
            ai_auto_respond: clinic.ai_auto_respond,
            ycloud_phone: clinic.ycloud_phone_number
        })
    } else {
        console.log('No clinic found with this phone number.')
    }
}

findByClinicPhone()
