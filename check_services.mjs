import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkServices() {
    const clinicId = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    const { data: clinic } = await supabase.from('clinic_settings').select('services').eq('id', clinicId).single()
    console.log('--- CLINIC SERVICES ---')
    console.log(JSON.stringify(clinic.services, null, 2))
    
    const { data: appointments } = await supabase.from('appointments').select('service').eq('clinic_id', clinicId)
    const distinctServices = [...new Set(appointments.map(a => a.service))]
    console.log('\n--- DISTINCT SERVICES IN APPOINTMENTS ---')
    console.log(distinctServices)
}

checkServices()
