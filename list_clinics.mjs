import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envConfig.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function listClinics() {
    const { data: clinics } = await supabase.from('clinic_settings').select('id, clinic_name')
    console.log('--- ALL CLINICS ---')
    clinics.forEach(c => console.log(`${c.clinic_name} | ID: ${c.id}`))
}

listClinics()
