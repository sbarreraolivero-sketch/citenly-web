import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key))?.split('=')[1]

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function findClinics() {
    console.log('Searching for clinics with name Elizabeth...')
    const { data: clinics, error: err1 } = await supabase.from('clinic_settings').select('*').ilike('name', '%Elizabeth%')
    if (err1) console.error('Error searching by name:', err1)
    else console.log('Found clinics by name:', clinics?.map(c => ({ id: c.id, name: c.name, email: c.email })))

    // Also search by her email in clinic_settings if it exists
    const { data: clinicsByEmail, error: err2 } = await supabase.from('clinic_settings').select('*').ilike('email', '%elizabeth%')
    if (err2) console.error('Error searching by email:', err2)
    else console.log('Clinics by email:', clinicsByEmail?.map(c => ({ id: c.id, name: c.name, email: c.email })))
}


findClinics()
