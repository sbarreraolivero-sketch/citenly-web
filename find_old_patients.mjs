import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function findOldPatients() {
    const clinicId = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6'
    const { data: oldPatients } = await supabase.from('patient_retention_scores').select('*').eq('clinic_id', clinicId).gt('days_since_last_visit', 30)
    
    console.log(`Patients with more than 30 days since last visit: ${oldPatients?.length || 0}`)
    if (oldPatients) {
        oldPatients.forEach(p => {
            console.log(`Patient: ${p.patient_id} | Days Since: ${p.days_since_last_visit} | Score: ${p.score} | Risk: ${p.risk_level}`)
        })
    }
}

findOldPatients()
