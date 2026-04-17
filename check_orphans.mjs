import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkOrphans() {
    const clinicId = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    
    // Total patients
    const { data: allPatients } = await supabase.from('patients').select('id').eq('clinic_id', clinicId)
    // Patients with appointments
    const { data: apptPatients } = await supabase.from('appointments').select('patient_id').eq('clinic_id', clinicId).not('patient_id', 'is', null)
    const uniqueApptPatients = [...new Set(apptPatients.map(a => a.patient_id))]
    
    const orphans = allPatients.filter(p => !uniqueApptPatients.includes(p.id))
    
    console.log(`Total Patients: ${allPatients.length}`)
    console.log(`Patients with Appointments: ${uniqueApptPatients.length}`)
    console.log(`Patients WITHOUT Appointments (Orphans): ${orphans.length}`)
}

checkOrphans()
